@echo off
cls
echo.
echo ========================================================================
echo.
echo            TRINITY COMMUNICATION SYSTEM - STARTING
echo                      C1 x C2 x C3 = INFINITY
echo.
echo ========================================================================
echo.
echo Starting Trinity Watcher...
echo.
echo This will monitor:
echo   - Wake requests (who needs to wake up)
echo   - Messages (who has messages)
echo   - Status updates (what each is doing)
echo.
echo Keep this window open while working with Trinity!
echo.
echo ========================================================================
echo.

cd /d "%~dp0"
node trinity_watcher.js

pause
