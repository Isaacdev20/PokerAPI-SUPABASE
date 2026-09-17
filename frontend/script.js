/**
 * ============================================================================
 * TEXAS HOLD'EM POKER - MOTOR DE JOGO (script.js)
 * ============================================================================
 * Este arquivo contém toda a lógica necessária para o funcionamento do Poker:
 * 1. Síntese de Efeitos Sonoros com Web Audio API (sem dependências externas)
 * 2. Baralho de 52 cartas, embaralhamento e distribuição
 * 3. Avaliador profissional de combinações de 5 a 7 cartas (Royal Flush a High Card)
 * 4. Inteligência Artificial (IA) para os 3 oponentes virtuais
 * 5. Ciclo de rodadas: Pré-Flop -> Flop -> Turn -> River -> Showdown
 * 6. Gestão do Pote, Blinds (SB/BB), Apostas (Fold, Check, Call, Raise, All-in)
 * 7. Atualização dinâmica do DOM e Interface de Usuário
 * ============================================================================
 */

// Garante que o script seja executado após o carregamento completo do documento
// Este arquivo é carregado somente por jogo.html. O login tem seu próprio script inline.
// Fluxo principal: PokerGame -> bindEvents -> startNewHand -> processTurn ->
// advanceToNextPlayer -> nextRoundStage -> handleShowdown (ou awardPotToWinner).
document.addEventListener('DOMContentLoaded', () => {
  // Verifica se o usuário está logado
  const token = localStorage.getItem('access_token');
  if (!token) {
    window.location.href = "index.html";
    return;
  }
  const loggedUser = localStorage.getItem('username') || 'Jogador';

  /* ==========================================================================
     MÓDULO 1: SINTETIZADOR DE ÁUDIO (Web Audio API)
     Gera efeitos sonoros realistas por ondas matemáticas, funcionando 100% offline
     sem necessidade de baixar arquivos .mp3 externos.
     ========================================================================== */
  const SoundSystem = {
    enabled: true,
    ctx: null,

    // Inicializa o contexto de áudio após interação do usuário (requisito dos navegadores)
    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    // Som de cartas sendo distribuídas/deslizadas no feltro
    playCardSlide() {
      if (!this.enabled) return;
      this.init();
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // Ruído branco
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    },

    // Som de fichas de poker se chocando (clique metálico/plástico)
    playChip() {
      if (!this.enabled) return;
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.06);
    },

    // Som de "Check" (Duas batidinhas na madeira da mesa)
    playKnock() {
      if (!this.enabled) return;
      this.init();
      [0, 0.09].forEach((delay) => {
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.05);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      });
    },

    // Som de vitória (Fanfarra com notas ascendentes)
    playWin() {
      if (!this.enabled) return;
      this.init();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // Dó, Mi, Sol, Dó agudo
      notes.forEach((freq, idx) => {
        const t = this.ctx.currentTime + (idx * 0.12);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    },

    // Som de desistência (Fold)
    playFold() {
      if (!this.enabled) return;
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  };


  /* ==========================================================================
     MÓDULO 2: MODELAGEM DAS CARTAS E BARALHO
     ========================================================================== */
  // Constantes de Naipes e Valores
  const SUITS = [
    { name: 'spades', symbol: '♠', isRed: false },
    { name: 'hearts', symbol: '♥', isRed: true },
    { name: 'diamonds', symbol: '♦', isRed: true },
    { name: 'clubs', symbol: '♣', isRed: false }
  ];

  // Ranks de 2 a 14 (11=J, 12=Q, 13=K, 14=A)
  const RANKS = [
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5' },
    { value: 6, label: '6' },
    { value: 7, label: '7' },
    { value: 8, label: '8' },
    { value: 9, label: '9' },
    { value: 10, label: '10' },
    { value: 11, label: 'J' },
    { value: 12, label: 'Q' },
    { value: 13, label: 'K' },
    { value: 14, label: 'A' }
  ];

  // Representa uma Carta individual
  class Card {
    constructor(rank, suit) {
      this.value = rank.value;
      this.label = rank.label;
      this.suit = suit.name;
      this.symbol = suit.symbol;
      this.isRed = suit.isRed;
    }

    // Retorna a string legível da carta (Ex: "A♠", "10♥")
    toString() {
      return `${this.label}${this.symbol}`;
    }

    // Gera o elemento HTML estilizado para a carta
    renderHTML(isFacedown = false) {
      const cardEl = document.createElement('div');
      cardEl.className = `card suit-${this.suit}`;
      if (isFacedown) {
        cardEl.classList.add('card-back');
        return cardEl;
      }

      cardEl.innerHTML = `
        <div class="card-corner">
          <span class="card-val">${this.label}</span>
          <span class="card-icon">${this.symbol}</span>
        </div>
        <div class="card-center-suit">${this.symbol}</div>
        <div class="card-corner-bottom">
          <span class="card-val">${this.label}</span>
          <span class="card-icon">${this.symbol}</span>
        </div>
      `;
      return cardEl;
    }
  }

  // Representa o Baralho de 52 cartas
  class Deck {
    constructor() {
      this.cards = [];
      this.reset();
    }

    // Recria as 52 cartas padrão
    reset() {
      this.cards = [];
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.cards.push(new Card(rank, suit));
        }
      }
    }

    // Algoritmo Fisher-Yates para embaralhamento uniforme e perfeito
    shuffle() {
      for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
      }
    }

    // Puxa uma carta do topo
    draw() {
      return this.cards.pop();
    }
  }


  /* ==========================================================================
     MÓDULO 3: AVALIADOR PROFISSIONAL DE MÃOS DE POKER
     Avalia qualquer conjunto de 5 a 7 cartas e identifica a melhor mão de 5 cartas
     com desempate matemático exato por Kickers.
     ========================================================================== */
  const HandEvaluator = {
    // Hierarquia oficial de categorias
    HAND_TYPES: {
      ROYAL_FLUSH: { rank: 10, name: 'Royal Flush' },
      STRAIGHT_FLUSH: { rank: 9, name: 'Straight Flush' },
      FOUR_OF_A_KIND: { rank: 8, name: 'Quadra (Four of a Kind)' },
      FULL_HOUSE: { rank: 7, name: 'Full House' },
      FLUSH: { rank: 6, name: 'Flush (Cor)' },
      STRAIGHT: { rank: 5, name: 'Sequência (Straight)' },
      THREE_OF_A_KIND: { rank: 4, name: 'Trinca (Three of a Kind)' },
      TWO_PAIR: { rank: 3, name: 'Dois Pares (Two Pair)' },
      ONE_PAIR: { rank: 2, name: 'Um Par (One Pair)' },
      HIGH_CARD: { rank: 1, name: 'Carta Mais Alta (High Card)' }
    },

    // Gera todas as combinações de N elementos tomados k a k (Ex: 7 escolhe 5 = 21 combinações)
    combinations(arr, k) {
      if (k === 0) return [[]];
      if (arr.length === 0) return [];
      const head = arr[0];
      const tail = arr.slice(1);
      const withHead = this.combinations(tail, k - 1).map(c => [head, ...c]);
      const withoutHead = this.combinations(tail, k);
      return [...withHead, ...withoutHead];
    },

    // Avalia exatamente 5 cartas e retorna seu score numérico e classificação
    evaluate5Cards(fiveCards) {
      // Ordena decrescente por valor (As=14 até 2)
      const sorted = [...fiveCards].sort((a, b) => b.value - a.value);
      const values = sorted.map(c => c.value);
      const suits = sorted.map(c => c.suit);

      const isFlush = suits.every(s => s === suits[0]);

      // Verifica Sequência normal (Ex: 9, 8, 7, 6, 5)
      let isStraight = false;
      let straightHigh = 0;

      const isNormalStraight = values.every((v, i) => i === 0 || values[i - 1] - v === 1);
      if (isNormalStraight) {
        isStraight = true;
        straightHigh = values[0];
      } else {
        // Verifica sequência baixa com Ás na ponta menor: A-5-4-3-2 (Wheel)
        const isAceLowStraight = (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2);
        if (isAceLowStraight) {
          isStraight = true;
          straightHigh = 5; // No A-2-3-4-5, a carta mais alta da sequência é o 5
        }
      }

      // Contagem de repetições dos valores (para Pares, Trincas, Quadras, Full House)
      const counts = {};
      values.forEach(v => counts[v] = (counts[v] || 0) + 1);
      const countPairs = Object.entries(counts).map(([v, count]) => ({ value: Number(v), count }));
      // Ordena por quantidade de repetições (ex: quadra primeiro) e depois por valor
      countPairs.sort((a, b) => b.count - a.count || b.value - a.value);

      // 1. Royal Flush ou Straight Flush
      if (isFlush && isStraight) {
        if (straightHigh === 14) {
          return { type: this.HAND_TYPES.ROYAL_FLUSH, score: [10, 14], cards: sorted };
        }
        return { type: this.HAND_TYPES.STRAIGHT_FLUSH, score: [9, straightHigh], cards: sorted };
      }

      // 2. Quadra (Four of a Kind)
      if (countPairs[0].count === 4) {
        return {
          type: this.HAND_TYPES.FOUR_OF_A_KIND,
          score: [8, countPairs[0].value, countPairs[1].value],
          cards: sorted
        };
      }

      // 3. Full House (Trinca + Par)
      if (countPairs[0].count === 3 && countPairs[1].count === 2) {
        return {
          type: this.HAND_TYPES.FULL_HOUSE,
          score: [7, countPairs[0].value, countPairs[1].value],
          cards: sorted
        };
      }

      // 4. Flush (Cor)
      if (isFlush) {
        return { type: this.HAND_TYPES.FLUSH, score: [6, ...values], cards: sorted };
      }

      // 5. Sequência (Straight)
      if (isStraight) {
        return { type: this.HAND_TYPES.STRAIGHT, score: [5, straightHigh], cards: sorted };
      }

      // 6. Trinca (Three of a Kind)
      if (countPairs[0].count === 3) {
        const kickers = countPairs.slice(1).map(p => p.value);
        return {
          type: this.HAND_TYPES.THREE_OF_A_KIND,
          score: [4, countPairs[0].value, ...kickers],
          cards: sorted
        };
      }

      // 7. Dois Pares (Two Pair)
      if (countPairs[0].count === 2 && countPairs[1].count === 2) {
        return {
          type: this.HAND_TYPES.TWO_PAIR,
          score: [3, countPairs[0].value, countPairs[1].value, countPairs[2].value],
          cards: sorted
        };
      }

      // 8. Um Par (One Pair)
      if (countPairs[0].count === 2) {
        const kickers = countPairs.slice(1).map(p => p.value);
        return {
          type: this.HAND_TYPES.ONE_PAIR,
          score: [2, countPairs[0].value, ...kickers],
          cards: sorted
        };
      }

      // 9. Carta Mais Alta (High Card)
      return { type: this.HAND_TYPES.HIGH_CARD, score: [1, ...values], cards: sorted };
    },

    // Avalia as melhores 5 cartas dentre todas as disponíveis (até 7 cartas)
    getBestHand(allCards) {
      if (!allCards || allCards.length < 5) {
        // Se tiver menos de 5 cartas (ex: Pré-Flop), avalia par simples ou carta alta
        if (allCards.length === 2) {
          if (allCards[0].value === allCards[1].value) {
            return {
              type: this.HAND_TYPES.ONE_PAIR,
              name: `Par de ${allCards[0].label}s`,
              score: [2, allCards[0].value],
              cards: allCards
            };
          }
          const high = Math.max(allCards[0].value, allCards[1].value);
          const highCard = allCards.find(c => c.value === high);
          return {
            type: this.HAND_TYPES.HIGH_CARD,
            name: `Carta Alta: ${highCard.label}`,
            score: [1, high],
            cards: allCards
          };
        }
        return { type: this.HAND_TYPES.HIGH_CARD, name: 'Aguardando cartas...', score: [0], cards: [] };
      }

      // Encontra todas as combinações de 5 cartas possíveis
      const allCombos = this.combinations(allCards, 5);
      let best = null;

      for (const combo of allCombos) {
        const evaluated = this.evaluate5Cards(combo);
        if (!best || this.compareScores(evaluated.score, best.score) > 0) {
          best = evaluated;
        }
      }

      return {
        type: best.type,
        name: best.type.name,
        score: best.score,
        cards: best.cards
      };
    },

    // Compara dois vetores de score posicionalmente
    compareScores(scoreA, scoreB) {
      for (let i = 0; i < Math.max(scoreA.length, scoreB.length); i++) {
        const valA = scoreA[i] || 0;
        const valB = scoreB[i] || 0;
        if (valA > valB) return 1;
        if (valA < valB) return -1;
      }
      return 0; // Empate exato
    }
  };


  /* ==========================================================================
     MÓDULO 4: GESTÃO DO JOGO DE POKER (ESTADO E REGRAS)
     ========================================================================== */
  class PokerGame {
    constructor() {
      // Estado fica neste objeto; updateUI transforma esse estado em elementos visuais.
      // chips = saldo disponível; currentBet = aposta desta etapa;
      // totalHandBet = soma investida na mão; folded = desistiu; allIn = sem fichas para apostar.
      // Alterar o número/ordem dos jogadores exige ajustar também os assentos de jogo.html.
      // Lista de 4 participantes: Jogador Humano (índice 0) e 3 Bots de IA
      this.players = [
        { id: 0, name: loggedUser, isBot: false, chips: 1000, cards: [], currentBet: 0, totalHandBet: 0, folded: false, allIn: false },
        { id: 1, name: 'Sofia', isBot: true, chips: 1000, cards: [], currentBet: 0, totalHandBet: 0, folded: false, allIn: false, style: 'equilibrada' },
        { id: 2, name: 'Lucas', isBot: true, chips: 1000, cards: [], currentBet: 0, totalHandBet: 0, folded: false, allIn: false, style: 'agressivo' },
        { id: 3, name: 'Elena', isBot: true, chips: 1000, cards: [], currentBet: 0, totalHandBet: 0, folded: false, allIn: false, style: 'cautelosa' }
      ];

      this.deck = new Deck();
      this.communityCards = [];
      this.pot = 0;
      this.currentBet = 0;        // Maior aposta a ser coberta na rodada atual
      this.minRaise = 20;         // Aumento mínimo
      this.smallBlind = 10;
      this.bigBlind = 20;

      this.dealerIndex = 0;       // Posição do botão de Dealer
      this.activeTurnIndex = -1;  // De quem é a vez de jogar agora
      this.gameStage = 'IDLE';    // 'IDLE', 'PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'
      this.lastToActIndex = -1;   // Quem encerra a rodada de apostas

      // Elementos do DOM cacheados
      this.dom = {
        currentRoundName: document.getElementById('current-round-name'),
        potAmount: document.getElementById('pot-amount'),
        communityCards: document.getElementById('community-cards'),
        tableStatusMsg: document.getElementById('table-status-msg'),
        playerHandRank: document.getElementById('player-hand-rank'),

        // Botões de ação
        btnFold: document.getElementById('btn-fold'),
        btnCheckCall: document.getElementById('btn-check-call'),
        labelCheckCall: document.getElementById('label-check-call'),
        subtextCheckCall: document.getElementById('subtext-check-call'),
        btnRaise: document.getElementById('btn-raise'),
        labelRaise: document.getElementById('label-raise'),
        subtextRaise: document.getElementById('subtext-raise'),
        btnNextHand: document.getElementById('btn-next-hand'),

        // Sliders e inputs de aposta
        betSlider: document.getElementById('bet-slider'),
        betInput: document.getElementById('bet-input'),
        presetMin: document.getElementById('preset-min'),
        presetHalfPot: document.getElementById('preset-half-pot'),
        presetPot: document.getElementById('preset-pot'),
        presetAllin: document.getElementById('preset-allin'),

        // Top bar buttons
        btnRules: document.getElementById('btn-rules'),
        btnCloseRules: document.getElementById('btn-close-rules'),
        modalRules: document.getElementById('modal-rules'),
        btnSoundToggle: document.getElementById('btn-sound-toggle'),
        soundStatus: document.getElementById('sound-status'),
        soundIcon: document.getElementById('sound-icon'),
        btnRestart: document.getElementById('btn-restart'),
      };

      this.bindEvents();
      this.updateUI();
      // Consulta assíncrona: os saldos iniciais aparecem antes de a resposta do banco chegar.
      this.carregarDadosSupabase();
    }
    async carregarDadosSupabase() {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        const response = await fetch('https://cyberpoker.onrender.com/api/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!data.success) {
          console.error('Erro ao buscar perfis:', data.detail);
          return;
        }

        console.log('Perfis recebidos do FastAPI:', data.profiles);

        // Atualiza o nome visual e o saldo do jogador
        this.players[0].name = data.username;
        const meuPerfil = data.profiles.find(p => p.username === data.username);
        if (meuPerfil) {
          this.players[0].chips = meuPerfil.chips;
        }

        // Atualiza o saldo dos bots
        ['Sofia', 'Lucas', 'Elena'].forEach((nomeBot, index) => {
          const perfilBot = data.profiles.find(p => p.username === nomeBot);
          if (perfilBot) {
            this.players[index + 1].chips = perfilBot.chips;
          }
        });

        this.updateUI();
      } catch (err) {
        console.error('Erro na requisição para /api/me', err);
      }
    }

    //Funcao para salvar o saldo de todos os jogadores(vc e os bots) no supabase
    async salvarSaldosNoSupabase() {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      console.log('Salvando saldos no backend...');
      try {
        const payload = {
          players: this.players.map(p => ({
            username: p.name,
            chips: p.chips
          }))
        };

        const response = await fetch('https://cyberpoker.onrender.com/api/save_chips', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
          console.log('✅ Backend: Saldos atualizados!');
          this.addLog('💾 Saldos salvos no servidor.');
        } else {
          console.error('Erro do backend ao salvar:', data.detail);
        }
      } catch (err) {
        console.error('Erro na requisição para /api/save_chips', err);
      }
    }



    // Vincula os cliques dos botões aos respectivos métodos
    bindEvents() {
      // addEventListener liga eventos do DOM a métodos. Arrow functions preservam
      // o "this" da instância do jogo dentro dos callbacks de clique.
      // Controles do jogador
      this.dom.btnFold.addEventListener('click', () => this.handlePlayerAction('FOLD'));
      this.dom.btnCheckCall.addEventListener('click', () => this.handlePlayerAction('CHECK_CALL'));
      this.dom.btnRaise.addEventListener('click', () => {
        const amount = parseInt(this.dom.betInput.value, 10) || this.currentBet + this.minRaise;
        this.handlePlayerAction('RAISE', amount);
      });

      // Botão para iniciar nova mão
      this.dom.btnNextHand.addEventListener('click', () => this.startNewHand());

      // Sincronização entre Slider e Input de aposta
      this.dom.betSlider.addEventListener('input', (e) => {
        this.dom.betInput.value = e.target.value;
      });
      this.dom.betInput.addEventListener('input', (e) => {
        this.dom.betSlider.value = e.target.value;
      });

      // Botões de atalho rápido de valor de aposta
      this.dom.presetMin.addEventListener('click', () => {
        const minVal = Math.min(this.players[0].chips, this.currentBet + this.minRaise);
        this.setBetInputValue(minVal);
      });
      this.dom.presetHalfPot.addEventListener('click', () => {
        const halfPot = Math.max(this.currentBet + this.minRaise, Math.floor(this.pot / 2));
        const val = Math.min(this.players[0].chips, halfPot);
        this.setBetInputValue(val);
      });
      this.dom.presetPot.addEventListener('click', () => {
        const potVal = Math.max(this.currentBet + this.minRaise, this.pot);
        const val = Math.min(this.players[0].chips, potVal);
        this.setBetInputValue(val);
      });
      this.dom.presetAllin.addEventListener('click', () => {
        this.setBetInputValue(this.players[0].currentBet + this.players[0].chips);
      });

      // Modal de regras
      this.dom.btnRules.addEventListener('click', () => this.dom.modalRules.style.display = 'flex');
      this.dom.btnCloseRules.addEventListener('click', () => this.dom.modalRules.style.display = 'none');
      this.dom.modalRules.addEventListener('click', (e) => {
        if (e.target === this.dom.modalRules) this.dom.modalRules.style.display = 'none';
      });

      // Som Ligado / Desligado
      this.dom.btnSoundToggle.addEventListener('click', () => {
        SoundSystem.enabled = !SoundSystem.enabled;
        this.dom.soundStatus.textContent = SoundSystem.enabled ? 'Ligado' : 'Mudo';
        this.dom.soundIcon.textContent = SoundSystem.enabled ? '🔊' : '🔇';
      });

      // Reiniciar toda a mesa
      this.dom.btnRestart.addEventListener('click', () => {
        if (confirm('Deseja reiniciar a partida e restaurar as fichas de todos os jogadores para $1.000?')) {
          this.resetEntireGame();
        }
      });

    }

    setBetInputValue(amount) {
      // Converte os limites textuais dos inputs para números e mantém o valor dentro deles.
      amount = Math.max(Number(this.dom.betInput.min), Math.min(Number(this.dom.betInput.max), amount));
      this.dom.betSlider.value = amount;
      this.dom.betInput.value = amount;
    }

    // Registra eventos no painel de histórico lateral
    addLog(message, type = 'normal') {
      // O histórico visual foi removido; as mensagens continuam disponíveis no console.
      console.debug(`[${type}] ${message}`);
    }

    // Restaura fichas e zera a mesa
    resetEntireGame() {
      // Reiniciar restaura o estado local. Não é um logout nem um novo cadastro.
      this.players.forEach(p => {
        p.chips = 1000;
        p.cards = [];
        p.currentBet = 0;
        p.totalHandBet = 0;
        p.folded = false;
        p.allIn = false;
        const bubble = document.getElementById(`action-${p.id}`);
        if (bubble) bubble.style.display = 'none';
        if (p.isBot) {
          const botCards = document.getElementById(`cards-${p.id}`);
          if (botCards) botCards.innerHTML = '';
        }
      });
      document.querySelectorAll('.card').forEach(c => c.classList.remove('winning-card'));
      this.pot = 0;
      this.communityCards = [];
      this.gameStage = 'IDLE';
      this.activeTurnIndex = -1;
      this.addLog('A partida foi reiniciada. Todos começam com $1.000 fichas!', 'system');
      this.updateUI();
      this.dom.btnNextHand.style.display = 'flex';
      this.dom.tableStatusMsg.textContent = 'Clique em "Nova Mão" para iniciar a partida!';
    }

    /* ------------------------------------------------------------------------
       INÍCIO DE UMA NOVA MÃO
       ------------------------------------------------------------------------ */
    startNewHand() {
      // O fundo agora é gerado puramente por CSS (animado) para evitar erros de hotlinking (403 Forbidden).
      // Diferente de reiniciar: mantém os saldos e prepara apenas cartas/apostas da nova mão.
      // Remove destaques de cartas vencedoras anteriores
      document.querySelectorAll('.card').forEach(c => c.classList.remove('winning-card'));
      document.querySelectorAll('.seat').forEach(s => s.classList.remove('winner-anim'));

      // Verifica se o jogador humano tem fichas; caso tenha perdido tudo, concede recarga
      if (this.players[0].chips <= 0) {
        this.players[0].chips = 500;
        this.addLog('Você recebeu uma recarga de cortesia de $500 fichas!', 'system');
      }

      // Reabastece bots que tenham zerado
      this.players.forEach(p => {
        if (p.isBot && p.chips <= 0) {
          p.chips = 500;
          this.addLog(`${p.name} recomprou fichas ($500).`, 'system');
        }
        p.cards = [];
        p.currentBet = 0;
        p.totalHandBet = 0;
        p.folded = false;
        p.allIn = false;
        // Limpa balão de ação
        const bubble = document.getElementById(`action-${p.id}`);
        if (bubble) bubble.style.display = 'none';
        // Limpa cartas visuais de TODOS os jogadores para evitar "cartas fantasma"
        const cardsContainer = document.getElementById(`cards-${p.id}`);
        if (cardsContainer) cardsContainer.innerHTML = '';
      });

      this.deck.reset();
      this.deck.shuffle();
      this.communityCards = [];
      this.pot = 0;
      this.currentBet = 0;
      this.minRaise = this.bigBlind;

      // Avança o botão de Dealer para o próximo jogador ativo
      this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

      this.gameStage = 'PREFLOP';
      this.dom.btnNextHand.style.display = 'none';
      this.addLog(`--- Nova Mão Iniciada (Dealer: ${this.players[this.dealerIndex].name}) ---`, 'system');

      // Distribui 2 cartas para cada jogador
      for (let c = 0; c < 2; c++) {
        for (const player of this.players) {
          player.cards.push(this.deck.draw());
        }
      }
      SoundSystem.playCardSlide();

      // Cobrança dos Blinds (Small Blind e Big Blind)
      const sbIndex = (this.dealerIndex + 1) % this.players.length;
      const bbIndex = (this.dealerIndex + 2) % this.players.length;

      this.postBlind(this.players[sbIndex], this.smallBlind, 'Small Blind');
      this.postBlind(this.players[bbIndex], this.bigBlind, 'Big Blind');
      this.currentBet = this.bigBlind;

      // O primeiro a agir no Pré-Flop é quem está à esquerda do Big Blind ("Under the Gun")
      const firstActorIndex = (bbIndex + 1) % this.players.length;
      this.activeTurnIndex = firstActorIndex;
      this.lastToActIndex = bbIndex; // O Big Blind tem direito à opção ("Option") no Pré-flop

      this.updateUI();
      this.processTurn();
    }

    // Desconta o valor do blind e adiciona ao pote
    postBlind(player, amount, blindName) {
      const actualBet = Math.min(player.chips, amount);
      player.chips -= actualBet;
      player.currentBet = actualBet;
      player.totalHandBet = actualBet;
      this.pot += actualBet;
      if (player.chips === 0) player.allIn = true;
      this.addLog(`${player.name} pagou o ${blindName} de $${actualBet}.`);
      SoundSystem.playChip();
    }

    /* ------------------------------------------------------------------------
       CONTROLE DE TURNOS E FASES
       ------------------------------------------------------------------------ */
    processTurn() {
      // Primeiro verifica se a mão já pode terminar; só então habilita humano ou agenda bot.
      // Verifica se resta apenas 1 jogador ativo (todos os outros desistiram/folded)
      const activePlayers = this.players.filter(p => !p.folded);
      if (activePlayers.length === 1) {
        this.awardPotToWinner(activePlayers[0], 'Todos os outros desistiram.');
        return;
      }

      // Se todos menos um estão All-in e não há mais apostas pendentes, pula direto para o Showdown
      const nonAllInActive = activePlayers.filter(p => !p.allIn);
      const isBettingSettled = activePlayers.every(p => p.currentBet === this.currentBet || p.allIn);
      if (nonAllInActive.length <= 1 && isBettingSettled) {
        this.runRemainingCardsToShowdown();
        return;
      }

      // Identifica o jogador atual
      const currentPlayer = this.players[this.activeTurnIndex];

      // Se o jogador atual deu Fold ou está All-In, passa a vez imediatamente
      if (currentPlayer.folded || currentPlayer.allIn) {
        this.advanceToNextPlayer();
        return;
      }

      this.updateUI();

      // Se for a vez do jogador humano
      if (!currentPlayer.isBot) {
        this.dom.tableStatusMsg.textContent = 'Sua vez de agir! Escolha uma ação abaixo.';
        this.enablePlayerControls();
      } else {
        // Se for um Bot, simula tempo de reflexão (700ms a 1100ms)
        this.dom.tableStatusMsg.textContent = `${currentPlayer.name} está pensando...`;
        this.disablePlayerControls();
        // 850 é o atraso em milissegundos; altere aqui para mudar o tempo de reflexão do bot.
        setTimeout(() => {
          this.botAction(currentPlayer);
        }, 850);
      }
    }

    // Avança o turno para o próximo participante
    advanceToNextPlayer() {
      // Se voltamos para quem era o último a agir e todas as apostas estão iguais, a rodada termina
      const activePlayers = this.players.filter(p => !p.folded);
      const isBettingSettled = activePlayers.every(p => p.currentBet === this.currentBet || p.allIn);

      if (this.activeTurnIndex === this.lastToActIndex && isBettingSettled) {
        this.nextRoundStage();
        return;
      }

      // Busca o próximo jogador em sentido horário
      let nextIndex = (this.activeTurnIndex + 1) % this.players.length;
      // % faz a contagem voltar ao índice zero depois do último jogador.
      let loops = 0;
      while ((this.players[nextIndex].folded || this.players[nextIndex].allIn) && loops < this.players.length) {
        if (nextIndex === this.lastToActIndex && isBettingSettled) {
          this.nextRoundStage();
          return;
        }
        nextIndex = (nextIndex + 1) % this.players.length;
        loops++;
      }

      this.activeTurnIndex = nextIndex;
      this.processTurn();
    }

    // Transição entre as rodadas de apostas (Flop, Turn, River, Showdown)
    nextRoundStage() {
      // Os retornos antecipados evitam procurar indefinidamente um apostador inexistente.
      const activePlayers = this.players.filter(p => !p.folded);
      if (activePlayers.length === 1) {
        this.awardPotToWinner(activePlayers[0], 'Todos os outros desistiram.');
        return;
      }
      // Não procure um próximo apostador quando só restam jogadores em all-in.
      if (activePlayers.filter(p => !p.allIn).length <= 1) {
        this.runRemainingCardsToShowdown();
        return;
      }
      // Zera as apostas da etapa; as fichas já foram adicionadas ao pote no momento da ação.
      this.players.forEach(p => {
        p.currentBet = 0;
        const bubble = document.getElementById(`action-${p.id}`);
        if (bubble) bubble.style.display = 'none';
      });
      this.currentBet = 0;

      // O primeiro a falar pós-flop é o primeiro jogador ativo após o Dealer
      let firstActor = (this.dealerIndex + 1) % this.players.length;
      while (this.players[firstActor].folded || this.players[firstActor].allIn) {
        firstActor = (firstActor + 1) % this.players.length;
      }
      this.activeTurnIndex = firstActor;

      // O último a falar é o último ativo antes do primeiro a falar
      let lastActor = this.dealerIndex;
      while (this.players[lastActor].folded || this.players[lastActor].allIn) {
        lastActor = (lastActor - 1 + this.players.length) % this.players.length;
      }
      this.lastToActIndex = lastActor;

      if (this.gameStage === 'PREFLOP') {
        this.gameStage = 'FLOP';
        // Queima 1 carta e abre 3 cartas no Flop
        this.deck.draw();
        this.communityCards.push(this.deck.draw(), this.deck.draw(), this.deck.draw());
        SoundSystem.playCardSlide();
        this.addLog('--- Flop aberto: ' + this.communityCards.map(c => c.toString()).join(' ') + ' ---', 'system');
        this.updateUI();
        this.processTurn();

      } else if (this.gameStage === 'FLOP') {
        this.gameStage = 'TURN';
        // Queima 1 carta e abre o Turn
        this.deck.draw();
        this.communityCards.push(this.deck.draw());
        SoundSystem.playCardSlide();
        this.addLog('--- Turn aberto: ' + this.communityCards[3].toString() + ' ---', 'system');
        this.updateUI();
        this.processTurn();

      } else if (this.gameStage === 'TURN') {
        this.gameStage = 'RIVER';
        // Queima 1 carta e abre o River
        this.deck.draw();
        this.communityCards.push(this.deck.draw());
        SoundSystem.playCardSlide();
        this.addLog('--- River aberto: ' + this.communityCards[4].toString() + ' ---', 'system');
        this.updateUI();
        this.processTurn();

      } else if (this.gameStage === 'RIVER') {
        this.gameStage = 'SHOWDOWN';
        this.handleShowdown();
      }
    }

    // Se todos estiverem All-in, revela as cartas restantes da mesa diretamente
    runRemainingCardsToShowdown() {
      // Revelação automática quando não há mais disputa de apostas.
      // Os setTimeout abaixo espaçam as animações; valores estão em milissegundos.
      this.disablePlayerControls();
      const revealNext = () => {
        if (this.communityCards.length < 3) {
          this.deck.draw();
          this.communityCards.push(this.deck.draw(), this.deck.draw(), this.deck.draw());
        } else if (this.communityCards.length < 5) {
          this.deck.draw();
          this.communityCards.push(this.deck.draw());
        }
        SoundSystem.playCardSlide();
        this.updateUI();

        if (this.communityCards.length < 5) {
          setTimeout(revealNext, 700);
        } else {
          this.gameStage = 'SHOWDOWN';
          setTimeout(() => this.handleShowdown(), 900);
        }
      };
      setTimeout(revealNext, 600);
    }

    /* ------------------------------------------------------------------------
       AÇÕES DO JOGADOR HUMANO
       ------------------------------------------------------------------------ */
    handlePlayerAction(actionType, raiseValue = 0) {
      // actionType aceita FOLD, CHECK_CALL ou RAISE.
      // raiseValue é a aposta TOTAL desejada na etapa, incluindo o que já foi colocado.
      const player = this.players[0];
      if (this.activeTurnIndex !== 0 || player.folded || player.allIn ||
        this.gameStage === 'IDLE' || this.gameStage === 'SHOWDOWN') return;
      this.disablePlayerControls();
      const callDiff = this.currentBet - player.currentBet;

      if (actionType === 'FOLD') {
        player.folded = true;
        this.showActionBubble(player.id, 'Fold');
        this.addLog(`${player.name} desistiu (Fold).`);
        SoundSystem.playFold();
        this.advanceToNextPlayer();

      } else if (actionType === 'CHECK_CALL') {
        if (callDiff === 0) {
          // Check (Passar a vez sem apostar)
          this.showActionBubble(player.id, 'Check');
          this.addLog(`${player.name} passou a vez (Check).`);
          SoundSystem.playKnock();
        } else {
          // Call (Pagar o valor da aposta atual)
          const amountPaid = Math.min(player.chips, callDiff);
          player.chips -= amountPaid;
          player.currentBet += amountPaid;
          player.totalHandBet += amountPaid;
          this.pot += amountPaid;
          if (player.chips === 0) player.allIn = true;
          this.showActionBubble(player.id, player.allIn ? 'All-In!' : `Call $${amountPaid}`);
          this.addLog(`${player.name} pagou $${amountPaid}${player.allIn ? ' (All-in)' : ''}.`);
          SoundSystem.playChip();
        }
        this.advanceToNextPlayer();

      } else if (actionType === 'RAISE') {
        // Ex.: saldo 980 + aposta anterior 20 = alvo de all-in 1000, pagando mais 980.
        const maxTarget = player.currentBet + player.chips;
        const totalTargetBet = Math.min(maxTarget, Math.max(this.currentBet + this.minRaise, Number(raiseValue) || 0));
        const additionalChips = totalTargetBet - player.currentBet;
        const actualPaid = Math.min(player.chips, additionalChips);

        player.chips -= actualPaid;
        player.currentBet += actualPaid;
        player.totalHandBet += actualPaid;
        this.pot += actualPaid;

        if (player.currentBet > this.currentBet) {
          this.minRaise = player.currentBet - this.currentBet;
          this.currentBet = player.currentBet;
          // Quando alguém aumenta, o último a agir se torna o jogador anterior ao que aumentou
          this.lastToActIndex = (this.activeTurnIndex - 1 + this.players.length) % this.players.length;
        }

        if (player.chips === 0) player.allIn = true;

        const isBet = (callDiff === 0);
        const actionLabel = player.allIn ? 'All-In!' : (isBet ? `Apostou $${player.currentBet}` : `Aumentou para $${player.currentBet}`);
        this.showActionBubble(player.id, actionLabel);
        this.addLog(`${player.name} ${actionLabel.toLowerCase()}.`);
        SoundSystem.playChip();

        this.advanceToNextPlayer();
      }
    }

    /* ------------------------------------------------------------------------
       INTELIGÊNCIA ARTIFICIAL (BOTS ADVERSÁRIOS)
       Analisa a força da mão e perfil do bot para tomar decisões estratégicas.
       ------------------------------------------------------------------------ */
    botAction(bot) {
      // Heurística simples, não um cálculo exato de probabilidade de vitória.
      // Ajuste limiares de randomFactor/costRatio abaixo para mudar agressividade e blefes.
      const callDiff = this.currentBet - bot.currentBet;
      const allCards = [...bot.cards, ...this.communityCards];
      const evaluation = HandEvaluator.getBestHand(allCards);
      const handStrength = evaluation.score[0]; // 1 = High Card até 10 = Royal Flush

      // Fator de aleatoriedade para permitir blefes ou jogadas conservadoras
      const randomFactor = Math.random();

      // Caso 1: Ninguém apostou ainda (Call é grátis, ou seja, Check)
      if (callDiff === 0) {
        // Se a mão for boa ou se o bot for agressivo, pode apostar (Bet)
        const canBet = bot.chips > this.bigBlind;
        const shouldBet = canBet && (
          (handStrength >= 3) || // Dois pares ou melhor
          (bot.style === 'agressivo' && randomFactor > 0.45) ||
          (randomFactor > 0.8) // Blefe ocasional
        );

        if (shouldBet) {
          const betSize = Math.min(bot.chips, Math.max(this.bigBlind, Math.floor(this.pot * 0.5)));
          bot.chips -= betSize;
          bot.currentBet += betSize;
          bot.totalHandBet += betSize;
          this.pot += betSize;
          this.currentBet = bot.currentBet;
          this.minRaise = betSize;
          this.lastToActIndex = (this.activeTurnIndex - 1 + this.players.length) % this.players.length;
          if (bot.chips === 0) bot.allIn = true;

          this.showActionBubble(bot.id, `Aposta $${betSize}`);
          this.addLog(`${bot.name} apostou $${betSize}.`);
          SoundSystem.playChip();
        } else {
          // Passar a vez (Check)
          this.showActionBubble(bot.id, 'Check');
          this.addLog(`${bot.name} passou a vez (Check).`);
          SoundSystem.playKnock();
        }
      } else {
        // Caso 2: Há uma aposta na mesa que precisa ser paga (Call/Raise ou Fold)
        const costRatio = callDiff / (bot.chips + 1);

        // Critérios de desistência (Fold)
        const shouldFold = (handStrength <= 1 && costRatio > 0.12 && randomFactor > 0.25) ||
          (handStrength === 2 && costRatio > 0.35 && bot.style === 'cautelosa');

        if (shouldFold) {
          bot.folded = true;
          this.showActionBubble(bot.id, 'Fold');
          this.addLog(`${bot.name} desistiu (Fold).`);
          SoundSystem.playFold();
        } else {
          // Decisão entre Pagar (Call) ou Re-aumentar (Raise)
          const canRaise = bot.chips > callDiff + this.minRaise;
          const shouldRaise = canRaise && (
            (handStrength >= 4) || // Trinca ou melhor
            (handStrength >= 3 && bot.style === 'agressivo' && randomFactor > 0.5)
          );

          if (shouldRaise) {
            const raiseTarget = Math.min(bot.chips, this.currentBet + this.minRaise + Math.floor(this.pot * 0.3));
            const payAmount = raiseTarget - bot.currentBet;
            bot.chips -= payAmount;
            bot.currentBet += payAmount;
            bot.totalHandBet += payAmount;
            this.pot += payAmount;

            this.minRaise = bot.currentBet - this.currentBet;
            this.currentBet = bot.currentBet;
            this.lastToActIndex = (this.activeTurnIndex - 1 + this.players.length) % this.players.length;
            if (bot.chips === 0) bot.allIn = true;

            this.showActionBubble(bot.id, `Raise $${bot.currentBet}`);
            this.addLog(`${bot.name} aumentou para $${bot.currentBet}.`);
            SoundSystem.playChip();
          } else {
            // Pagar (Call)
            const payAmount = Math.min(bot.chips, callDiff);
            bot.chips -= payAmount;
            bot.currentBet += payAmount;
            bot.totalHandBet += payAmount;
            this.pot += payAmount;
            if (bot.chips === 0) bot.allIn = true;

            this.showActionBubble(bot.id, bot.allIn ? 'All-In!' : `Call $${payAmount}`);
            this.addLog(`${bot.name} pagou $${payAmount}${bot.allIn ? ' (All-in)' : ''}.`);
            SoundSystem.playChip();
          }
        }
      }

      this.advanceToNextPlayer();
    }

    // Exibe o balão de ação sobre a cabeça do jogador
    showActionBubble(playerId, text) {
      const bubble = document.getElementById(`action-${playerId}`);
      if (bubble) {
        bubble.textContent = text;
        bubble.style.display = 'block';
      }
    }

    /* ------------------------------------------------------------------------
       SHOWDOWN: COMPARAÇÃO DAS MÃOS E ENTREGA DO POTE
       ------------------------------------------------------------------------ */
    handleShowdown() {
      // Limitação atual: o pote é dividido entre as melhores mãos sem calcular potes
      // laterais para all-ins de valores diferentes; empates usam divisão inteira.
      this.disablePlayerControls();
      this.dom.currentRoundName.textContent = 'Showdown!';
      this.dom.tableStatusMsg.textContent = 'Showdown! Revelando as cartas de todos...';

      // Revela as cartas de todos os bots ativos que chegaram ao showdown
      this.players.forEach(p => {
        if (p.isBot && !p.folded) {
          const cardsContainer = document.getElementById(`cards-${p.id}`);
          cardsContainer.innerHTML = '';
          p.cards.forEach((card, idx) => {
            const cardEl = card.renderHTML(false);
            cardEl.classList.add('animate-deal');
            cardEl.style.animationDelay = `${idx * 150}ms`;
            cardsContainer.appendChild(cardEl);
          });
        }
      });

      // Avalia a mão de cada participante não desistente
      const contenders = this.players.filter(p => !p.folded).map(p => {
        const evaluation = HandEvaluator.getBestHand([...p.cards, ...this.communityCards]);
        return { player: p, evaluation };
      });

      // Ordena decrescente por força da mão
      contenders.sort((a, b) => HandEvaluator.compareScores(b.evaluation.score, a.evaluation.score));

      // Verifica se houve empate no topo (Split Pot)
      const bestScore = contenders[0].evaluation.score;
      const winners = contenders.filter(c => HandEvaluator.compareScores(c.evaluation.score, bestScore) === 0);

      // Divide o pote entre os vencedores
      const splitShare = Math.floor(this.pot / winners.length);
      const winnerNames = winners.map(w => w.player.name).join(' e ');
      const winningHandName = winners[0].evaluation.name;

      winners.forEach(w => {
        document.getElementById(`seat-${w.player.id}`).classList.add('winner-anim');
        w.player.chips += splitShare;
      });

      this.pot = 0;
      this.dom.potAmount.textContent = '$0';
      SoundSystem.playWin();

      // Destaca as cartas dos vencedores na mesa
      winners.forEach(w => {
        const winningCards = w.evaluation.cards;
        // Destaca cartas na mesa que compõem a mão vencedora
        document.querySelectorAll('.community-cards .card').forEach(cardEl => {
          const label = cardEl.querySelector('.card-val')?.textContent;
          const suit = cardEl.querySelector('.card-icon')?.textContent;
          if (winningCards.some(wc => wc.label === label && wc.symbol === suit)) {
            cardEl.classList.add('winning-card');
          }
        });
      });

      this.addLog(`🏆 Vencedor(es): ${winnerNames} com ${winningHandName}! Ganhou $${splitShare} cada.`, 'win');
      this.dom.tableStatusMsg.innerHTML = `🎉 <strong>${winnerNames}</strong> venceu com <em>${winningHandName}</em>!`;

      // Mostra o botão para iniciar a próxima mão
      this.dom.btnNextHand.style.display = 'flex';
      this.updateUI();
      this.salvarSaldosNoSupabase();
    }

    // Entrega o pote quando todos os outros deram fold
    awardPotToWinner(winner, reason) {
      this.disablePlayerControls();
      document.getElementById(`seat-${winner.id}`).classList.add('winner-anim');
      winner.chips += this.pot;
      this.addLog(`🏆 ${winner.name} levou o pote de $${this.pot}! (${reason})`, 'win');
      this.dom.tableStatusMsg.innerHTML = `🏆 <strong>${winner.name}</strong> venceu o pote ($${this.pot})!`;
      this.pot = 0;
      this.dom.potAmount.textContent = '$0';
      SoundSystem.playWin();
      this.dom.btnNextHand.style.display = 'flex';
      this.updateUI();
      this.salvarSaldosNoSupabase();
    }

    /* ------------------------------------------------------------------------
       ATUALIZAÇÃO DA INTERFACE VISUAL (DOM)
       ------------------------------------------------------------------------ */
    updateUI() {
      // Centraliza a renderização. Não altere saldos apenas no HTML: atualize players
      // e chame este método, ou a próxima renderização sobrescreverá a mudança visual.
      // 1. Atualiza o estágio da rodada no topo
      const stageNames = {
        'IDLE': 'Aguardando Início',
        'PREFLOP': 'Pré-Flop',
        'FLOP': 'Flop (3 Cartas)',
        'TURN': 'Turn (4ª Carta)',
        'RIVER': 'River (5ª Carta)',
        'SHOWDOWN': 'Showdown (Final)'
      };
      this.dom.currentRoundName.textContent = stageNames[this.gameStage] || this.gameStage;

      // 2. Atualiza Pote Total e a Pilha Visual de Fichas
      this.dom.potAmount.textContent = `$${this.pot.toLocaleString('pt-BR')}`;

      const chipStackContainer = document.getElementById('visual-chip-stack');
      if (chipStackContainer) {
        // Quantidade de fichas visuais: 1 ficha para cada $50, máximo de 15 fichas para não quebrar o layout
        const chipCount = Math.min(15, Math.floor(this.pot / 50));

        // Só redesenha se a quantidade de fichas mudou
        if (chipStackContainer.children.length !== chipCount) {
          chipStackContainer.innerHTML = '';
          for (let i = 0; i < chipCount; i++) {
            const chip = document.createElement('div');
            chip.className = 'visual-chip';
            // Variação de cor baseada na altura da pilha
            if (i % 5 === 0) chip.style.backgroundColor = '#d32f2f'; // Vermelha
            else if (i % 2 === 0) chip.style.backgroundColor = '#1976d2'; // Azul
            else chip.style.backgroundColor = '#388e3c'; // Verde

            // Pequeno atraso na animação para efeito de queda em cascata
            chip.style.animationDelay = `${i * 50}ms`;
            chipStackContainer.appendChild(chip);
          }
        }
      }

      // 3. Atualiza os assentos dos 4 jogadores
      this.players.forEach(p => {
        const seatEl = document.getElementById(`seat-${p.id}`);
        const chipsEl = document.getElementById(`chips-${p.id}`);
        const betEl = document.getElementById(`bet-${p.id}`);
        const dealerEl = document.getElementById(`dealer-${p.id}`);
        const nameEl = document.getElementById(`name-${p.id}`);

        chipsEl.textContent = `$${p.chips.toLocaleString('pt-BR')}`;
        if (nameEl) nameEl.textContent = p.name;

        // Destaque de quem é a vez atual
        if (this.activeTurnIndex === p.id && this.gameStage !== 'IDLE' && this.gameStage !== 'SHOWDOWN') {
          seatEl.classList.add('turn-active');
        } else {
          seatEl.classList.remove('turn-active');
        }

        // Jogador que deu Fold
        if (p.folded) {
          seatEl.classList.add('folded');
        } else {
          seatEl.classList.remove('folded');
        }

        // Botão de Dealer (D)
        dealerEl.style.display = (this.dealerIndex === p.id) ? 'flex' : 'none';

        // Exibição da aposta atual na mesa
        if (p.currentBet > 0) {
          betEl.textContent = `$${p.currentBet}`;
          betEl.style.display = 'block';
        } else {
          betEl.style.display = 'none';
        }
      });

      // 4. Renderiza as cartas do Jogador Humano
      const userCardsContainer = document.getElementById('cards-0');
      if (userCardsContainer.children.length !== this.players[0].cards.length) {
        userCardsContainer.innerHTML = '';
        this.players[0].cards.forEach((c, idx) => {
          const cardEl = c.renderHTML(false);
          cardEl.classList.add('animate-deal');
          cardEl.style.animationDelay = `${idx * 150}ms`;
          userCardsContainer.appendChild(cardEl);
        });
      }

      const isAdmin = this.players[0].name === 'DevBaisac_admin';

      // Renderiza as cartas dos Bots (fechadas a não ser que estejamos no Showdown ou admin)
      this.players.forEach(p => {
        if (p.isBot) {
          const botCardsContainer = document.getElementById(`cards-${p.id}`);
          if (botCardsContainer && this.gameStage !== 'SHOWDOWN') {
            const expectedCards = (p.cards.length > 0 && !p.folded) ? 2 : 0;
            if (botCardsContainer.children.length !== expectedCards) {
              botCardsContainer.innerHTML = '';
              if (expectedCards > 0) {
                if (isAdmin) {
                  const card1 = p.cards[0].renderHTML(false);
                  card1.classList.add('animate-deal');
                  const card2 = p.cards[1].renderHTML(false);
                  card2.classList.add('animate-deal');
                  card2.style.animationDelay = '150ms';
                  botCardsContainer.appendChild(card1);
                  botCardsContainer.appendChild(card2);
                } else {
                  const card1 = document.createElement('div');
                  card1.className = 'card card-back animate-deal';
                  const card2 = document.createElement('div');
                  card2.className = 'card card-back animate-deal';
                  card2.style.animationDelay = '150ms';
                  botCardsContainer.appendChild(card1);
                  botCardsContainer.appendChild(card2);
                }
              }
            }
          }
        }
      });

      // 5. Renderiza as cartas comunitárias
      const slots = ['flop-1', 'flop-2', 'flop-3', 'turn', 'river'];
      slots.forEach((slotId, index) => {
        const slotEl = document.getElementById(slotId);
        const hasCard = slotEl.querySelector('.card');
        if (this.communityCards[index]) {
          if (!hasCard) {
            slotEl.innerHTML = '';
            const cardEl = this.communityCards[index].renderHTML(false);
            cardEl.classList.add('animate-deal');
            slotEl.appendChild(cardEl);
          }
        } else {
          slotEl.innerHTML = `<span class="slot-label">${slotId.replace('-', ' ')}</span>`;
        }
      });

      // 6. Atualiza prévia da mão formada pelo jogador humano
      if (this.players[0].cards.length === 2) {
        const allUserCards = [...this.players[0].cards, ...this.communityCards];
        const evalResult = HandEvaluator.getBestHand(allUserCards);
        this.dom.playerHandRank.textContent = evalResult.name;
      } else {
        this.dom.playerHandRank.textContent = 'Aguardando cartas...';
      }
    }

    // Habilita os botões de ação para o jogador humano
    enablePlayerControls() {
      // Recalcula limites a cada turno: o saldo sozinho não representa o alvo total de aumento.
      const user = this.players[0];
      const callDiff = this.currentBet - user.currentBet;

      this.dom.btnFold.disabled = false;
      this.dom.btnCheckCall.disabled = false;

      // Configuração do botão Check / Call
      if (callDiff === 0) {
        this.dom.labelCheckCall.textContent = 'Mesa';
        this.dom.subtextCheckCall.textContent = 'Check';
        this.dom.btnCheckCall.className = 'action-btn btn-check';
      } else {
        const toPay = Math.min(user.chips, callDiff);
        this.dom.labelCheckCall.textContent = `Pagar $${toPay}`;
        this.dom.subtextCheckCall.textContent = (toPay === user.chips) ? 'All-in' : 'Call';
        this.dom.btnCheckCall.className = 'action-btn btn-check';
      }

      // Configuração do botão e slider de Aumento (Raise / Bet)
      const maxRaiseTarget = user.currentBet + user.chips;
      const minRaiseTarget = Math.min(maxRaiseTarget, this.currentBet + this.minRaise);

      if (user.chips > callDiff && maxRaiseTarget >= minRaiseTarget) {
        this.dom.btnRaise.disabled = false;
        this.dom.betSlider.disabled = false;
        this.dom.betInput.disabled = false;

        this.dom.betSlider.min = minRaiseTarget;
        this.dom.betSlider.max = maxRaiseTarget;
        this.dom.betSlider.value = minRaiseTarget;
        this.dom.betInput.min = minRaiseTarget;
        this.dom.betInput.max = maxRaiseTarget;
        this.dom.betInput.value = minRaiseTarget;

        const isBet = (callDiff === 0);
        this.dom.labelRaise.textContent = isBet ? 'Apostar' : 'Aumentar';
        this.dom.subtextRaise.textContent = isBet ? 'Bet' : 'Raise';

        [this.dom.presetMin, this.dom.presetHalfPot, this.dom.presetPot, this.dom.presetAllin].forEach(btn => btn.disabled = false);
      } else {
        this.dom.btnRaise.disabled = true;
        this.dom.betSlider.disabled = true;
        this.dom.betInput.disabled = true;
        [this.dom.presetMin, this.dom.presetHalfPot, this.dom.presetPot, this.dom.presetAllin].forEach(btn => btn.disabled = true);
      }
    }

    // Desabilita os botões de ação (ex: durante o turno dos bots)
    disablePlayerControls() {
      this.dom.btnFold.disabled = true;
      this.dom.btnCheckCall.disabled = true;
      this.dom.btnRaise.disabled = true;
      this.dom.betSlider.disabled = true;
      this.dom.betInput.disabled = true;
      [this.dom.presetMin, this.dom.presetHalfPot, this.dom.presetPot, this.dom.presetAllin].forEach(btn => btn.disabled = true);
    }
  }

  // Inicializa a instância do jogo
  const game = new PokerGame();
});
