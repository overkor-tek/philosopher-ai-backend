@echo off
REM ===================================================================
REM START MONITORING SYSTEM
REM ===================================================================
REM Purpose: Continuous backend health monitoring with alerts
REM ===================================================================

echo ===================================================================
echo MONITORING AUTOMATION SYSTEM
echo ===================================================================
echo.
echo This will start continuous monitoring of your deployed backend.
echo.
echo Features:
echo - Health checks every 5 minutes (default)
echo - Automatic alerts for issues
echo - Metrics tracking
echo - Uptime calculation
echo.
echo Backend: https://cloud-funnel-production.up.railway.app/api/v1
echo Log File: %~dp0monitoring_log.txt
echo Metrics: %~dp0metrics_data.json
echo.
echo Press any key to start monitoring...
pause >nul

echo.
echo Starting monitoring system...
echo.
echo Press Ctrl+C to stop monitoring and see metrics summary.
echo.

node "%~dp0MONITORING_AUTOMATION.js"
