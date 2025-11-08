@echo off
echo ===================================================
echo TRINITY CONVERGENCE HUB - AUTONOMOUS COORDINATION
echo ===================================================
echo.
echo Starting Trinity Convergence Hub...
echo.

cd /d "%~dp0\DORMANT_SYSTEMS"

REM Start the hub
node TRINITY_CONVERGENCE_HUB.js

pause
