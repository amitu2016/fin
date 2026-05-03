#!/bin/bash
set -e

# Navigate to the project root (relative to this script)
cd "$(dirname "$0")/.."

# Check for .env file
if [ ! -f .env ]; then
    echo "Warning: .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "Please edit .env with your configuration (e.g., OPENROUTER_API_KEY)."
fi

# Build and start the containers
echo "Starting Finally services..."
docker compose up --build -d

echo "Finally is running at http://localhost:8000"
