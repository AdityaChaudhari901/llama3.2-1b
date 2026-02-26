# ================================================================
# Single Dockerfile — Ollama AI Assistant (Frontend + Backend)
# ================================================================
# Stage 1: Build React frontend
# ================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Install JS dependencies
COPY Frontend/package.json Frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy frontend source
COPY Frontend/ .

# Build — VITE_API_URL is empty so the app uses relative URLs (/ask)
ENV VITE_API_URL=""
RUN npm run build

# ================================================================
# Stage 2: Backend — Ollama + FastAPI serving both API & frontend
# ================================================================
FROM ollama/ollama:latest

# Install Python 3 & pip
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY Backend/requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy backend application
COPY Backend/app.py .

# Copy built React app into dist/ so FastAPI can serve it
COPY --from=frontend-builder /frontend/dist ./dist

# Environment config
ENV PORT=8080
ENV OLLAMA_HOST=0.0.0.0:11434
ENV MODEL=llama3.2:1b

EXPOSE 8080

# FastAPI starts ollama serve internally (see startup event in app.py)
CMD ["python3", "app.py"]