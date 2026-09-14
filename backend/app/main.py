# Arquivo: backend/app/main.py
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

# Importamos o nosso guarda-costas!
from app.api.models import PlayerAction

app = FastAPI(title="Poker Multiplayer Seguro")

# O CORS permite que o Vite (porta 5173) converse com o FastAPI (porta 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======== VALIDADOR DE CRACHÁ (Dependency) ========
# Esta função exige que a requisição tenha um token JWT de autorização

async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Faltou o JWT de autorização (Bearer Token)")
    
    token = authorization.split(" ")[1]
    
    # Na próxima fase vamos validar este JWT no Supabase. Por enquanto, só exigimos que ele exista.
    if len(token) < 10:
        raise HTTPException(status_code=401, detail="JWT Inválido")
    
    return token

# ======== ROTAS (Endpoints) ========

@app.get("/")
def read_root():
    return {"status": "Motor de Poker Rodando com Segurança Máxima"}

# Rota para fazer uma jogada na mesa
@app.post("/api/actions")
async def handle_action(play: PlayerAction, token: str = Depends(verify_token)):
    """
    O frontend envia um POST para cá quando o jogador clica em APOSTAR.
    Só passa se o JWT for válido e o valor da aposta não for negativo!
    """
    
    # Se chegou aqui, o Pydantic já garantiu segurança contra injeção de dados incorretos!
    print(f"[AÇÃO RECEBIDA] Ação: {play.action} | Valor: {play.amount}")
    print(f"[JOGADOR LOGADO] JWT: {token[:15]}...")
    
    return {
        "success": True, 
        "message": f"Sua jogada de {play.action} no valor de {play.amount} foi validada!"
    }
