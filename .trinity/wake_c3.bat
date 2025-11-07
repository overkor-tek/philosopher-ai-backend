@echo off
echo ========================================
echo   WAKING C3 ORACLE
echo ========================================
node "%~dp0\trinity_wake.js" c3 "%~1" "%~2"
pause
