@echo off
title Photo Frame 6  Server
echo ============================================================
echo   Photo Frame 6 - Starting Server...
echo ============================================================
cd /d "%~dp0backend"
python main.py
pause
