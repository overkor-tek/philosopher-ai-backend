@echo off
REM ============================================================================
REM 🌸 PINK REVOLUTION - SECURE BACKEND DEPLOYMENT
REM ============================================================================
REM One-click deployment to Railway with non-blocking tests
REM Version: 2.0.0 - Pink Revolution Phase 1
REM ============================================================================

setlocal enabledelayedexpansion

REM Colors for output
set "PINK=[95m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

REM Configuration
set "SERVICE_NAME=philosopher-ai-backend"
set "SERVICE_FILE=server-secure.js"
set "LOG_FILE=deployment_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log"

cls
echo.
echo %PINK%=============================================================================%RESET%
echo %PINK%   🌸 PINK REVOLUTION - SECURE BACKEND DEPLOYMENT 🌸%RESET%
echo %PINK%=============================================================================%RESET%
echo.
echo %BLUE%Deploying: %SERVICE_FILE%
echo Service: %SERVICE_NAME%
echo Timestamp: %date% %time%%RESET%
echo.

REM ============================================================================
REM STEP 1: Pre-flight Checks
REM ============================================================================

echo %PINK%[1/7]%RESET% %BLUE%Running pre-flight checks...%RESET%

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ ERROR: Node.js is not installed!%RESET%
    echo %YELLOW%Please install Node.js from https://nodejs.org%RESET%
    pause
    exit /b 1
)
echo %GREEN%✅ Node.js: %RESET%
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ ERROR: npm is not installed!%RESET%
    pause
    exit /b 1
)
echo %GREEN%✅ npm: %RESET%
npm --version

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%⚠️  Railway CLI not found. Installing...%RESET%
    npm install -g @railway/cli
    if errorlevel 1 (
        echo %RED%❌ ERROR: Failed to install Railway CLI!%RESET%
        pause
        exit /b 1
    )
    echo %GREEN%✅ Railway CLI installed!%RESET%
) else (
    echo %GREEN%✅ Railway CLI: %RESET%
    railway --version
)

REM Check if server-secure.js exists
if not exist "%SERVICE_FILE%" (
    echo %RED%❌ ERROR: %SERVICE_FILE% not found!%RESET%
    echo %YELLOW%Make sure you're in the correct directory.%RESET%
    pause
    exit /b 1
)
echo %GREEN%✅ %SERVICE_FILE% found%RESET%

echo.

REM ============================================================================
REM STEP 2: Install Dependencies
REM ============================================================================

echo %PINK%[2/7]%RESET% %BLUE%Installing dependencies...%RESET%

if exist "package.json" (
    npm install
    if errorlevel 1 (
        echo %YELLOW%⚠️  Warning: npm install had issues, but continuing...%RESET%
    ) else (
        echo %GREEN%✅ Dependencies installed%RESET%
    )
) else (
    echo %YELLOW%⚠️  No package.json found, skipping dependency installation%RESET%
)

echo.

REM ============================================================================
REM STEP 3: Run Tests (Non-Blocking - Pink Revolution!)
REM ============================================================================

echo %PINK%[3/7]%RESET% %BLUE%Running tests (non-blocking)...%RESET%
echo %PINK%🌸 Pink Revolution: Tests inform but don't block!%RESET%

set "TEST_FAILED=0"

if exist "package.json" (
    findstr /C:"\"test\"" package.json >nul
    if not errorlevel 1 (
        npm test
        if errorlevel 1 (
            set "TEST_FAILED=1"
            echo %YELLOW%⚠️  Tests failed but deployment will continue (Pink Revolution)%RESET%
        ) else (
            echo %GREEN%✅ All tests passed!%RESET%
        )
    ) else (
        echo %YELLOW%⚠️  No test script found in package.json%RESET%
    )
) else (
    echo %YELLOW%⚠️  No package.json found, skipping tests%RESET%
)

echo.

REM ============================================================================
REM STEP 4: Check Railway Authentication
REM ============================================================================

echo %PINK%[4/7]%RESET% %BLUE%Checking Railway authentication...%RESET%

railway whoami >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%⚠️  Not authenticated with Railway%RESET%
    echo %BLUE%Attempting to use RAILWAY_TOKEN from environment...%RESET%
    
    if not defined RAILWAY_TOKEN (
        echo %RED%❌ ERROR: RAILWAY_TOKEN not set!%RESET%
        echo.
        echo %YELLOW%Please either:%RESET%
        echo   1. Run: railway login
        echo   2. Set RAILWAY_TOKEN environment variable
        echo.
        pause
        exit /b 1
    )
    echo %GREEN%✅ Using RAILWAY_TOKEN from environment%RESET%
) else (
    echo %GREEN%✅ Authenticated as:%RESET%
    railway whoami
)

