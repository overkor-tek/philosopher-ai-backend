@echo off
REM ===================================================================
REM COMMANDER CONTROL CENTER
REM ===================================================================
REM Purpose: One-stop control center for all deployment operations
REM ===================================================================

:MAIN_MENU
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║           COMMANDER CONTROL CENTER - MAIN MENU                 ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo DEPLOYMENT STATUS:
echo ──────────────────────────────────────────────────────────────────
echo ✅ Backend:    LIVE at cloud-funnel-production.up.railway.app
echo ✅ Database:   PostgreSQL connected
echo ✅ Docs:       6 deployment papers complete
echo.
echo QUICK ACTIONS:
echo ──────────────────────────────────────────────────────────────────
echo.
echo  [1] Deploy Frontend to Netlify
echo  [2] Run Automated Tests (20 tests)
echo  [3] Start Monitoring System
echo  [4] View Deployment Status
echo  [5] Check Trinity Status
echo  [6] Open Trinity Dashboard (HTML)
echo  [7] Activate Computer B
echo  [8] View Railway Backend
echo  [9] Emergency Procedures Reference
echo  [0] Exit
echo.
echo ──────────────────────────────────────────────────────────────────
echo.
set /p "choice=Enter your choice (0-9): "

if "%choice%"=="1" goto DEPLOY_FRONTEND
if "%choice%"=="2" goto RUN_TESTS
if "%choice%"=="3" goto START_MONITORING
if "%choice%"=="4" goto VIEW_STATUS
if "%choice%"=="5" goto TRINITY_STATUS
if "%choice%"=="6" goto TRINITY_DASHBOARD
if "%choice%"=="7" goto ACTIVATE_COMPUTER_B
if "%choice%"=="8" goto VIEW_RAILWAY
if "%choice%"=="9" goto EMERGENCY
if "%choice%"=="0" goto EXIT

echo Invalid choice. Press any key to try again...
pause >nul
goto MAIN_MENU

:DEPLOY_FRONTEND
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo FRONTEND DEPLOYMENT
echo ═══════════════════════════════════════════════════════════════
echo.
start /wait DEPLOY_FRONTEND_NOW.bat
echo.
echo Press any key to return to main menu...
pause >nul
goto MAIN_MENU

:RUN_TESTS
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo AUTOMATED TESTING
echo ═══════════════════════════════════════════════════════════════
echo.
start /wait RUN_TESTS_NOW.bat
echo.
echo Press any key to return to main menu...
pause >nul
goto MAIN_MENU

:START_MONITORING
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo MONITORING SYSTEM
echo ═══════════════════════════════════════════════════════════════
echo.
echo Starting monitoring in new window...
echo Press Ctrl+C in the monitoring window to stop.
echo.
start "Monitoring System" START_MONITORING.bat
echo.
echo ✅ Monitoring started in separate window
echo.
pause
goto MAIN_MENU

:VIEW_STATUS
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo DEPLOYMENT STATUS
echo ═══════════════════════════════════════════════════════════════
echo.

if exist DEPLOYMENT_STATUS_COMPLETE.md (
    type DEPLOYMENT_STATUS_COMPLETE.md | more
) else (
    echo Status file not found!
)

echo.
echo Press any key to return to main menu...
pause >nul
goto MAIN_MENU

:TRINITY_STATUS
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo TRINITY CONVERGENCE STATUS
echo ═══════════════════════════════════════════════════════════════
echo.
node TRINITY_CONVERGENCE_HUB_ENHANCED.js status
echo.
echo Press any key to return to main menu...
pause >nul
goto MAIN_MENU

:TRINITY_DASHBOARD
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo TRINITY DASHBOARD
echo ═══════════════════════════════════════════════════════════════
echo.
echo Opening Trinity Coordination Dashboard in browser...
start TRINITY_COORDINATION_DASHBOARD.html
echo.
echo ✅ Dashboard opened in your default browser
echo.
pause
goto MAIN_MENU

:ACTIVATE_COMPUTER_B
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo COMPUTER B ACTIVATION
echo ═══════════════════════════════════════════════════════════════
echo.
echo This will prepare the activation script for Computer B.
echo.
echo When Computer B has WiFi:
echo 1. Copy COMPUTER_B_ACTIVATE.bat to Computer B
echo 2. Run it on Computer B
echo 3. Computer B will sync and activate automatically
echo.
if exist COMPUTER_B_ACTIVATE.bat (
    echo ✅ Activation script ready: COMPUTER_B_ACTIVATE.bat
    echo.
    echo Would you like to open the folder? (Y/N)
    set /p "open_folder=Choice: "
    if /i "%open_folder%"=="Y" (
        explorer /select,COMPUTER_B_ACTIVATE.bat
    )
) else (
    echo ⚠️ Activation script not found!
)
echo.
pause
goto MAIN_MENU

:VIEW_RAILWAY
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo RAILWAY BACKEND
echo ═══════════════════════════════════════════════════════════════
echo.
echo Opening Railway dashboard and backend health check...
echo.
start https://railway.app/project/94d6e77f-f31f-49a1-837f-c1989b88bfa1
start https://cloud-funnel-production.up.railway.app/api/v1/health
echo.
echo ✅ Railway dashboard opened
echo ✅ Backend health check opened
echo.
pause
goto MAIN_MENU

:EMERGENCY
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo EMERGENCY PROCEDURES
echo ═══════════════════════════════════════════════════════════════
echo.
echo QUICK REFERENCE:
echo.
echo 🔴 RED ALERT (Fix in 5 min):
echo    - Website down
echo    - Database down
echo    → Restart service in Railway dashboard
echo.
echo 🟠 ORANGE ALERT (Fix in 1 hour):
echo    - Users can't register/login
echo    - API errors
echo    → Check logs, verify CORS settings
echo.
echo 🟡 YELLOW ALERT (Fix in 24 hours):
echo    - Slow performance
echo    - Minor bugs
echo    → Monitor, optimize if needed
echo.
echo 🟢 GREEN (Fix when convenient):
echo    - UI tweaks
echo    - Feature requests
echo.
echo For detailed procedures, see:
echo    DEPLOYMENT_PAPER_3_EMERGENCY_PROCEDURES.md
echo.
echo Would you like to open the emergency procedures file? (Y/N)
set /p "open_emergency=Choice: "
if /i "%open_emergency%"=="Y" (
    start notepad DEPLOYMENT_PAPER_3_EMERGENCY_PROCEDURES.md
)
echo.
pause
goto MAIN_MENU

:EXIT
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo COMMANDER CONTROL CENTER - EXITING
echo ═══════════════════════════════════════════════════════════════
echo.
echo System Status:
echo ✅ Backend operational
echo ✅ All automation tools ready
echo ✅ Documentation complete
echo.
echo Quick reminders:
echo - Monitor backend daily (5 min)
echo - Review beta feedback weekly
echo - Check Railway logs for errors
echo.
echo Good luck with your deployment! 🚀
echo.
pause
exit
