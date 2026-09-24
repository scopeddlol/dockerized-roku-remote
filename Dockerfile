# syntax=docker/dockerfile:1

# ---- 1. Build the web UI --------------------------------------------------
# The output is plain HTML/JS/CSS, identical on every platform, so build it on
# the native build machine even when producing an arm64 image (no emulation).
FROM --platform=$BUILDPLATFORM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build && mkdir -p /empty-data

# ---- 2. Runtime: stdlib-only Python server + the built UI -------------------
FROM python:3.13-alpine
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    DATA_DIR=/data \
    STATIC_DIR=/app/web

# No RUN steps in this stage: nothing executes inside the target platform,
# so arm64 images build without emulation. /data is created owned by the
# unprivileged uid the server runs as.
WORKDIR /app
COPY backend/ ./backend/
COPY --from=web /web/dist ./web/
COPY --from=web --chown=1000:1000 /empty-data /data

USER 1000:1000
VOLUME ["/data"]
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/api/health', timeout=2)"
CMD ["python", "backend/server.py"]
