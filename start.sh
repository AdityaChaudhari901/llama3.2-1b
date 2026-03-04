#!/bin/bash
set -e

echo "=========================================="
echo "Starting deployment at $(date)"
echo "Working directory: $(pwd)"
echo "Python version: $(python3 --version)"
echo "Files in /app: $(ls -la /app)"
echo "=========================================="

echo "Starting Ollama server..."
OLLAMA_HOST=127.0.0.1:11434 ollama serve &

# Wait for Ollama to be ready before proceeding
echo "Waiting for Ollama server to start..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "✅ Ollama server is ready!"
    break
  fi
  echo "Waiting for Ollama... ($i/30)"
  sleep 2
done

# Pull the model and wait for it to complete
echo "Pulling model $MODEL..."
ollama pull $MODEL
echo "✅ Model $MODEL is ready!"

echo "Starting FastAPI app on port 8080..."
echo "Environment: PORT=$PORT, MODEL=$MODEL"
echo "Checking if dist folder exists: $(ls -la /app/dist 2>&1 || echo 'dist not found')"
echo "About to start uvicorn..."
exec python3 -m uvicorn app:app --host 0.0.0.0 --port 8080 --log-level debug
