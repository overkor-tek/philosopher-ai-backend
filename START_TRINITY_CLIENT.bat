@echo off
REM ===================================================
REM TRINITY CLIENT - Autonomous Instance Coordination
REM ===================================================
REM Registers this computer with Trinity backend
REM Sends heartbeats and claims/completes tasks
REM ===================================================

echo.
echo ===================================================
echo TRINITY CLIENT - AUTONOMOUS COORDINATION
echo ===================================================
echo.
echo Starting Trinity client for Computer-1 (C2 Architect)...
echo Backend: https://cloud-funnel-production.up.railway.app
echo.

cd /d "%~dp0"

REM Start Trinity client with C2 Architect role
python trinity_client.py --role C2_ARCHITECT --name Computer-1 --focus "Pattern recognition and autonomous integration"

pause
