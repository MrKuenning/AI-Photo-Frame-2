@echo off
title Photo Frame 6 - Build
echo ============================================================
echo   Photo Frame 6 - Building Frontend...
echo ============================================================

cd /d "%~dp0frontend"
call npm run build

echo.
echo ============================================================
echo   Build Complete.
echo   Run "Start Server.bat" to start the production server.
echo ============================================================
pause
