# Arquivo: backend/app/game/deck.py
import secrets

# Naipes e Valores oficiais do jogo
SUITS = ["spades", "hearts", "diamonds", "clubs"]
RANKS = [
    {"value": 2, "label": "2"},
    {"value": 3, "label": "3"},
    {"value": 4, "label": "4"},
    {"value": 5, "label": "5"},
    {"value": 6, "label": "6"},
    {"value": 7, "label": "7"},
    {"value": 8, "label": "8"},
    {"value": 9, "label": "9"},
    {"value": 10, "label": "10"},
    {"value": 11, "label": "J"},
    {"value": 12, "label": "Q"},
    {"value": 13, "label": "K"},
    {"value": 14, "label": "A"}
]

class Card:
    def __init__(self, rank, suit):
        self.value = rank["value"]
        self.label = rank["label"]
        self.suit = suit
        self.is_red = suit in ["hearts", "diamonds"]

    def dict(self):
        # Facilita mandar os dados dessa carta para o Frontend no formato JSON depois
        return {
            "value": self.value,
            "label": self.label,
            "suit": self.suit,
            "is_red": self.is_red
        }

class Deck:
    def __init__(self):
        self.cards = []
        self.reset()

    def reset(self):
        """Recria o baralho padrão de 52 cartas em ordem"""
        self.cards = []
        for suit in SUITS:
            for rank in RANKS:
                self.cards.append(Card(rank, suit))

    def shuffle(self):
        """
        Embaralhamento Fisher-Yates Criptograficamente Seguro.
        Substitui o Math.random() inseguro do Javascript.
        """
        for i in range(len(self.cards) - 1, 0, -1):
            # secrets.randbelow gera números aleatórios impossíveis de prever
            j = secrets.randbelow(i + 1)
            # Troca as cartas de posição (swap)
            self.cards[i], self.cards[j] = self.cards[j], self.cards[i]

    def draw(self):
        """Puxa a carta do topo"""
        if len(self.cards) > 0:
            return self.cards.pop()
        return None
