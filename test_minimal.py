"""Minimal test to verify Boltic deployment works"""
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"status": "ok", "message": "Minimal test working"}

@app.get("/health")
def health():
    return {"ok": True, "test": "minimal"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
