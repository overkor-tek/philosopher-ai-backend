@echo off
echo.
echo ========================================
echo   TRINITY MESSAGING PROTOCOL v2.0
echo ========================================
echo.
echo Starting Trinity communication systems...
echo.

REM Start Auto-Sync (pulls/pushes every 30s)
echo [1/2] Starting Auto-Sync System...
start "Trinity Auto-Sync" cmd /k "node trinity_auto_sync.js"
timeout /t 2 /nobreak > nul

REM Start Inbox Watcher (checks for messages every 15s)
echo [2/2] Starting Inbox Watcher...
start "Trinity Inbox Watcher" cmd /k "node trinity_inbox_watcher.js"
timeout /t 2 /nobreak > nul

echo.
echo ========================================
echo   TRINITY MESSAGING SYSTEMS ACTIVE
echo ========================================
echo.
echo Auto-Sync:     Running (30s interval)
echo Inbox Watcher: Running (15s interval)
echo.
echo Two new windows opened - minimize them to run in background
echo.
echo To send a message:
echo   node trinity_send_message.js C2_Architect "Subject" "Body"
echo.
echo To stop: Close the 2 background windows
echo.
pause
