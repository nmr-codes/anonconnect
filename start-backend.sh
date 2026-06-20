#!/usr/bin/env bash
# ============================================================
#  AnonConnect — Start Backend
#  Make executable: chmod +x start-backend.sh
# ============================================================
set -e

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"

echo "🚀 Starting AnonConnect backend..."
echo "📁 Directory: $BACKEND_DIR"

# Check Redis
if ! command -v redis-cli &>/dev/null; then
  echo "⚠️  Redis not found. Install with: sudo apt install redis-server"
  exit 1
fi

# Start Redis if not running
if ! redis-cli ping &>/dev/null; then
  echo "⏫ Starting Redis..."
  redis-server --daemonize yes
fi
echo "✅ Redis is running"

# Activate venv
if [ ! -d "$BACKEND_DIR/.venv" ]; then
  echo "📦 Creating virtualenv..."
  python3 -m venv "$BACKEND_DIR/.venv"
  "$BACKEND_DIR/.venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt" -q
fi

source "$BACKEND_DIR/.venv/bin/activate"

# Copy env if not present
if [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "📝 Created backend/.env from example — fill in your values!"
fi

echo ""
echo "🌐 FastAPI: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""

cd "$BACKEND_DIR"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
