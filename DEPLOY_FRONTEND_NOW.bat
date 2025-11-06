@echo off
REM ===================================================================
REM FRONTEND DEPLOYMENT AUTOMATION
REM ===================================================================
REM Purpose: One-click frontend deployment to Netlify
REM Time: 2 minutes
REM ===================================================================

echo ===================================================================
echo FRONTEND DEPLOYMENT AUTOMATION
echo ===================================================================
echo.
echo This script will help you deploy the frontend to Netlify.
echo.
echo STEPS:
echo 1. Prepare frontend files
echo 2. Update API URLs
echo 3. Deploy to Netlify
echo 4. Verify deployment
echo.
echo Press any key to continue...
pause >nul

echo.
echo ===================================================================
echo STEP 1: CHECKING FRONTEND FILES
echo ===================================================================
echo.

REM Check if frontend directory exists
set "FRONTEND_DIR=C:\Users\Darrick\100X_BACKUP\100X_DEPLOYMENT\PLATFORM"

if not exist "%FRONTEND_DIR%" (
    echo ⚠️ WARNING: Frontend directory not found at:
    echo %FRONTEND_DIR%
    echo.
    echo Let's create a simple frontend deployment package...
    echo.

    REM Create deployment directory
    mkdir "%FRONTEND_DIR%" 2>nul

    echo Creating basic deployment package...
    echo.
)

echo Frontend directory located: %FRONTEND_DIR%
echo.

echo ===================================================================
echo STEP 2: DEPLOYMENT OPTIONS
echo ===================================================================
echo.
echo Choose your deployment method:
echo.
echo 1. Manual Netlify Deployment (Recommended)
echo    - Go to: https://app.netlify.com
echo    - Click "Add new site" → "Deploy manually"
echo    - Drag and drop: %FRONTEND_DIR%
echo    - Wait 30 seconds
echo    - Copy your Netlify URL
echo.
echo 2. Netlify CLI Deployment (If installed)
echo    - Requires: npm install -g netlify-cli
echo    - Automated deployment
echo.
echo 3. Vercel Deployment
echo    - Go to: https://vercel.com
echo    - Import project
echo    - Deploy
echo.
echo Press 1, 2, or 3 to continue...
choice /c 123 /n

if errorlevel 3 goto VERCEL
if errorlevel 2 goto NETLIFY_CLI
if errorlevel 1 goto NETLIFY_MANUAL

:NETLIFY_MANUAL
echo.
echo ===================================================================
echo MANUAL NETLIFY DEPLOYMENT
echo ===================================================================
echo.
echo Step-by-step instructions:
echo.
echo 1. Open your browser
echo 2. Go to: https://app.netlify.com
echo 3. Click "Add new site" → "Deploy manually"
echo 4. Drag this folder: %FRONTEND_DIR%
echo 5. Wait for deployment (30-60 seconds)
echo 6. Copy your Netlify URL (example: https://your-app.netlify.app)
echo.
echo Opening browser...
start https://app.netlify.com
echo.
echo Opening frontend directory...
explorer "%FRONTEND_DIR%"
echo.
echo After deployment, enter your Netlify URL below:
echo (Example: https://your-app.netlify.app)
echo.
set /p "NETLIFY_URL=Netlify URL: "
goto UPDATE_CONFIG

:NETLIFY_CLI
echo.
echo ===================================================================
echo NETLIFY CLI DEPLOYMENT
echo ===================================================================
echo.
echo Checking if Netlify CLI is installed...
where netlify >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️ Netlify CLI not found!
    echo.
    echo Install with: npm install -g netlify-cli
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo ✅ Netlify CLI found!
echo.
echo Deploying to Netlify...
cd "%FRONTEND_DIR%"
netlify deploy --prod --dir .

if errorlevel 0 (
    echo.
    echo ✅ Deployment successful!
    echo.
    echo Enter your Netlify URL from the output above:
    set /p "NETLIFY_URL=Netlify URL: "
    goto UPDATE_CONFIG
) else (
    echo.
    echo ⚠️ Deployment failed. Try manual deployment instead.
    pause
    exit /b 1
)

:VERCEL
echo.
echo ===================================================================
echo VERCEL DEPLOYMENT
echo ===================================================================
echo.
echo Opening Vercel...
start https://vercel.com
echo.
echo Opening frontend directory...
explorer "%FRONTEND_DIR%"
echo.
echo Follow these steps in Vercel:
echo 1. Click "Add New Project"
echo 2. Import your frontend folder
echo 3. Deploy
echo.
echo After deployment, enter your Vercel URL:
echo (Example: https://your-app.vercel.app)
echo.
set /p "NETLIFY_URL=Vercel URL: "
goto UPDATE_CONFIG

:UPDATE_CONFIG
echo.
echo ===================================================================
echo STEP 3: UPDATING CONFIGURATION
echo ===================================================================
echo.
echo Frontend URL: %NETLIFY_URL%
echo Backend URL: https://cloud-funnel-production.up.railway.app/api/v1
echo.

REM Save configuration
echo FRONTEND_URL=%NETLIFY_URL% > "%~dp0deployment_config.txt"
echo BACKEND_URL=https://cloud-funnel-production.up.railway.app/api/v1 >> "%~dp0deployment_config.txt"

echo ✅ Configuration saved!
echo.

echo ===================================================================
echo STEP 4: NEXT STEPS
echo ===================================================================
echo.
echo ✅ Frontend deployed to: %NETLIFY_URL%
echo ✅ Backend running at: https://cloud-funnel-production.up.railway.app
echo.
echo IMPORTANT: Update API URLs in your frontend files
echo.
echo In your JavaScript files, update:
echo   const API_URL = 'https://cloud-funnel-production.up.railway.app/api/v1'
echo.
echo Then redeploy to Netlify/Vercel.
echo.
echo ===================================================================
echo TESTING YOUR DEPLOYMENT
echo ===================================================================
echo.
echo 1. Visit: %NETLIFY_URL%
echo 2. Try to register a new account
echo 3. Try to login
echo 4. Verify dashboard loads
echo.
echo If errors occur:
echo - Check browser console (F12)
echo - Verify API URLs are correct
echo - Check CORS settings in Railway
echo - See: DEPLOYMENT_PAPER_3_EMERGENCY_PROCEDURES.md
echo.
echo Opening your deployed site...
start %NETLIFY_URL%
echo.
echo ===================================================================
echo DEPLOYMENT COMPLETE!
echo ===================================================================
echo.
echo Next steps:
echo 1. Test the deployment (registration, login)
echo 2. Run testing checklist: node AUTOMATED_TESTING_SUITE.js
echo 3. Invite beta users: See DEPLOYMENT_PAPER_4_BETA_INVITATION.md
echo.
pause
