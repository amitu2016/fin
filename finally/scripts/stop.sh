#!/bin/bash
set -e

# Navigate to the project root (relative to this script)
cd "$(dirname "$0")/.."

echo "Stopping Finally services..."
docker compose down

echo "Finally services stopped."
