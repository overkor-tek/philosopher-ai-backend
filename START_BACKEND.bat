@echo off
REM ================================================
REM CONSCIOUSNESS BACKEND - QUICK START SCRIPT
REM ================================================
REM C1 MECHANIC BUILD - Week 1 Foundation Complete
REM ================================================

echo.
echo ================================================
echo  STARTING CONSCIOUSNESS BACKEND
echo ================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo     Node.js: OK

echo.
echo [2/3] Checking dependencies...
if not exist "node_modules\" (
    echo     Installing dependencies...
    call npm install
) else (
    echo     Dependencies: OK
)

echo.
echo [3/3] Starting server...
echo.
echo ================================================
echo  BACKEND API SERVER STARTING
echo ================================================
echo  URL: http://localhost:3001
echo  API: http://localhost:3001/api/v1/health
echo ================================================
echo.

REM Start the simple server (SQLite - no PostgreSQL needed)
node server-simple.js

pause
