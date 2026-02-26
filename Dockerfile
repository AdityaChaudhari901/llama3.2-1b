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
# Stage 2: Build Python Dependencies
# Use ubuntu:22.04 to match the ollama/ollama base OS so
# compiled packages are binary-compatible.
# ============================================================
FROM ubuntu:22.04 AS backend-builder
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        gcc \
        libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Backend/requirements.txt .

# Install into /install prefix — no PEP 668, no system pip conflict
RUN pip3 install --no-cache-dir --prefix=/install -r requirements.txt

# ============================================================
# Stage 3: Runtime
# ollama/ollama:latest (Ubuntu 22.04) already contains the
# ollama binary — NO curl/install.sh needed at all.
# This eliminates the Kaniko OOM snapshot spike entirely.
# ============================================================
FROM ollama/ollama:latest
ENV DEBIAN_FRONTEND=noninteractive

# Only need python3 — no pip required in runtime stage
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python packages from builder (binary-compatible: both Ubuntu 22.04)
COPY --from=backend-builder /install /usr/local

# Application code
COPY Backend/app.py .

# Built React frontend served by FastAPI as static files
COPY --from=frontend-builder /app/frontend/dist ./dist

# Runtime environment
ENV PORT=8080 \
    MODEL=llama3.2:1b \
    OLLAMA_HOST=0.0.0.0:11434 \
    PYTHONUNBUFFERED=1

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"

CMD ["python3", "app.py"]