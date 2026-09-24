# syntax=docker/dockerfile:1

# ---- 1. Build the web UI --------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# ---- 2. Runtime: stdlib-only Python server + the built UI -------------------
FROM python:3.13-alpine
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    DATA_DIR=/data \
    STATIC_DIR=/app/web

WORKDIR /app
RUN adduser -D -u 1000 remote && mkdir -p /data && chown remote /data
COPY backend/ ./backend/
COPY --from=web /web/dist ./web/

USER remote
VOLUME ["/data"]
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/api/health', timeout=2)"
CMD ["python", "backend/server.py"]
