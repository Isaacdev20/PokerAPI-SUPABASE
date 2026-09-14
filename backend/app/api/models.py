# Arquivo: backend/app/api/models.py
from pydantic import BaseModel, Field

# ======== GUARDA-COSTAS (Pydantic Models) ========
# Eles garantem que o frontend envie os dados perfeitamente formatados

class PlayerAction(BaseModel):
    # A ação só pode ser uma dessas
    action: str = Field(..., pattern="^(FOLD|CHECK|CALL|RAISE)$")
    # O valor apostado deve ser maior ou igual a zero (ge=0 significa greater or equal to 0)
    amount: int = Field(default=0, ge=0)
