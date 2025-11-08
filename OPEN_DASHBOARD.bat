@echo off
REM ===================================================
REM TRINITY DASHBOARD - Web-based Command Center
REM ===================================================
REM Opens the Trinity dashboard in your default browser
REM Auto-refreshes every 10 seconds
REM ===================================================

echo.
echo ===================================================
echo TRINITY COMMAND CENTER DASHBOARD
echo ===================================================
echo.
echo Opening dashboard in your browser...
echo.

start "" "%~dp0trinity_dashboard.html"

echo.
echo Dashboard opened!
echo.
echo Features:
echo - Real-time backend status
echo - Active Trinity instances
echo - Task overview and top priority tasks
echo - Auto-refresh every 10 seconds
echo - Quick action buttons
echo.
pause
