@echo off
REM ================================================
REM PRODUCTION BACKEND TESTING SCRIPT
REM ================================================
REM Tests all critical endpoints after deployment
REM ================================================

setlocal enabledelayedexpansion

echo.
echo ================================================
echo   PRODUCTION BACKEND TEST SUITE
echo ================================================
echo.

REM Get backend URL from user
set /p BACKEND_URL="Enter Railway backend URL (e.g., https://your-app.railway.app): "

if "%BACKEND_URL%"=="" (
    echo [ERROR] Backend URL is required
    pause
    exit /b 1
)

REM Remove trailing slash if present
if "%BACKEND_URL:~-1%"=="/" set BACKEND_URL=%BACKEND_URL:~0,-1%

echo.
echo Testing backend: %BACKEND_URL%
echo.

REM Check if curl is available
where curl >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] curl not found. Install curl or use Git Bash.
    pause
    exit /b 1
)

echo ================================================
echo TEST 1: Basic Health Check
echo ================================================
echo.
curl -s -o response.json -w "HTTP Status: %%{http_code}\n" %BACKEND_URL%/api/health
type response.json
echo.
echo.

echo ================================================
echo TEST 2: Detailed Health Check
echo ================================================
echo.
curl -s -o response.json -w "HTTP Status: %%{http_code}\n" %BACKEND_URL%/api/v1/health
type response.json
echo.
echo.

echo ================================================
echo TEST 3: User Registration
echo ================================================
echo.
echo Creating test user: test_%RANDOM%@example.com
set TEST_EMAIL=test_%RANDOM%@example.com
set TEST_PASSWORD=SecurePass123!@#

curl -s -X POST %BACKEND_URL%/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"%TEST_EMAIL%\",\"password\":\"%TEST_PASSWORD%\",\"name\":\"Test User\"}" ^
  -o response.json -w "HTTP Status: %%{http_code}\n"

type response.json
echo.

REM Extract token from response (basic parsing)
for /f "tokens=2 delims=:," %%a in ('type response.json ^| findstr /i "token"') do (
    set TOKEN=%%a
    set TOKEN=!TOKEN:"=!
    set TOKEN=!TOKEN: =!
)

echo.
echo Token: !TOKEN!
echo.

echo ================================================
echo TEST 4: User Login
echo ================================================
echo.
curl -s -X POST %BACKEND_URL%/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"%TEST_EMAIL%\",\"password\":\"%TEST_PASSWORD%\"}" ^
  -o response.json -w "HTTP Status: %%{http_code}\n"

type response.json
echo.
echo.

echo ================================================
echo TEST 5: Get Current User (Authenticated)
echo ================================================
echo.
if not "!TOKEN!"=="" (
    curl -s -X GET %BACKEND_URL%/api/v1/auth/me ^
      -H "Authorization: Bearer !TOKEN!" ^
      -H "Content-Type: application/json" ^
      -o response.json -w "HTTP Status: %%{http_code}\n"

    type response.json
    echo.
) else (
    echo [SKIP] No token available from registration
)
echo.

echo ================================================
echo TEST 6: Create Conversation (Authenticated)
echo ================================================
echo.
if not "!TOKEN!"=="" (
    curl -s -X POST %BACKEND_URL%/api/v1/conversations ^
      -H "Authorization: Bearer !TOKEN!" ^
      -H "Content-Type: application/json" ^
      -d "{\"title\":\"Test Conversation\"}" ^
      -o response.json -w "HTTP Status: %%{http_code}\n"

    type response.json
    echo.

    REM Extract conversation ID
    for /f "tokens=2 delims=:," %%a in ('type response.json ^| findstr /i "\"id\""') do (
        set CONV_ID=%%a
        set CONV_ID=!CONV_ID:"=!
        set CONV_ID=!CONV_ID: =!
    )

    echo.
    echo Conversation ID: !CONV_ID!
) else (
    echo [SKIP] No token available
)
echo.

echo ================================================
echo TEST 7: Add Message to Conversation
echo ================================================
echo.
if not "!TOKEN!"=="" (
    if not "!CONV_ID!"=="" (
        curl -s -X POST %BACKEND_URL%/api/v1/conversations/!CONV_ID!/messages ^
          -H "Authorization: Bearer !TOKEN!" ^
          -H "Content-Type: application/json" ^
          -d "{\"role\":\"user\",\"content\":\"Hello, this is a test message\"}" ^
          -o response.json -w "HTTP Status: %%{http_code}\n"

        type response.json
        echo.
    ) else (
        echo [SKIP] No conversation ID available
    )
) else (
    echo [SKIP] No token available
)
echo.

echo ================================================
echo TEST 8: Security Tests
echo ================================================
echo.

echo [8a] Testing weak password (should fail)
curl -s -X POST %BACKEND_URL%/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"weak@example.com\",\"password\":\"weak\"}" ^
  -o response.json -w "HTTP Status: %%{http_code}\n"
type response.json
echo.
echo.

echo [8b] Testing invalid email (should fail)
curl -s -X POST %BACKEND_URL%/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"notanemail\",\"password\":\"SecurePass123!@#\"}" ^
  -o response.json -w "HTTP Status: %%{http_code}\n"
type response.json
echo.
echo.

echo [8c] Testing invalid credentials (should fail)
curl -s -X POST %BACKEND_URL%/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"nonexistent@example.com\",\"password\":\"WrongPassword123!\"}" ^
  -o response.json -w "HTTP Status: %%{http_code}\n"
type response.json
echo.
echo.

echo [8d] Testing unauthenticated access (should fail)
curl -s -X GET %BACKEND_URL%/api/v1/conversations ^
  -H "Content-Type: application/json" ^
  -o response.json -w "HTTP Status: %%{http_code}\n"
type response.json
echo.
echo.

echo ================================================
echo TEST SUMMARY
echo ================================================
echo.
echo Backend URL: %BACKEND_URL%
echo Test User: %TEST_EMAIL%
echo.
echo Expected Results:
echo   - Health checks: HTTP 200 with "healthy" status
echo   - Registration: HTTP 201 with user object and token
echo   - Login: HTTP 200 with user object and token
echo   - Get user: HTTP 200 with user data
echo   - Create conversation: HTTP 201 with conversation object
echo   - Add message: HTTP 201 with message object
echo   - Security tests: HTTP 400/401 with error messages
echo.
echo Review the responses above to verify all tests passed.
echo.

REM Cleanup
if exist response.json del response.json

echo ================================================
echo   TESTING COMPLETE
echo ================================================
echo.
pause
