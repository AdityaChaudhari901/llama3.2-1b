import os
import httpx
import re
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, field_validator, ValidationError
import uvicorn

PORT = int(os.getenv("PORT", "8080"))
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
MODEL = os.getenv("MODEL", "llama3.2:1b")

# Guardrails Configuration
MAX_INPUT_LENGTH = 2000

# Prompt injection patterns
INJECTION_PATTERNS = [
    r"ignore\s+previous\s+instructions",
    r"ignore\s+all\s+instructions",
    r"disregard\s+previous",
    r"you\s+are\s+now",
    r"new\s+instructions:",
    r"forget\s+(everything|all|your)",
    r"act\s+as\s+if",
]

# Harmful content patterns
HARMFUL_PATTERNS = [
    r"\b(bomb|explosive|detonate|c4|dynamite|grenade)\b",
    r"\b(weapon|gun|firearm|ammunition|rifle)\b",
    r"\b(suicide|self[- ]?harm|kill\s+(myself|yourself))\b",
    r"\b(hack|exploit|vulnerability|breach|backdoor)\s+(into|system|network)",
    r"\b(steal|robbery|burglary|breaking\s+in)\b",
    r"\b(drug|cocaine|heroin|meth|mdma)\s+(make|manufacture|produce|cook)",
    r"\b(poison|toxin|venom)\s+(make|create|produce)",
    r"how\s+to\s+(kill|murder|assassinate)",
    r"\b(child|minor|underage).{0,50}(sexual|explicit|porn)",
    r"\b(terrorism|terrorist\s+attack)\b",
]

# AI Personality
SYSTEM_PERSONALITY = os.getenv(
    "AI_PERSONALITY",
    "You are a helpful, friendly, and professional AI assistant. "
    "You provide clear and concise answers. You are respectful and positive. "
    "If you don't know something, you admit it honestly."
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Convert Pydantic validation errors to user-friendly messages"""
    errors = exc.errors()
    if errors:
        # Get the first error message (usually the most relevant)
        first_error = errors[0]
        msg = first_error.get("msg", "Validation error")
        
        # Check if it's one of our safety messages
        if "safety guidelines" in msg or "injection" in msg.lower():
            return JSONResponse(
                status_code=400,
                content={"error": msg}
            )
    
    return JSONResponse(
        status_code=422,
        content={"error": "Invalid input", "details": errors}
    )

class GenerateIn(BaseModel):
    prompt: str
    temperature: float | None = 0.7
    
    @field_validator('prompt')
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Prompt cannot be empty")
        if len(v) > MAX_INPUT_LENGTH:
            raise ValueError(f"Prompt too long. Max {MAX_INPUT_LENGTH} characters")
        
        # Check for prompt injection attempts
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("Prompt injection attempt detected")
        
        # Check for harmful content
        for pattern in HARMFUL_PATTERNS:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("This request contains content that violates our safety guidelines")
        
        return v.strip()

class AskIn(BaseModel):
    question: str
    temperature: float | None = 0.7
    personality: str | None = None
    
    @field_validator('question')
    @classmethod
    def validate_question(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Question cannot be empty")
        if len(v) > MAX_INPUT_LENGTH:
            raise ValueError(f"Question too long. Max {MAX_INPUT_LENGTH} characters")
        
        # Check for prompt injection attempts
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("Prompt injection attempt detected")
        
        # Check for harmful content
        for pattern in HARMFUL_PATTERNS:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("This request contains content that violates our safety guidelines")
        
        return v.strip()

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
    # Apply personality to the prompt
    personality = payload.personality or SYSTEM_PERSONALITY
    enhanced_prompt = f"{personality}\n\nUser: {payload.question}\n\nAssistant:"
    
    body = {
        "model": MODEL,
        "prompt": enhanced_prompt,
        "stream": False,
        "options": {"temperature": payload.temperature},
    }
    
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            r = await client.post(f"{OLLAMA_URL}/api/generate", json=body)
            r.raise_for_status()
            data = r.json()
            answer = data.get("response", "").strip()
            
            # Basic output filtering (remove potential harmful content markers)
            if not answer:
                answer = "I apologize, but I couldn't generate a proper response."
            
            return {"answer": answer, "model": MODEL}
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Model service error: {str(e)}")

# Serve React frontend static files from dist/
# IMPORTANT: Mount static files at the end so API routes take precedence
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

_dist = Path(__file__).parent / "dist"
if _dist.exists():
    # Mount static assets directory
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")
    
    # Serve index.html for root path
    @app.get("/", include_in_schema=False)
    async def serve_root():
        """Serve the React app at root"""
        return FileResponse(_dist / "index.html")
    
    # Mount root level static files (logo.png, favicon, etc)
    @app.get("/{filename}", include_in_schema=False)
    async def serve_static_files(filename: str):
        """Serve static files from dist root (logo.png, etc)"""
        file_path = _dist / filename
        # Only serve if it's an actual file (not a directory or non-existent)
        if file_path.is_file() and file_path.name != "index.html":
            return FileResponse(file_path)
        # Otherwise serve index.html for SPA routing
        return FileResponse(_dist / "index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)