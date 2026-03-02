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

# Detached subshell to pull the model asynchronously so uvicorn binds instantly
(
  echo "Waiting for Ollama to be ready..."
  sleep 5
  echo "Pulling model $MODEL in the background..."
  ollama pull $MODEL
) &

echo "Starting FastAPI app on port 8080..."
echo "Environment: PORT=$PORT, MODEL=$MODEL"
echo "Checking if dist folder exists: $(ls -la /app/dist 2>&1 || echo 'dist not found')"
echo "About to start uvicorn..."
exec python3 -m uvicorn app:app --host 0.0.0.0 --port 8080 --log-level debug
