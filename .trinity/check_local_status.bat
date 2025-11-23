@echo off
REM ═══════════════════════════════════════════════════════
REM  CHECK LOCAL STATUS - Quick Trinity Coordination Check
REM ═══════════════════════════════════════════════════════

echo.
echo ═══════════════════════════════════════════════════════
echo           🎯 TRINITY LOCAL STATUS CHECK 🎯
echo ═══════════════════════════════════════════════════════
echo.

echo 📬 CHECKING COMMUNICATIONS...
echo.
echo Latest messages from C2/C3:
dir /O-D /B .trinity\messages\*.json 2>nul | findstr /V "task_assignment" | more

echo.
echo ⚡ WAKE REQUESTS:
dir /B .trinity\WAKE_REQUESTS\*.flag 2>nul

echo.
echo 📊 TRINITY HUB STATUS:
echo.
type TRINITY_HUB.md | findstr /C:"Status:" /C:"Last Update:" /C:"ACTIVE" /C:"STANDBY"

echo.
echo 🌀 CYCLOTRON STATUS:
echo.
node cyclotron/test_cyclotron.js 2>nul

echo.
echo 📋 AUTONOMOUS WORK QUEUE:
echo.
type AUTONOMOUS_QUEUE.md 2>nul | more

echo.
echo ═══════════════════════════════════════════════════════
echo           ✅ STATUS CHECK COMPLETE
echo ═══════════════════════════════════════════════════════
echo.
echo For full report, see: .trinity\C1_LOCAL_OPERATIONS_REPORT.md
echo.
pause
