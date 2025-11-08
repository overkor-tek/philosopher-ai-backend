@echo off
REM ===================================================
REM START ALL AUTONOMOUS SYSTEMS
REM ===================================================
REM Starts Data Cyclotron + Trinity Hub + Monitoring
REM ===================================================

echo.
echo ===================================================
echo STARTING ALL AUTONOMOUS SYSTEMS
echo ===================================================
echo.

cd /d "%~dp0"

REM Set backend URL
set CYCLOTRON_BACKEND_URL=https://cloud-funnel-production.up.railway.app

echo Backend: %CYCLOTRON_BACKEND_URL%
echo.
echo Starting systems in separate windows...
echo.

REM Start Data Cyclotron
echo [1/3] Starting Data Cyclotron...
start "Data Cyclotron" cmd /k "cd /d %~dp0 && set CYCLOTRON_BACKEND_URL=%CYCLOTRON_BACKEND_URL% && python cyclotron_continuous_sync.py"
timeout /t 2 >nul

REM Start Trinity Hub
echo [2/3] Starting Trinity Convergence Hub...
start "Trinity Hub" cmd /k "cd /d %~dp0\DORMANT_SYSTEMS && node TRINITY_CONVERGENCE_HUB.js"
timeout /t 2 >nul

REM Start Health Monitor (if exists)
if exist "backend_health_monitor.js" (
    echo [3/3] Starting Health Monitor...
    start "Health Monitor" cmd /k "cd /d %~dp0 && node backend_health_monitor.js"
) else (
    echo [3/3] Health monitor not found, skipping...
)

echo.
echo ===================================================
echo ✅ ALL SYSTEMS STARTED
echo ===================================================
echo.
echo Running in separate windows:
echo - Data Cyclotron (knowledge ingestion)
echo - Trinity Hub (coordination)
echo - Health Monitor (system monitoring)
echo.
echo To stop: Close the respective windows
echo.
pause
