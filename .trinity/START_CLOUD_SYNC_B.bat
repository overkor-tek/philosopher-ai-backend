@echo off
title Trinity Cloud Sync - Computer B
echo.
echo ════════════════════════════════════════════════════
echo   TRINITY CLOUD SYNC - COMPUTER B
echo   Syncing with Computers A ^& C every 30 seconds
echo ════════════════════════════════════════════════════
echo.
cd /d C:\Users\Darrick\.trinity
node cloud_sync_computer_b.js
pause
