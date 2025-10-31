@echo off
echo ========================================
echo      ParrotKeeper Backend Startup
echo ========================================
echo.

:: Check if Python 3.10 is installed
D:\Python310\python.exe --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python 3.10 not found, please install Python 3.10 first
    pause
    exit /b 1
)

:: Set Python path to 3.10
set PYTHON_PATH=D:\Python310\python.exe

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
    "%PYTHON_PATH%" -m venv venv
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

:: Load .env into environment variables (simple KEY=VALUE parser)
if exist ".env" (
    echo [INFO] Loading .env configuration...
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "_key=%%A"
        setlocal enabledelayedexpansion
        set "_first=!_key:~0,1!"
        endlocal & set "_first=%_first%"
        if not "%_key%"=="" if not "%_first%"=="#" (
            set "%%A=%%B"
        )
    )
) else (
    echo [WARNING] .env config file not found, using defaults
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

:: Start backend service with Waitress production server
echo.
echo [INFO] Preparing to start backend with Waitress (production)...
echo ========================================
REM Set production environment for Flask config
set FLASK_ENV=production
REM Tune Waitress threads and connection backlog for higher concurrency
if not defined WAITRESS_THREADS set WAITRESS_THREADS=16
if not defined WAITRESS_BACKLOG set WAITRESS_BACKLOG=1024
REM Determine host/port from environment or defaults
if not defined HOST set HOST=0.0.0.0
REM 优先使用.env文件中设置的PORT变量，然后是BACKEND_PORT，最后是默认值5075
REM 重新设置PORT_VAR以确保读取到环境变量
set PORT_VAR=%PORT%
if "%PORT_VAR%"=="" set PORT_VAR=%BACKEND_PORT%

REM Start using Waitress WSGI server, calling the app factory
echo [INFO] Starting on %HOST%:%PORT_VAR%
waitress-serve --host=%HOST% --port=%PORT_VAR% --threads=%WAITRESS_THREADS% --backlog=%WAITRESS_BACKLOG% --call app:create_app

:: If service exits unexpectedly, pause to view error info
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend service failed to start or exited unexpectedly
    echo Error code: %errorlevel%
)

echo.
echo Press any key to exit...
pause >nul