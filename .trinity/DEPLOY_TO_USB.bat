@echo off
title Trinity - Package for USB Deployment
echo.
echo ════════════════════════════════════════════════════
echo   TRINITY USB DEPLOYMENT PACKAGER
echo   Creating deployment package for Computers B ^& C
echo ════════════════════════════════════════════════════
echo.

REM Get USB drive letter
set /p USB_DRIVE="Enter USB drive letter (e.g., E): "

if "%USB_DRIVE%"=="" (
    echo ❌ No drive letter entered
    pause
    exit /b 1
)

REM Add colon if not present
echo %USB_DRIVE% | findstr /C:":" >nul || set USB_DRIVE=%USB_DRIVE%:

echo.
echo 📦 Creating deployment package on %USB_DRIVE%...
echo.

REM Create Trinity deployment folder on USB
set DEPLOY_DIR=%USB_DRIVE%\TRINITY_DEPLOYMENT
if not exist "%DEPLOY_DIR%" mkdir "%DEPLOY_DIR%"

echo ✅ Created deployment folder: %DEPLOY_DIR%
echo.

REM Copy .trinity folder
echo 📁 Copying .trinity folder...
xcopy /E /I /Y "%~dp0" "%DEPLOY_DIR%\.trinity" >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ .trinity folder copied
) else (
    echo ❌ Error copying .trinity folder
    pause
    exit /b 1
)

REM Create deployment instructions
echo.
echo 📄 Creating deployment instructions...

(
echo ════════════════════════════════════════════════════
echo   TRINITY DEPLOYMENT INSTRUCTIONS
echo   Deploy to Computers B ^& C
echo ════════════════════════════════════════════════════
echo.
echo STEP 1: PLUG USB INTO COMPUTER B
echo   1. Plug this USB drive into Computer B
echo   2. Navigate to: %USB_DRIVE%\TRINITY_DEPLOYMENT
echo   3. Double-click: DEPLOY_ON_COMPUTER_B.bat
echo   4. Wait 30 seconds for sync to start
echo   5. Verify "Computer A: ONLINE" appears
echo.
echo STEP 2: PLUG USB INTO COMPUTER C
echo   1. Plug this USB drive into Computer C
echo   2. Navigate to: %USB_DRIVE%\TRINITY_DEPLOYMENT
echo   3. Double-click: DEPLOY_ON_COMPUTER_C.bat
echo   4. Wait 30 seconds for sync to start
echo   5. Verify "Computer A ^& B: ONLINE" appears
echo.
echo STEP 3: VERIFY ON COMPUTER A
echo   1. Return to Computer A
echo   2. Check master coordinator console
echo   3. Should show: "Connected Computers: 3/3"
echo   4. All 3 computers now coordinating!
echo.
echo ════════════════════════════════════════════════════
echo   TROUBLESHOOTING
echo ════════════════════════════════════════════════════
echo.
echo Q: Computer not showing as ONLINE?
echo A: Check Dropbox is installed and syncing
echo    Verify: C:\Users\[username]\Dropbox\TRINITY_NETWORK exists
echo.
echo Q: How do I know if it's working?
echo A: Console shows sync activity every 30 seconds
echo    Cloud folder status.json updates with recent timestamp
echo.
echo Q: Can I close the console window?
echo A: No - it needs to run continuously for sync
echo    Minimize it instead
echo.
echo ════════════════════════════════════════════════════
) > "%DEPLOY_DIR%\README_DEPLOYMENT.txt"

echo ✅ Instructions created
echo.

REM Create Computer B deployment script
echo 📄 Creating Computer B deployment script...

(
echo @echo off
echo title Trinity Cloud Sync - Computer B
echo echo.
echo echo ════════════════════════════════════════════════════
echo echo   TRINITY DEPLOYMENT - COMPUTER B
echo echo ════════════════════════════════════════════════════
echo echo.
echo echo 📦 Copying Trinity files to this computer...
echo echo.
echo.
echo REM Create .trinity folder in user directory
echo set TRINITY_DIR=%%USERPROFILE%%\.trinity
echo if not exist "%%TRINITY_DIR%%" mkdir "%%TRINITY_DIR%%"
echo.
echo REM Copy all files
echo xcopy /E /I /Y "%%~dp0.trinity" "%%TRINITY_DIR%%" ^>nul
echo.
echo if %%ERRORLEVEL%% EQU 0 ^(
echo     echo ✅ Trinity files copied successfully
echo     echo.
echo     echo 🚀 Starting cloud sync for Computer B...
echo     echo.
echo     cd /d "%%TRINITY_DIR%%"
echo     start "Trinity Cloud Sync B" cmd /k "node cloud_sync_computer_b.js"
echo     echo.
echo     echo ✅ Cloud sync started!
echo     echo.
echo     echo 📊 Watch the Trinity Cloud Sync window for status
echo     echo    Within 30 seconds you should see "Computer A: ONLINE"
echo     echo.
echo     echo 📁 Cloud folder: C:\Users\%%USERNAME%%\Dropbox\TRINITY_NETWORK
echo     echo.
echo     echo ════════════════════════════════════════════════════
echo     echo   DEPLOYMENT COMPLETE
echo     echo ════════════════════════════════════════════════════
echo     echo.
echo ^) else ^(
echo     echo ❌ Error copying files
echo     pause
echo     exit /b 1
echo ^)
echo.
echo pause
) > "%DEPLOY_DIR%\DEPLOY_ON_COMPUTER_B.bat"

