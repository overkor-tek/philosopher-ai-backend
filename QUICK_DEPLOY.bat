@echo off
REM ===================================================
REM QUICK DEPLOY - Git Commit and Push to Railway
REM ===================================================
REM This script commits all changes and pushes to GitHub
REM Railway will auto-deploy within 2 minutes
REM ===================================================

echo.
echo ===================================================
echo QUICK DEPLOY TO RAILWAY
echo ===================================================
echo.

cd /d "%~dp0"

REM Check for changes
echo Checking for changes...
git status

echo.
echo ===================================================
set /p COMMIT_MSG="Enter commit message (or press Enter for default): "

if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=Quick deployment update
)

echo.
echo Staging all changes...
git add .

echo.
echo Committing...
git commit -m "%COMMIT_MSG%"

if errorlevel 1 (
    echo.
    echo No changes to commit or commit failed.
    pause
    exit /b 1
)

echo.
echo Pushing to GitHub (triggers Railway auto-deploy)...
git push origin main

if errorlevel 1 (
    echo.
    echo Push failed! Check your connection and credentials.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo ✅ DEPLOYMENT TRIGGERED
echo ===================================================
echo.
echo Railway is now deploying your changes...
echo This usually takes 1-2 minutes.
echo.
echo Monitor deployment:
echo 1. Run: railway logs
echo 2. Visit: https://railway.app
echo.
echo Backend URL: https://cloud-funnel-production.up.railway.app
echo.
pause
