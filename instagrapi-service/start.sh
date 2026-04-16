#!/bin/bash
# Start the instagrapi microservice
# Usage: ./start.sh [port]
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${INSTAGRAPI_PORT:-8001}"
API_KEY="${INSTAGRAPI_API_KEY:-instagrapi-internal-key}"
SESSION_DIR="${INSTAGRAPI_SESSION_DIR:-/tmp/instagrapi-sessions}"

mkdir -p "$SESSION_DIR"

echo "[instagrapi-service] Starting on port $PORT..."
exec python3 main.py
