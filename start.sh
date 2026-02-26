#!/bin/bash
set -e

echo "Starting Ollama server..."
# Start Ollama in the background
OLLAMA_HOST=127.0.0.1:11434 ollama serve &
OLLAMA_PID=$!



echo "Starting FastAPI app on port 8080..."
# Start FastAPI in the foreground
exec uvicorn app:app --host 0.0.0.0 --port 8080
