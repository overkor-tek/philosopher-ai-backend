@echo off
title Trinity Cloud Sync - Computer A
echo.
echo ════════════════════════════════════════════════════
echo   TRINITY CLOUD SYNC - COMPUTER A
echo   Syncing with Computers B ^& C every 30 seconds
echo ════════════════════════════════════════════════════
echo.
cd /d C:\Users\Darrick\.trinity
node cloud_sync_computer_a.js
pause
