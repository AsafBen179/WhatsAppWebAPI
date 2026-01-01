@echo off
title PM2 Service Test
color 0A

echo ========================================
echo       PM2 Service Test Script
echo ========================================
echo.

echo Step 1: Checking PM2 installation...
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PM2 is not installed
    echo Installing PM2 globally...
    npm install -g pm2
    if errorlevel 1 (
        echo ERROR: Failed to install PM2
        echo Please run as administrator
        pause
        exit /b 1
    )
)
echo OK: PM2 is installed

echo.
echo Step 2: Starting WhatsApp API with PM2...
pm2 start ecosystem.config.js --env production
if errorlevel 1 (
    echo ERROR: Failed to start service
    pause
    exit /b 1
)

echo.
echo Step 3: Checking service status...
pm2 status

echo.
echo Step 4: Waiting for service to start...
timeout /t 5 >nul

echo.
echo Step 5: Saving PM2 configuration...
pm2 save

echo.
echo ========================================
echo           Test Results
echo ========================================
echo.
echo Service Status:
pm2 list

echo.
echo API URLs:
echo - Health: http://localhost:3000/api/health
echo - Docs: http://localhost:3000/docs
echo - API Spec: http://localhost:3000/api-spec
echo.
echo Management Commands:
echo - pm2 status
echo - pm2 logs whatsapp-api
echo - pm2 restart whatsapp-api
echo - pm2 stop whatsapp-api
echo.
echo To open PM2 Manager: pm2-manager.bat
echo.
pause
