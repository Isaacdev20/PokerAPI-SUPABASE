# Arquivo: backend/app/game/evaluator.py
import itertools

class HandEvaluator:
    # Hierarquia oficial de Mãos de Poker
    HAND_TYPES = {
        "ROYAL_FLUSH": {"rank": 10, "name": "Royal Flush"},
        "STRAIGHT_FLUSH": {"rank": 9, "name": "Straight Flush"},
        "FOUR_OF_A_KIND": {"rank": 8, "name": "Quadra"},
        "FULL_HOUSE": {"rank": 7, "name": "Full House"},
        "FLUSH": {"rank": 6, "name": "Flush (Cor)"},
        "STRAIGHT": {"rank": 5, "name": "Sequência"},
        "THREE_OF_A_KIND": {"rank": 4, "name": "Trinca"},
        "TWO_PAIR": {"rank": 3, "name": "Dois Pares"},
        "ONE_PAIR": {"rank": 2, "name": "Um Par"},
        "HIGH_CARD": {"rank": 1, "name": "Carta Alta"}
    }

    @staticmethod
    def evaluate_5_cards(cards):
        """Avalia exatamente 5 cartas e retorna o score com desempate de kickers"""
        # Ordena da maior para a menor
        sorted_cards = sorted(cards, key=lambda c: c.value, reverse=True)
        values = [c.value for c in sorted_cards]
        suits = [c.suit for c in sorted_cards]

        is_flush = all(s == suits[0] for s in suits)
        
        is_straight = False
        straight_high = 0

        # Checa sequência normal (ex: 9, 8, 7, 6, 5)
        is_normal_straight = all(i == 0 or values[i-1] - values[i] == 1 for i in range(len(values)))
        
        if is_normal_straight:
            is_straight = True
            straight_high = values[0]
        else:
            # Checa sequência baixa (Wheel): A-2-3-4-5 (Ás vale 14, mas joga como 1 aqui)
            if values == [14, 5, 4, 3, 2]:
                is_straight = True
                straight_high = 5

        # Conta as repetições (Quantos pares? Tem trinca?)
        counts = {}
        for v in values:
            counts[v] = counts.get(v, 0) + 1
            
        count_pairs = [{"value": k, "count": v} for k, v in counts.items()]
        # Ordena para as maiores trincas/pares aparecerem primeiro
        count_pairs.sort(key=lambda x: (x["count"], x["value"]), reverse=True)

        # 1. Royal Flush ou Straight Flush
        if is_flush and is_straight:
            if straight_high == 14:
                return {"type": HandEvaluator.HAND_TYPES["ROYAL_FLUSH"], "score": [10, 14]}
            return {"type": HandEvaluator.HAND_TYPES["STRAIGHT_FLUSH"], "score": [9, straight_high]}

        # 2. Quadra
        if count_pairs[0]["count"] == 4:
            return {"type": HandEvaluator.HAND_TYPES["FOUR_OF_A_KIND"], "score": [8, count_pairs[0]["value"], count_pairs[1]["value"]]}

        # 3. Full House
        if count_pairs[0]["count"] == 3 and count_pairs[1]["count"] == 2:
            return {"type": HandEvaluator.HAND_TYPES["FULL_HOUSE"], "score": [7, count_pairs[0]["value"], count_pairs[1]["value"]]}

        # 4. Flush
        if is_flush:
            return {"type": HandEvaluator.HAND_TYPES["FLUSH"], "score": [6] + values}

        # 5. Sequência
        if is_straight:
            return {"type": HandEvaluator.HAND_TYPES["STRAIGHT"], "score": [5, straight_high]}

        # 6. Trinca
        if count_pairs[0]["count"] == 3:
            kickers = [p["value"] for p in count_pairs[1:]]
            return {"type": HandEvaluator.HAND_TYPES["THREE_OF_A_KIND"], "score": [4, count_pairs[0]["value"]] + kickers}

        # 7. Dois Pares
        if count_pairs[0]["count"] == 2 and count_pairs[1]["count"] == 2:
            return {"type": HandEvaluator.HAND_TYPES["TWO_PAIR"], "score": [3, count_pairs[0]["value"], count_pairs[1]["value"], count_pairs[2]["value"]]}

        # 8. Um Par
        if count_pairs[0]["count"] == 2:
            kickers = [p["value"] for p in count_pairs[1:]]
            return {"type": HandEvaluator.HAND_TYPES["ONE_PAIR"], "score": [2, count_pairs[0]["value"]] + kickers}

        # 9. Carta Alta
        return {"type": HandEvaluator.HAND_TYPES["HIGH_CARD"], "score": [1] + values}

    @staticmethod
    def get_best_hand(all_cards):
        """Recebe até 7 cartas e acha a melhor combinação possível de 5"""
        if not all_cards or len(all_cards) < 5:
            return {"type": HandEvaluator.HAND_TYPES["HIGH_CARD"], "name": "Aguardando cartas...", "score": [0]}

        best = None
        # Testa matematicamente todas as combinações de 5 cartas
        for combo in itertools.combinations(all_cards, 5):
            evaluated = HandEvaluator.evaluate_5_cards(combo)
            # O Python é inteligente: comparar duas listas (scores) faz o desempate perfeito dos Kickers!
            if not best or evaluated["score"] > best["score"]:
                best = evaluated

        return best
