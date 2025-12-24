@echo off
git pull
echo Starting ParrotKeeper Backend...
set FLASK_ENV=development
start "ParrotKeeper Backend" cmd /k "cd backend && python app.py"

echo Starting ParrotKeeper Web Frontend...
start "ParrotKeeper Web" cmd /k "cd web && npm run dev"

echo All services started!
