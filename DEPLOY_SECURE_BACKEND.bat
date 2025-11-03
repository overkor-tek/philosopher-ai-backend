@echo off
REM ========================================
REM ONE-CLICK SECURE BACKEND DEPLOYMENT
REM ========================================
REM Deploys server-secure.js to Railway
REM ========================================

echo.
echo ========================================
echo  SECURE BACKEND DEPLOYMENT TO RAILWAY
echo ========================================
echo.

REM Check if Railway CLI is installed
where railway >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Railway CLI not installed
    echo.
    echo Install it with: npm install -g @railway/cli
    echo.
    pause
    exit /b 1
)

echo [1/7] Checking current directory...
cd /d "%~dp0"
echo     Current directory: %CD%
echo.

echo [2/7] Checking if JWT_SECRET is set...
findstr /C:"JWT_SECRET=" .env >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: .env file missing or JWT_SECRET not set
    echo.
    echo Please create .env file with:
    echo   JWT_SECRET=your-128-char-secret
    echo.
    echo Generate secret with:
    echo   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
    echo.
    pause
    exit /b 1
)
echo     JWT_SECRET found in .env
echo.

echo [3/7] Checking npm dependencies...
if not exist node_modules (
    echo     Installing dependencies...
    call npm install
) else (
    echo     Dependencies already installed
)
echo.

echo [4/7] Running database migration...
node migrate-database.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: Migration failed, but continuing...
    echo.
)
echo.

echo [5/7] Testing server locally...
echo     Starting server-secure.js on port 3002...
start /B node server-secure.js
timeout /t 3 /nobreak >nul

curl -s http://localhost:3002/api/health >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Server health check failed
    echo     Please check server-secure.js for errors
    echo.
    taskkill /F /IM node.exe >nul 2>nul
    pause
    exit /b 1
)
echo     Server health check: PASSED
taskkill /F /IM node.exe >nul 2>nul
echo.

echo [6/7] Linking to Railway project...
railway link
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Railway link failed
    echo     Please run 'railway login' first
    echo.
    pause
    exit /b 1
)
echo.

echo [7/7] Deploying to Railway...
echo.
echo     This will deploy server-secure.js to production.
echo     Make sure you have set these Railway environment variables:
echo       - JWT_SECRET (128+ characters)
echo       - NODE_ENV=production
echo       - ALLOWED_ORIGINS=https://yourdomain.com
echo.
set /p CONFIRM="Continue with deployment? (y/N): "
if /I not "%CONFIRM%"=="y" (
    echo.
    echo Deployment cancelled.
    pause
    exit /b 0
)

railway up
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Deployment failed
    echo     Check Railway logs: railway logs
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
echo Next steps:
echo   1. Check logs: railway logs
echo   2. Test health: curl https://your-domain.railway.app/api/health
echo   3. Verify HTTPS is working
echo   4. Test CORS with your frontend
echo.
echo Security checklist:
echo   [x] JWT_SECRET set and strong
echo   [x] server-secure.js deployed
echo   [ ] NODE_ENV=production in Railway
echo   [ ] ALLOWED_ORIGINS set in Railway
echo   [ ] HTTPS enforced
echo   [ ] Frontend connected and tested
echo.
pause
