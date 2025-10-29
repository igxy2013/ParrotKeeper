@echo off
echo ========================================
echo      ParrotKeeper Backend Startup
echo ========================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found, please install Python first
    pause
    exit /b 1
)
:: Switch to backend directory
cd /d "%~dp0backend"
if %errorlevel% neq 0 (
    echo [ERROR] Cannot switch to backend directory
    pause
    exit /b 1
)
git pull
:: Check if virtual environment exists
if not exist "venv" (
    echo [INFO] Virtual environment not found, creating...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [SUCCESS] Virtual environment created
)

:: Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)

:: Check requirements.txt and install dependencies
if exist "requirements.txt" (
    echo [INFO] Installing dependencies...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [WARNING] Dependencies installation may have issues, but continuing...
    )
) else (
    echo [WARNING] requirements.txt not found
)

:: Check .env file
if not exist ".env" (
    echo [WARNING] .env config file not found, please ensure database config is correct
)

:: Start backend service with Waitress production server
echo.
echo [INFO] Preparing to start backend with Waitress (production)...
echo ========================================
REM Set production environment for Flask config
set FLASK_ENV=production
REM Start using Waitress WSGI server, calling the app factory
waitress-serve --host=0.0.0.0 --port=5075 --call app:create_app

:: If service exits unexpectedly, pause to view error info
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend service failed to start or exited unexpectedly
    echo Error code: %errorlevel%
)

echo.
echo Press any key to exit...
pause >nul
