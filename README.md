# ♠️ Royal Hold'em - Jogo de Poker Texas Hold'em

Um jogo completo, interativo e visualmente elegante de **Texas Hold'em Poker** construído exclusivamente com tecnologias web nativas (**HTML5**, **CSS3** e **JavaScript puro**), sem necessidade de frameworks ou dependências externas.

O projeto foi projetado com código limpo e amplamente comentado para fins educacionais, permitindo que qualquer pessoa — de estudantes a desenvolvedores — entenda a arquitetura de um jogo de cartas, avaliação matemática de probabilidades e criação de inteligência artificial simples.

---

## 📋 Sumário
1. [Visão Geral e Recursos](#-visão-geral-e-recursos)
2. [Como Executar o Jogo](#-como-executar-o-jogo)
3. [Como Jogar Texas Hold'em](#-como-jogar-texas-holdem)
4. [Hierarquia Oficial das Mãos de Poker](#-hierarquia-oficial-das-mãos-de-poker)
5. [Arquitetura e Explicação dos Arquivos](#-arquitetura-e-explicação-dos-arquivos)
   - [index.html (Estrutura)](#1-indexhtml)
   - [style.css (Aparência e Animações)](#2-stylecss)
   - [script.js (Lógica e Motor do Jogo)](#3-scriptjs)
6. [Inteligência Artificial (Como os Bots Decidem)](#-inteligência-artificial-dos-bots)
7. [Efeitos Sonoros com Web Audio API](#-efeitos-sonoros-nativos)

---

## 🌟 Visão Geral e Recursos

- **Mesa Estilo Cassino:** Feltro verde oval de veludo, borda de madeira acolchoada e acabamentos em dourado metálico.
- **1 Jogador Humano vs. 3 Oponentes Virtuais (Bots):**
  - **Sofia:** Estilo equilibrado / analítico.
  - **Lucas:** Estilo agressivo (costuma apostar alto e tentar blefes).
  - **Elena:** Estilo cauteloso / conservador (só aposta com mãos fortes).
- **Avaliador Completo de Mãos (7 Cartas):** Identifica a melhor mão entre as suas 2 cartas privadas e as 5 cartas comunitárias, resolvendo desempates com critério oficial de *Kickers*.
- **Indicador em Tempo Real:** Mostra para você qual combinação você tem em mãos a cada carta revelada (Ex: *"Dois Pares"*, *"Trinca"*).
- **Efeitos Sonoros Sintetizados:** Sons realistas de deslizar cartas, tinir de fichas, batida de check na mesa e fanfarra de vitória sem baixar nenhum arquivo de áudio.
- **Painel de Apostas Dinâmico:** Botões com atalhos inteligentes (Mínimo, 1/2 Pote, Pote e All-In) e slider interativo.

---

## 🚀 Como Executar o Jogo

Não é necessário instalar nada (sem `npm`, sem `node`, sem servidor local).

1. Abra a pasta do projeto no seu computador.
2. Dê um duplo clique no arquivo [`index.html`](index.html).
3. O jogo abrirá imediatamente em qualquer navegador moderno (Chrome, Edge, Firefox, Safari ou Opera).
4. Clique no botão dourado **"Nova Mão"** no painel inferior para iniciar a primeira rodada!

---

## 🃏 Como Jogar Texas Hold'em

O Texas Hold'em é a modalidade de poker mais popular do mundo. O objetivo é formar a **melhor combinação de 5 cartas**, usando qualquer arranjo entre as suas **2 cartas privadas** e as **5 cartas comunitárias** abertas no centro da mesa.

### As Fases de Cada Mão:
1. **Distribuição e Blinds (Pré-Flop):**
   - Dois jogadores pagam apostas obrigatórias para formar o pote inicial: o *Small Blind* e o *Big Blind*.
   - Todos recebem 2 cartas viradas para baixo. Ocorre a primeira rodada de apostas.
2. **O Flop:**
   - 3 cartas comunitárias são abertas viradas para cima na mesa. Nova rodada de apostas.
3. **O Turn:**
   - A 4ª carta comunitária é revelada. Nova rodada de apostas.
4. **O River:**
   - A 5ª e última carta comunitária é revelada. Última rodada de apostas.
5. **O Showdown:**
   - Os jogadores restantes revelam suas cartas. Quem tiver a combinação mais forte leva o pote!

### Suas Ações Possíveis:
- **Desistir (Fold):** Descarta suas cartas e sai da rodada, protegendo o restante de suas fichas.
- **Passar (Check):** Passa a vez sem apostar nada a mais (permitido apenas quando ninguém aumentou a aposta antes de você na rodada).
- **Pagar (Call):** Iguala o valor da aposta feita por outro jogador para continuar na disputa.
- **Aumentar (Raise / Bet):** Coloca mais fichas na mesa, forçando os outros jogadores a pagarem mais se quiserem continuar.
- **All-In:** Aposta todas as fichas que você possui.

---

## 🏆 Hierarquia Oficial das Mãos de Poker

Da mais rara e forte para a mais fraca:

| Posição | Combinação | Descrição | Exemplo |
| :---: | :--- | :--- | :--- |
| **1º** | **Royal Flush** | 10, J, Q, K e Ás do mesmo naipe | `10♠ J♠ Q♠ K♠ A♠` |
| **2º** | **Straight Flush** | Cinco cartas em ordem numérica do mesmo naipe | `5♥ 6♥ 7♥ 8♥ 9♥` |
| **3º** | **Quadra (Four of a Kind)** | Quatro cartas com o mesmo número | `K♦ K♣ K♠ K♥ 3♣` |
| **4º** | **Full House** | Uma trinca + um par | `J♠ J♦ J♣ 8♥ 8♠` |
| **5º** | **Flush (Cor)** | Cinco cartas de mesmo naipe não consecutivas | `A♦ J♦ 8♦ 6♦ 2♦` |
| **6º** | **Sequência (Straight)** | Cinco cartas em ordem numérica de naipes variados | `4♣ 5♥ 6♦ 7♠ 8♥` |
| **7º** | **Trinca (Three of a Kind)** | Três cartas com o mesmo número | `7♣ 7♦ 7♠ K♥ 2♣` |
| **8º** | **Dois Pares (Two Pair)** | Dois pares de valores diferentes | `Q♠ Q♥ 4♣ 4♦ A♠` |
| **9º** | **Um Par (One Pair)** | Duas cartas com o mesmo número | `10♥ 10♦ A♣ 8♠ 4♦` |
| **10º**| **Carta Mais Alta (High Card)** | Nenhuma combinação formada; ganha a carta de maior valor | `A♠ J♥ 9♦ 5♣ 2♥` |

---

## 🛠️ Arquitetura e Explicação dos Arquivos

O projeto é dividido em 3 arquivos principais, cada um com uma responsabilidade clara e comentários explicativos:

### 1. [`index.html`](index.html)
Responsável pelo esqueleto visual e pela semântica da aplicação:
- **`<header class="app-header">`**: Contém o título, indicador de rodada ativa (Pré-flop, Flop, etc.) e botões de controle (Regras, Som e Reiniciar).
- **`<div class="poker-table">`**: A mesa de poker em si. Dentro dela estão os 4 assentos (`.seat`) posicionados em cruz e a área central (`.center-area`) com o pote e as 5 cartas comunitárias.
- **`<section class="player-control-dock">`**: Barra inferior fixa com visualização da mão do jogador e botões de aposta.
- **`<aside class="game-log-panel">`**: Caixa lateral que exibe em tempo real o histórico de todas as ações dos jogadores.
- **`<div class="modal-backdrop" id="modal-rules">`**: Janela de diálogo que exibe as regras e a tabela de mãos.

### 2. [`style.css`](style.css)
Responsável pelo design refinado e pela sensação de jogo de cassino:
- **Design Tokens (`:root`)**: Centraliza as cores (verde esmeralda, dourado, feltro escuro), fontes e sombras.
- **Layout da Mesa**: Utiliza coordenadas absolutas calculadas para distribuir os jogadores harmoniosamente ao redor da elipse.
- **Estilização das Cartas (`.card`)**: Efeito 3D com naipes vermelhos (`♥`, `♦`) e pretos (`♠`, `♣`), verso estilizado com textura de cassino e brilho dourado (`winning-card`) para destacar as cartas vitoriosas no showdown.
- **Responsividade (`@media`)**: Ajusta proporções para caber perfeitamente em notebooks e telas menores.

### 3. [`script.js`](script.js)
O coração da lógica do jogo. É estruturado em submódulos didáticos:
- **`SoundSystem`**: Utiliza a **Web Audio API** do navegador para sintetizar frequências sonoras (ruído branco filtrado para cartas, ondas senoidais para fichas e osciladores em arpeggio para vitórias).
- **`Card` e `Deck`**: Classes que criam as 52 cartas e aplicam o algoritmo matemático de **Fisher-Yates** para garantir que o baralho seja embaralhado de forma 100% justa e aleatória.
- **`HandEvaluator`**: Avaliador combinatorial que analisa todas as 21 combinações possíveis de 5 cartas a partir das 7 cartas disponíveis e atribui um vetor de pontuação `[categoria, kicker1, kicker2, ...]`.
- **`PokerGame`**: Máquina de estados que gerencia a troca de turnos, cobrança de blinds, transição de etapas (Flop, Turn, River) e entrega das fichas do pote ao vencedor.

---

## 🤖 Inteligência Artificial dos Bots

Os oponentes virtuais tomam decisões com base em três fatores:
1. **Força Atual da Mão:** O bot avalia o rank que possui no momento (de Carta Alta até Royal Flush).
2. **Custo da Aposta (Risco / Recompensa):** Compara quantas fichas precisa pagar em relação ao tamanho total do seu saldo.
3. **Personalidade / Perfil:**
   - **Lucas (Agressivo):** Tem probabilidade alta de apostar e aumentar mesmo sem a melhor mão.
   - **Elena (Cautelosa):** Desiste de apostas altas caso não tenha pelo menos um Par forte ou Trinca.
   - **Sofia (Equilibrada):** Joga pelas probabilidades clássicas.

---

## 🔊 Efeitos Sonoros Nativos

Para garantir que o projeto funcione **em qualquer ambiente sem erros de carregamento de arquivo ou CORS**, todos os efeitos sonoros são gerados em tempo real pelo sintetizador de áudio nativo do navegador via JavaScript:
- **Deslizar carta:** Ruído branco passado por um filtro passa-faixa.
- **Fichas:** Pulso senoidal de decaimento ultrarrápido (2400Hz para 800Hz em 60ms).
- **Check:** Batida de baixa frequência simulando toque em madeira maciça.
- **Vitória:** Arpeggio musical com ondas triangulares limpas.

---

*Desenvolvido com foco em código limpo, boas práticas e aprendizado prático de desenvolvimento web.*
