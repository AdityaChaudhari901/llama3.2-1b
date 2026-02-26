# ============================================================
# Stage 1: Build Frontend
# ============================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY Frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY Frontend/ ./
ENV VITE_API_URL=""
RUN npm run build

# ============================================================
# Stage 2: Build Backend Python Dependencies
# ============================================================
FROM python:3.11-slim AS backend-builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY Backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ============================================================
# Stage 3: Runtime Image
# ============================================================
FROM python:3.11-slim
WORKDIR /app

# Install curl + zstd (required by ollama installer) + ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        zstd \
        ca-certificates \
    && curl -fsSL https://ollama.com/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

# Python packages from backend builder (no PEP 668 issues)
COPY --from=backend-builder /install /usr/local

# Application code (Backend)
COPY Backend/app.py .

# Frontend static files served by FastAPI
COPY --from=frontend-builder /app/frontend/dist ./dist

# Runtime environment
ENV PORT=8080 \
    MODEL=llama3.2:1b \
    OLLAMA_HOST=0.0.0.0:11434 \
    PYTHONUNBUFFERED=1

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"

CMD ["python3", "app.py"]