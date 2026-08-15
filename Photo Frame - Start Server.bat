@echo off
setlocal enabledelayedexpansion
title Photo Frame 6 - Server
echo ============================================================
echo   Photo Frame 6 - Starting Server...
echo ============================================================
cd /d "%~dp0backend"

:: 1. Use Virtual Environment if available
if exist "%~dp0venv\Scripts\python.exe" (
    "%~dp0venv\Scripts\python.exe" main.py
    goto :server_end
)

:: 2. Fallback to system Python if venv not yet created
echo [INFO] Virtual environment not found. Attempting to use system Python...
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

if not defined PYTHON_CMD (
    echo.
    echo [ERROR] No working Python environment found.
    echo Please run "Photo Frame - Install.bat" to set up the application.
    echo.
    pause
    exit /b 1
)

%PYTHON_CMD% main.py

:server_end
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server stopped with an error code: %ERRORLEVEL%
    pause
)
