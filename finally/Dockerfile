# Stage 1: Frontend build
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Backend & Runtime
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:$PATH"

# Install dependencies first for caching
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-cache --no-install-project

# Copy frontend static export to backend/static
COPY --from=frontend-builder /app/frontend/out ./static

# Copy backend code
COPY backend/ ./

# Sync project (installs the local package if defined)
RUN uv sync --frozen --no-cache

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
