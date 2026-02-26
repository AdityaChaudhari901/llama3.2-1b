import os, time, threading, subprocess
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

PORT = int(os.getenv("PORT", "8080"))
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
MODEL = os.getenv("MODEL", "llama3.2:1b")

app = FastAPI()

# Allow all origins so the frontend can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track model readiness (set to True after pull completes)
_model_ready = False

def _start_ollama():
    """Run in a background thread so uvicorn binds immediately."""
    global _model_ready

    # 1. Start ollama serve
    subprocess.Popen(
        ["ollama", "serve"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # 2. Wait up to 90s for ollama to be reachable
    deadline = time.time() + 90
    while time.time() < deadline:
        try:
            r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=2.0)
            if r.status_code == 200:
                break
        except Exception:
            pass
        time.sleep(1)

    # 3. Pull the model
    subprocess.run(["ollama", "pull", MODEL], check=False)
    _model_ready = True
    print(f"[startup] Model {MODEL} ready.", flush=True)


class GenerateIn(BaseModel):
    prompt: str
    temperature: float | None = 0.7

class AskIn(BaseModel):
    question: str
    temperature: float | None = 0.7


@app.on_event("startup")
def startup():
    """Fire-and-forget: start ollama in a background thread."""
    t = threading.Thread(target=_start_ollama, daemon=True)
    t.start()


@app.get("/health")
def health():
    """Always returns 200 — used by Boltic's liveness probe."""
    return {"ok": True, "model": MODEL, "model_ready": _model_ready}


@app.get("/ready")
def ready():
    """Returns model load status. Poll this to know when you can chat."""
    return {"ready": _model_ready, "model": MODEL}


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
    """Frontend-friendly endpoint: send a question, get a plain answer back."""
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


# Serve React frontend static files from dist/ if it exists
# Must be mounted AFTER all API routes so they take priority
from pathlib import Path
from fastapi.staticfiles import StaticFiles

_dist = Path(__file__).parent / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)