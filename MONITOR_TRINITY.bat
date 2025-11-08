@echo off
REM ===================================================
REM TRINITY STATUS MONITOR - Real-time Dashboard
REM ===================================================
REM Shows active instances, tasks, and system health
REM Refreshes every 10 seconds
REM ===================================================

echo.
echo ===================================================
echo TRINITY STATUS MONITOR
echo ===================================================
echo.
echo Starting real-time monitoring...
echo Press Ctrl+C to stop
echo.

cd /d "%~dp0"

python trinity_status.py --watch --interval 10

pause
