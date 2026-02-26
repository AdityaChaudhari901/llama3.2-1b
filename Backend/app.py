import os
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

PORT = int(os.getenv("PORT", "8080"))
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
MODEL = os.getenv("MODEL", "llama3.2:1b")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateIn(BaseModel):
    prompt: str
    temperature: float | None = 0.7

class AskIn(BaseModel):
    question: str
    temperature: float | None = 0.7

def _is_model_ready():
    """Check if the model is fully loaded in Ollama."""
    try:
        r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=1.0)
        if r.status_code == 200:
            models = r.json().get("models", [])
            for m in models:
                if m.get("name") == MODEL or m.get("name", "").startswith(MODEL):
                    return True
    except Exception:
        pass
    return False

@app.get("/health")
def health():
    """Always returns 200 — used by Boltic's liveness probe."""
    return {"ok": True, "model": MODEL, "model_ready": _is_model_ready()}

@app.get("/ready")
def ready():
    """Poll this to know when you can start chatting."""
    return {"ready": _is_model_ready(), "model": MODEL}

@app.post("/generate")
async def generate(payload: GenerateIn):
    body = {
        "model": MODEL,
        "prompt": payload.prompt,
        "stream": False,
        "options": {"temperature": payload.temperature},
    }
    async with httpx.AsyncClient(timeout=180.0) as client:
        r = await client.post(f"{OLLAMA_URL}/api/generate", json=body)
        r.raise_for_status()
        return r.json()

@app.post("/ask")
async def ask(payload: AskIn):
    body = {
        "model": MODEL,
        "prompt": payload.question,
        "stream": False,
        "options": {"temperature": payload.temperature},
    }
    async with httpx.AsyncClient(timeout=180.0) as client:
        r = await client.post(f"{OLLAMA_URL}/api/generate", json=body)
        r.raise_for_status()
        data = r.json()
        return {"answer": data.get("response", ""), "model": MODEL}

# Serve React frontend static files from dist/
from pathlib import Path
from fastapi.staticfiles import StaticFiles

_dist = Path(__file__).parent / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)