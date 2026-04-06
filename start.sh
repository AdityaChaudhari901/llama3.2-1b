#!/bin/bash
# Do NOT use set -e — we must always reach the uvicorn exec at the end,
# even if Ollama is slow or model verification fails.

echo "=========================================="
echo "Starting deployment at $(date)"
echo "Working directory: $(pwd)"
echo "Python version: $(python3 --version)"
echo "Files in /app: $(ls -la /app)"
echo "=========================================="

echo "Starting Ollama server..."
OLLAMA_HOST=127.0.0.1:11434 ollama serve &

# Wait up to 150 s for Ollama to be ready.
echo "Waiting for Ollama server to start (up to 150 s)..."
OLLAMA_READY=false
for i in $(seq 1 50); do
  if curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "Ollama server is ready after ${i} attempts (~$((i*3)) s)!"
    OLLAMA_READY=true
    break
  fi
  echo "Waiting for Ollama... ($i/50)"
  sleep 3
done

if [ "$OLLAMA_READY" = "false" ]; then
  echo "Ollama did not respond in 150 s — continuing anyway so FastAPI can start."
fi

# Remove any models that are NOT gemma3:27b (free up disk, best-effort)
echo "Removing any non-gemma3 models..."
for model in $(ollama list 2>/dev/null | awk 'NR>1 {print $1}'); do
  if [[ "$model" != *"gemma3:27b"* ]]; then
    echo "Removing $model..."
    ollama rm "$model" 2>/dev/null || true
  fi
done

# Verify gemma3:27b is present; pull only as a last resort.
echo "Verifying model $MODEL..."
if ollama list 2>/dev/null | grep -q "$MODEL"; then
  echo "Model $MODEL is ready!"
else
  echo "Model not found — attempting pull (this will be slow)..."
  ollama pull "$MODEL" 2>/dev/null || echo "Pull failed — FastAPI will surface a 503 until the model is available."
fi

echo "Starting FastAPI app on port $PORT..."
echo "Environment: PORT=$PORT, MODEL=$MODEL, OLLAMA_NUM_PARALLEL=$OLLAMA_NUM_PARALLEL, OLLAMA_NUM_THREADS=$OLLAMA_NUM_THREADS"
echo "Checking if dist folder exists: $(ls -la /app/dist 2>&1 || echo 'dist not found')"
exec python3 -m uvicorn app:app --host 0.0.0.0 --port "$PORT" --log-level info
