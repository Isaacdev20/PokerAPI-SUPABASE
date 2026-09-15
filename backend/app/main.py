from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel
from supabase import create_client, Client
import os

from app.api.models import PlayerAction

app = FastAPI(title="Poker Multiplayer Seguro")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
                   "http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = 'https://fojwtwzcnwwfjdfapuvd.supabase.co'
SUPABASE_ANON_KEY = 'sb_publishable_afLlUxeI3Q-vem8qBwj_NA_eiGOgU_X'
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# ======== VALIDADOR DE CRACHÁ ========
async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Faltou o JWT de autorização")
    token = authorization.split(" ")[1]
    try:
        res = supabase.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Token JWT inválido ou expirado")
        return {"token": token, "user": res.user}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erro na validação: {str(e)}")

# ======== ROTAS ========

@app.get("/")
def read_root():
    return {"status": "Motor de Poker Rodando"}

@app.get("/api/me")
async def get_my_profile(auth_data: dict = Depends(verify_token)):
    user = auth_data["user"]
    username = user.user_metadata.get("username") or user.email.split('@')[0]

    res = supabase.table("player_profiles").select("*").execute()
    profiles = res.data

    my_profile = next((p for p in profiles if p["username"] == username), None)
    if not my_profile:
        new = supabase.table("player_profiles").insert({"username": username, "chips": 1000}).execute()
        if new.data:
            profiles.append(new.data[0])

    return {"success": True, "profiles": profiles, "username": username}

class PlayerChips(BaseModel):
    username: str
    chips: int

class SaveChipsRequest(BaseModel):
    players: list[PlayerChips]

@app.post("/api/save_chips")
async def save_chips(req: SaveChipsRequest, auth_data: dict = Depends(verify_token)):
    for p in req.players:
        supabase.table("player_profiles").update({"chips": p.chips}).eq("username", p.username).execute()
    return {"success": True, "message": "Saldos atualizados"}
