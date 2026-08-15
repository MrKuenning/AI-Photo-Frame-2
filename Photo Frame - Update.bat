@echo off
setlocal enabledelayedexpansion
title Photo Frame 6 - Update from GitHub
echo ============================================================
echo   Photo Frame 6 - Updating from GitHub...
echo ============================================================

cd /d "%~dp0"

echo.
echo [1/3] Pulling latest code from GitHub...
git pull
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Git pull failed. Please check your internet connection or git status.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

:: Python environment detection & dependencies
echo.
echo [2/3] Checking Python dependencies...
if exist "%~dp0venv\Scripts\python.exe" (
    "%~dp0venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
) else (
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
                    set "PYTHON_CMD="%%~D\python.exe""
                )
            )
        )
    )
    if not defined PYTHON_CMD set "PYTHON_CMD=python"
    %PYTHON_CMD% -m pip install -r backend\requirements.txt
)
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Python dependencies installation encountered an issue.
)

echo.
echo [3/3] Checking Frontend assets...
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
    echo Compiling latest frontend assets...
    cd /d "%~dp0frontend"
    call !NPM_CMD! install
    call !NPM_CMD! run build
    cd /d "%~dp0"
) else (
    if exist "%~dp0frontend\dist\index.html" (
        echo [OK] Pre-compiled frontend assets updated from repository.
    ) else (
        echo [INFO] Using existing pre-compiled frontend assets.
    )
)

echo.
echo ============================================================
echo   Update Complete!
echo   Run "Photo Frame - Start Server.bat" to start the application.
echo ============================================================
pause
