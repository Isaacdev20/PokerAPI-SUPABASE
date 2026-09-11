# Arquivo: backend/app/game/test_engine.py
from deck import Deck
from evaluator import HandEvaluator

print("---  Testando o Motor Seguro de Poker  ---")

# 1. Cria e embaralha o baralho
deck = Deck()
deck.shuffle()
print(f"Baralho embaralhado com sucesso! Cartas restantes: {len(deck.cards)}")

# 2. Distribui 5 cartas comunitárias e 2 cartas para o jogador
mesa = [deck.draw() for _ in range(5)]
mao_jogador = [deck.draw(), deck.draw()]

# Vamos exibir apenas a letra inicial do naipe para ficar bonitinho no terminal
print(f"\nCartas da Mesa: {[c.label + c.suit[0].upper() for c in mesa]}")
print(f"Sua Mão: {[c.label + c.suit[0].upper() for c in mao_jogador]}")

# 3. Avalia o resultado combinando as 7 cartas
todas_as_cartas = mesa + mao_jogador
resultado = HandEvaluator.get_best_hand(todas_as_cartas)

print(f"\n🏆 Resultado Oficial do Servidor:")
print(f"Jogo Formado: {resultado['type']['name']}")
print(f"Score Matemático (Para Desempate): {resultado['score']}")
