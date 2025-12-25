#!/usr/bin/env bash
set -e

PROJECT_ROOT="/opt/ParrotKeeper"
BACKEND_DIR="$PROJECT_ROOT/backend"
PYTHON_BIN="python3"

export DB_HOST="127.0.0.1"
export DB_PORT="3306"
export DB_USER="mysql"
export DB_PASSWORD="12345678"
export DB_NAME="parrot_breeding"

export FLASK_ENV="production"
export HOST="0.0.0.0"
export PORT="5075"

mkdir -p "$PROJECT_ROOT/logs"

cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
  "$PYTHON_BIN" -m venv venv
fi
. venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "ParrotKeeper backend started: http://$HOST:$PORT"
exec "$BACKEND_DIR/venv/bin/waitress-serve" \
  --listen="$HOST:$PORT" --call 'app:create_app'