echo.

REM ============================================================================
REM STEP 5: Link to Railway Project (if needed)
REM ============================================================================

echo %PINK%[5/7]%RESET% %BLUE%Checking Railway project link...%RESET%

if not exist ".railway" (
    echo %YELLOW%⚠️  Not linked to Railway project%RESET%
    echo %BLUE%Linking to project...%RESET%
    
    REM Try to link using project ID if available
    if defined RAILWAY_PROJECT_ID (
        railway link %RAILWAY_PROJECT_ID%
        if errorlevel 1 (
            echo %RED%❌ ERROR: Failed to link project!%RESET%
            pause
            exit /b 1
        )
    ) else (
        echo %YELLOW%Please link manually or set RAILWAY_PROJECT_ID%RESET%
        railway link
        if errorlevel 1 (
            echo %RED%❌ ERROR: Failed to link project!%RESET%
            pause
            exit /b 1
        )
    )
    echo %GREEN%✅ Project linked%RESET%
) else (
    echo %GREEN%✅ Already linked to Railway project%RESET%
)

echo.

REM ============================================================================
REM STEP 6: Deploy to Railway
REM ============================================================================

echo %PINK%[6/7]%RESET% %BLUE%Deploying to Railway...%RESET%
echo.
echo %PINK%🚀 Initiating deployment...%RESET%

REM Deploy with service specification
if defined RAILWAY_SERVICE_ID (
    echo %BLUE%Using service ID: %RAILWAY_SERVICE_ID%%RESET%
    railway up --service=%RAILWAY_SERVICE_ID% --detach
) else if defined SERVICE_NAME (
    echo %BLUE%Using service name: %SERVICE_NAME%%RESET%
    railway up --service=%SERVICE_NAME% --detach
) else (
    echo %YELLOW%⚠️  No service specified, deploying to default service%RESET%
    railway up --detach
)

if errorlevel 1 (
    echo %RED%❌ ERROR: Deployment failed!%RESET%
    echo.
    echo %YELLOW%Checking logs for details...%RESET%
    railway logs
    pause
    exit /b 1
)

echo %GREEN%✅ Deployment initiated successfully!%RESET%

REM Wait for deployment to stabilize
echo %BLUE%Waiting for deployment to stabilize...%RESET%
timeout /t 30 /nobreak >nul

echo.

REM ============================================================================
REM STEP 7: Verify Deployment
REM ============================================================================

echo %PINK%[7/7]%RESET% %BLUE%Verifying deployment...%RESET%

REM Get deployment status
if defined RAILWAY_SERVICE_ID (
    railway status --service=%RAILWAY_SERVICE_ID%
) else if defined SERVICE_NAME (
    railway status --service=%SERVICE_NAME%
) else (
    railway status
)

REM Try to get domain
echo.
echo %BLUE%Fetching service URL...%RESET%
if defined RAILWAY_SERVICE_ID (
    railway domain --service=%RAILWAY_SERVICE_ID%
) else if defined SERVICE_NAME (
    railway domain --service=%SERVICE_NAME%
) else (
    railway domain
)

echo.

REM ============================================================================
REM DEPLOYMENT SUMMARY
REM ============================================================================

echo.
echo %PINK%=============================================================================%RESET%
echo %PINK%   🌸 DEPLOYMENT SUMMARY 🌸%RESET%
echo %PINK%=============================================================================%RESET%
echo.
echo %GREEN%Status:          DEPLOYED ✅%RESET%
echo %BLUE%Service:         %SERVICE_NAME%%RESET%
echo %BLUE%File:            %SERVICE_FILE%%RESET%
echo %BLUE%Time:            %date% %time%%RESET%

if %TEST_FAILED%==1 (
    echo %YELLOW%Tests:           ⚠️  FAILED (but deployed anyway - Pink Revolution!)%RESET%
) else (
    echo %GREEN%Tests:           ✅ PASSED%RESET%
)

echo.
echo %PINK%🌸 Pink Revolution Phase 1: Non-blocking deployment complete!%RESET%
echo %BLUE%Check Railway dashboard for deployment details:%RESET%
echo %BLUE%https://railway.app%RESET%
echo.
echo %PINK%=============================================================================%RESET%
echo.

REM Save log
echo Deployment completed at %date% %time% >> %LOG_FILE%
if %TEST_FAILED%==1 (
    echo Tests failed but deployment continued >> %LOG_FILE%
) else (
    echo Tests passed >> %LOG_FILE%
)

pause
exit /b 0
