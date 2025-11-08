@echo off
REM ===================================================
REM TEST KNOWLEDGE API - Verify Deployment
REM ===================================================
REM Tests all 5 knowledge API endpoints
REM ===================================================

echo.
echo ===================================================
echo TESTING KNOWLEDGE API ENDPOINTS
echo ===================================================
echo.

set BACKEND_URL=https://cloud-funnel-production.up.railway.app

echo Backend URL: %BACKEND_URL%
echo.

REM Test 1: Health check
echo [1/5] Testing backend health...
curl -s %BACKEND_URL%/api/v1/health
echo.
echo.

REM Test 2: Store test knowledge
echo [2/5] Storing test knowledge...
curl -X POST %BACKEND_URL%/api/v1/knowledge ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"Data Cyclotron Test\",\"content\":\"Testing autonomous knowledge storage\",\"categories\":[\"testing\"],\"keywords\":[\"test\",\"cyclotron\"]}"
echo.
echo.

REM Test 3: Search
echo [3/5] Searching for 'cyclotron'...
curl -s "%BACKEND_URL%/api/v1/knowledge/search?q=cyclotron"
echo.
echo.

REM Test 4: Get recent
echo [4/5] Getting recent knowledge...
curl -s "%BACKEND_URL%/api/v1/knowledge/recent?limit=3"
echo.
echo.

REM Test 5: Get stats
echo [5/5] Getting knowledge stats...
curl -s "%BACKEND_URL%/api/v1/knowledge/stats"
echo.
echo.

echo ===================================================
echo ✅ TESTING COMPLETE
echo ===================================================
echo.
echo If all endpoints returned JSON responses, API is working!
echo.
pause
