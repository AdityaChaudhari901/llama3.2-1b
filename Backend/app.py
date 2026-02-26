import os, time, subprocess
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
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateIn(BaseModel):
    prompt: str
    temperature: float | None = 0.7

class AskIn(BaseModel):
    question: str
    temperature: float | None = 0.7

@app.on_event("startup")
def startup():
    subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # wait for server
    deadline = time.time() + 60
    while time.time() < deadline:
        try:
            r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=2.0)
            if r.status_code == 200:
                break
        except Exception:
            pass
        time.sleep(1)

    # pull model on boot
    subprocess.run(["ollama", "pull", MODEL], check=False)

@app.get("/health")
def health():
    return {"ok": True, "model": MODEL}

@app.post("/generate")
async def generate(payload: GenerateIn):
    body = {"model": MODEL, "prompt": payload.prompt, "stream": False,
            "options": {"temperature": payload.temperature}}
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)

# Serve React frontend static files from dist/ if it exists
# (must be mounted AFTER all API routes so they take priority)
import os
from pathlib import Path
_dist = Path(__file__).parent / "dist"
if _dist.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")