DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if [ -f ".env" ]; then
  set -a
  . ./.env
  set +a
fi

export FLASK_ENV=production

BACKEND_HOST="${HOST:-0.0.0.0}"
BACKEND_PORT="${PORT:-5075}"
FRONTEND_HOST="${WEB_HOST:-0.0.0.0}"
FRONTEND_PORT="${WEB_PORT:-4173}"

cd "$DIR/backend"
mkdir -p logs
waitress-serve --call app:create_app --listen="$BACKEND_HOST:$BACKEND_PORT" >"logs/backend.log" 2>&1 &

cd "$DIR/web"
mkdir -p logs
if [ ! -d "dist" ]; then
  npm run build
fi
npm run preview -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" >"logs/web.log" 2>&1 &

wait
