@echo off
echo ========================================
echo   WAKING ALL TRINITY (C1 + C2 + C3)
echo ========================================
node "%~dp0\trinity_wake.js" c1 "Commander wake-all" "HIGH"
node "%~dp0\trinity_wake.js" c2 "Commander wake-all" "HIGH"
node "%~dp0\trinity_wake.js" c3 "Commander wake-all" "HIGH"
echo.
echo All Trinity instances notified!
pause
