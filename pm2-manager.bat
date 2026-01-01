@echo off
chcp 65001 >nul 2>&1
title WhatsApp API PM2 Manager
color 0A

:menu
cls
echo ========================================
echo       WhatsApp API PM2 Manager
echo ========================================
echo.
echo 1. Check Status
echo 2. View Logs
echo 3. Start Service
echo 4. Stop Service  
echo 5. Restart Service
echo 6. Delete Service
echo 7. Service Logs (Real-time)
echo 8. Monitor Performance
echo 9. Update Application
echo 0. Exit
echo.
set /p choice="Select option (0-9): "

if "%choice%"=="1" goto status
if "%choice%"=="2" goto logs
if "%choice%"=="3" goto start
if "%choice%"=="4" goto stop
if "%choice%"=="5" goto restart
if "%choice%"=="6" goto delete
if "%choice%"=="7" goto live_logs
if "%choice%"=="8" goto monitor
if "%choice%"=="9" goto update
if "%choice%"=="0" goto exit
goto menu

:status
cls
echo Current Status:
echo ==================
pm2 status
echo.
echo Saved Configuration:
pm2 prettylist
echo.
pause
goto menu

:logs
cls
echo Recent Logs:
echo ===============
pm2 logs whatsapp-api --lines 50
echo.
pause
goto menu

:start
cls
echo Starting WhatsApp API...
pm2 start whatsapp-api
if errorlevel 1 (
    echo ERROR: Failed to start
) else (
    echo OK: Started successfully
)
echo.
pause
goto menu

:stop
cls
echo Stopping WhatsApp API...
pm2 stop whatsapp-api
if errorlevel 1 (
    echo ERROR: Failed to stop
) else (
    echo OK: Stopped successfully
)
echo.
pause
goto menu

:restart
cls
echo 🔄 Restarting WhatsApp API...
pm2 restart whatsapp-api
if errorlevel 1 (
    echo ❌ Failed to restart
) else (
    echo ✅ Restarted successfully
)
echo.
pause
goto menu

:delete
cls
echo ⚠️ WARNING: This will delete the service completely!
set /p confirm="Are you sure? (y/N): "
if /i "%confirm%"=="y" (
    echo 🗑️ Deleting service...
    pm2 delete whatsapp-api
    pm2 save
    echo ✅ Service deleted
) else (
    echo ❌ Cancelled
)
echo.
pause
goto menu

:live_logs
cls
echo 📡 Live Logs (Press Ctrl+C to exit):
echo ====================================
pm2 logs whatsapp-api --follow
pause
goto menu

:monitor
cls
echo 📈 Performance Monitor:
echo ======================
pm2 monit
pause
goto menu

:update
cls
echo 🔄 Updating Application...
echo =========================
echo.
echo 1. Stopping service...
pm2 stop whatsapp-api

echo 2. Installing updates...
call npm install

echo 3. Restarting service...
pm2 restart whatsapp-api

echo 4. Saving configuration...
pm2 save

echo.
echo ✅ Update completed!
pause
goto menu

:exit
echo.
echo 👋 Goodbye!
exit /b 0
