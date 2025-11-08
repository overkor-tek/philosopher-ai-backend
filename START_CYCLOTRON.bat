@echo off
echo ===================================================
echo DATA CYCLOTRON - AUTONOMOUS KNOWLEDGE SYSTEM
echo ===================================================
echo.
echo Starting Data Cyclotron backend connector...
echo Backend: https://cloud-funnel-production.up.railway.app
echo.

cd /d "%~dp0"

REM Set backend URL
set CYCLOTRON_BACKEND_URL=https://cloud-funnel-production.up.railway.app

REM Start continuous sync
echo Starting continuous knowledge sync...
python cyclotron_continuous_sync.py

pause
