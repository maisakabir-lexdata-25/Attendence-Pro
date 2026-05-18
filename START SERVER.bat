@echo off
title Attendance Pro - Live Server
echo.
echo  =============================================
echo   Attendance Pro - Starting Live Server...
echo  =============================================
echo.
echo  Stopping any old server on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo  Starting server from backend folder...
echo.
cd /d "%~dp0backend"
node server.js

echo.
echo  Server stopped. Press any key to close.
pause >nul