echo ✅ Computer B deployment script created
echo.

REM Create Computer C deployment script
echo 📄 Creating Computer C deployment script...

(
echo @echo off
echo title Trinity Cloud Sync - Computer C
echo echo.
echo echo ════════════════════════════════════════════════════
echo echo   TRINITY DEPLOYMENT - COMPUTER C
echo echo ════════════════════════════════════════════════════
echo echo.
echo echo 📦 Copying Trinity files to this computer...
echo echo.
echo.
echo REM Create .trinity folder in user directory
echo set TRINITY_DIR=%%USERPROFILE%%\.trinity
echo if not exist "%%TRINITY_DIR%%" mkdir "%%TRINITY_DIR%%"
echo.
echo REM Copy all files
echo xcopy /E /I /Y "%%~dp0.trinity" "%%TRINITY_DIR%%" ^>nul
echo.
echo if %%ERRORLEVEL%% EQU 0 ^(
echo     echo ✅ Trinity files copied successfully
echo     echo.
echo     echo 🚀 Starting cloud sync for Computer C...
echo     echo.
echo     cd /d "%%TRINITY_DIR%%"
echo     start "Trinity Cloud Sync C" cmd /k "node cloud_sync_computer_c.js"
echo     echo.
echo     echo ✅ Cloud sync started!
echo     echo.
echo     echo 📊 Watch the Trinity Cloud Sync window for status
echo     echo    Within 30 seconds you should see "Computer A ^& B: ONLINE"
echo     echo.
echo     echo 📁 Cloud folder: C:\Users\%%USERNAME%%\Dropbox\TRINITY_NETWORK
echo     echo.
echo     echo ════════════════════════════════════════════════════
echo     echo   DEPLOYMENT COMPLETE
echo     echo ════════════════════════════════════════════════════
echo     echo.
echo ^) else ^(
echo     echo ❌ Error copying files
echo     pause
echo     exit /b 1
echo ^)
echo.
echo pause
) > "%DEPLOY_DIR%\DEPLOY_ON_COMPUTER_C.bat"

echo ✅ Computer C deployment script created
echo.

REM Create checklist
(
echo ☐ USB deployment package created
echo ☐ README_DEPLOYMENT.txt reviewed
echo ☐ USB plugged into Computer B
echo ☐ DEPLOY_ON_COMPUTER_B.bat executed
echo ☐ Computer B showing "Computer A: ONLINE"
echo ☐ USB plugged into Computer C
echo ☐ DEPLOY_ON_COMPUTER_C.bat executed
echo ☐ Computer C showing "Computer A ^& B: ONLINE"
echo ☐ Computer A master coordinator shows "3/3 computers"
echo ☐ Full Trinity network operational
) > "%DEPLOY_DIR%\DEPLOYMENT_CHECKLIST.txt"

echo ✅ Deployment checklist created
echo.

echo ════════════════════════════════════════════════════
echo   ✅ DEPLOYMENT PACKAGE READY!
echo ════════════════════════════════════════════════════
echo.
echo 📁 Location: %DEPLOY_DIR%
echo.
echo 📄 Files created:
echo    - .trinity folder (complete Trinity system)
echo    - README_DEPLOYMENT.txt (instructions)
echo    - DEPLOY_ON_COMPUTER_B.bat (Computer B installer)
echo    - DEPLOY_ON_COMPUTER_C.bat (Computer C installer)
echo    - DEPLOYMENT_CHECKLIST.txt (step-by-step checklist)
echo.
echo 🚀 NEXT STEPS:
echo    1. Safely eject this USB drive
echo    2. Plug into Computer B
echo    3. Run DEPLOY_ON_COMPUTER_B.bat
echo    4. Then Computer C
echo    5. Watch master coordinator show 3/3 computers!
echo.
echo ════════════════════════════════════════════════════
echo.
pause
