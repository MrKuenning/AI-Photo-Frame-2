@echo off
setlocal enabledelayedexpansion
title Photo Frame 6 - Installation and Setup
echo ============================================================
echo   Photo Frame 6 - Installation and Setup
echo ============================================================
echo.

cd /d "%~dp0"

:: 1. Detect Python
echo [1/3] Checking Python environment...
set "PYTHON_CMD="

py -3 -c "import sys" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PYTHON_CMD=py -3"
) else (
    python -c "import sys" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set "PYTHON_CMD=python"
    ) else (
        for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*" "C:\Program Files\Python3*" "C:\Python3*") do (
            if exist "%%~D\python.exe" (
                set "PYTHON_CMD=%%~D\python.exe"
            )
        )
    )
)

if not defined PYTHON_CMD (
    echo.
    echo [ERROR] Working Python installation was not detected.
    echo Please install Python 3.10, 3.11, or 3.12 from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('%PYTHON_CMD% -c "import sys; print(f'Found Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"') do echo %%v

:: 2. Install Python Dependencies
echo.
echo [2/3] Installing Python dependencies...
%PYTHON_CMD% -m pip install --upgrade pip
%PYTHON_CMD% -m pip install -r backend\requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Some Python dependencies had installation warnings.
)

:: Create initial config.ini if needed
if not exist "config.ini" (
    echo.
    echo [INFO] Creating initial config.ini from config-example.ini...
    copy config-example.ini config.ini >nul
    echo config.ini created.
)

:: 3. Setup Frontend
echo.
echo [3/3] Setting up Frontend UI assets...

if exist "%~dp0frontend\dist\index.html" (
    echo [OK] Pre-compiled frontend assets found and ready to use!
) else (
    set "NPM_CMD="

    npm.cmd --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set "NPM_CMD=npm.cmd"
    ) else (
        npm --version >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            set "NPM_CMD=npm"
        ) else (
            if exist "C:\Program Files\nodejs\npm.cmd" (
                set "PATH=C:\Program Files\nodejs;%PATH%"
                set "NPM_CMD=npm.cmd"
            )
        )
    )

    if defined NPM_CMD (
        echo Compiling frontend assets...
        cd /d "%~dp0frontend"
        call !NPM_CMD! install
        call !NPM_CMD! run build
        cd /d "%~dp0"
    ) else (
        echo [WARNING] Pre-compiled assets not found and npm was not detected.
        echo Please install Node.js from https://nodejs.org/ if you need to build from source.
    )
)

echo.
echo ============================================================
echo   Installation and Setup Complete!
echo.
echo   Next Steps:
echo   1. Edit "config.ini" to set your custom image folder path.
echo   2. Run "Start Server.bat" to start the application.
echo ============================================================
pause
