@echo off
setlocal enabledelayedexpansion
title Photo Frame 6 - Server
echo ============================================================
echo   Photo Frame 6 - Starting Server...
echo ============================================================
cd /d "%~dp0backend"

:: Detect Python
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

if not defined PYTHON_CMD set "PYTHON_CMD=python"

%PYTHON_CMD% main.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server stopped with an error code: %ERRORLEVEL%
    pause
)
