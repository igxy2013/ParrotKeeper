#!/usr/bin/env bash
set -e

PROJECT_ROOT="/opt/ParrotKeeper"
BACKEND_DIR="$PROJECT_ROOT/backend"
WEB_DIR="$PROJECT_ROOT/web"
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

# 1. 后端环境准备
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
  "$PYTHON_BIN" -m venv venv
fi
. venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 2. 前端构建
cd "$WEB_DIR"
npm install
npm run build

# 3. 启动前端预览（后台）
cd "$WEB_DIR"
nohup npm run preview -- --host 0.0.0.0 --port 4173 \
  > "$PROJECT_ROOT/logs/web.log" 2>&1 &
WEB_PID=$!

# 4. 启动后端（前台运行，保持脚本不退出）
cd "$BACKEND_DIR"
. venv/bin/activate
echo "ParrotKeeper started. Backend: http://0.0.0.0:5075  Web: http://0.0.0.0:4173"
exec "$BACKEND_DIR/venv/bin/waitress-serve" \
  --listen=0.0.0.0:5075 --call 'app:create_app'