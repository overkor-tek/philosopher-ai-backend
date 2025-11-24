@echo off
REM ================================================
REM RAILWAY DEPLOYMENT SCRIPT
REM ================================================
REM Quick deploy to Railway via CLI
REM ================================================

echo.
echo ================================================
echo   RAILWAY DEPLOYMENT - PRODUCTION BACKEND
echo ================================================
echo.

REM Check if Railway CLI is installed
where railway >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Railway CLI not found
    echo.
    echo Install Railway CLI:
    echo   npm install -g @railway/cli
    echo.
    echo Or deploy via GitHub integration:
    echo   1. Push to GitHub
    echo   2. Connect repo in Railway dashboard
    echo   3. Railway auto-deploys
    echo.
    pause
    exit /b 1
)

echo [1/5] Checking Railway authentication...
railway whoami
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [INFO] Not logged in. Starting Railway login...
    railway login
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Railway login failed
        pause
        exit /b 1
    )
)

echo.
echo [2/5] Checking project link...
railway status
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Not linked to a Railway project
    echo.
    echo Options:
    echo   1. Link existing project: railway link
    echo   2. Create new project: railway init
    echo.
    set /p choice="Enter choice (1 or 2): "

    if "%choice%"=="1" (
        railway link
    ) else if "%choice%"=="2" (
        railway init
    ) else (
        echo [ERROR] Invalid choice
        pause
        exit /b 1
    )
)

echo.
echo [3/5] Verifying environment variables...
echo.
echo CRITICAL: Ensure these are set in Railway dashboard:
echo   - JWT_SECRET (64+ character hex string)
echo   - DATABASE_URL (auto-set by Railway PostgreSQL)
echo   - ALLOWED_ORIGINS (your frontend domain)
echo   - NODE_ENV=production
echo.
echo Optional:
echo   - STRIPE_SECRET_KEY
echo   - ANTHROPIC_API_KEY
echo   - SENDGRID_API_KEY
echo.
set /p confirm="Have you set required environment variables in Railway? (y/n): "

if /i not "%confirm%"=="y" (
    echo.
    echo [ACTION REQUIRED]
    echo 1. Go to Railway dashboard: https://railway.app/
    echo 2. Select your project
    echo 3. Click "Variables" tab
    echo 4. Add required variables
    echo 5. Run this script again
    echo.
    pause
    exit /b 0
)

echo.
echo [4/5] Deploying to Railway...
echo.
railway up

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Deployment failed
    echo.
    echo Troubleshooting:
    echo   - Check Railway logs: railway logs
    echo   - Verify environment variables are set
    echo   - Ensure package.json has start:production script
    echo.
    pause
    exit /b 1
)

echo.
echo [5/5] Running database migrations...
echo.
railway run npm run db:migrate

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Migration failed or already completed
    echo Check Railway logs: railway logs
    echo.
)

echo.
echo ================================================
echo   DEPLOYMENT COMPLETE
echo ================================================
echo.
echo Next steps:
echo   1. Check deployment: railway open
echo   2. View logs: railway logs
echo   3. Test health: curl your-app.railway.app/api/health
echo.
echo Railway dashboard: https://railway.app/
echo.
pause
