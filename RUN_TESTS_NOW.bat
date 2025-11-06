@echo off
REM ===================================================================
REM AUTOMATED TESTING RUNNER
REM ===================================================================
REM Purpose: One-click testing of deployed backend
REM Time: 1 minute
REM ===================================================================

echo ===================================================================
echo AUTOMATED TESTING SUITE
echo ===================================================================
echo.
echo This will run all 20 automated tests against your deployed backend.
echo.
echo Backend: https://cloud-funnel-production.up.railway.app/api/v1
echo.
echo Press any key to start testing...
pause >nul

echo.
echo Running automated tests...
echo.

node "%~dp0AUTOMATED_TESTING_SUITE.js"

if errorlevel 1 (
    echo.
    echo ⚠️ Some tests failed. Review output above.
    echo.
    echo Common issues:
    echo - Backend not responding (wait a few minutes if just deployed)
    echo - CORS errors (check ALLOWED_ORIGINS in Railway)
    echo - Database connection (check PostgreSQL in Railway)
    echo.
    echo For help, see: DEPLOYMENT_PAPER_3_EMERGENCY_PROCEDURES.md
    echo.
) else (
    echo.
    echo ✅ All tests passed! Ready for beta users.
    echo.
    echo Next steps:
    echo 1. Deploy frontend (if not done): DEPLOY_FRONTEND_NOW.bat
    echo 2. Invite beta users: See DEPLOYMENT_PAPER_4_BETA_INVITATION.md
    echo 3. Start monitoring: START_MONITORING.bat
    echo.
)

pause
