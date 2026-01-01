@echo off
title WhatsApp API - PM2 Quick Start
color 0A

echo ========================================
echo       WhatsApp API PM2 Quick Start
echo ========================================
echo.

echo Step 1: Checking current PM2 processes...
pm2 list

echo.
echo Step 2: Stopping any existing whatsapp-api process...
pm2 stop whatsapp-api 2>nul
pm2 delete whatsapp-api 2>nul

echo.
echo Step 3: Starting WhatsApp API with PM2...
pm2 start ecosystem.config.js --env production

echo.
echo Step 4: Checking status...
pm2 status

echo.
echo Step 5: Saving PM2 configuration...
pm2 save

echo.
echo ========================================
echo           SUCCESS!
echo ========================================
echo.
echo Server Status:
pm2 list

echo.
echo API Endpoints:
echo - Health Check: http://localhost:3000/api/health
echo - Documentation: http://localhost:3000/docs
echo - API Spec: http://localhost:3000/api-spec
echo.
echo Management Commands:
echo - Check status: pm2 status
echo - View logs: pm2 logs whatsapp-api
echo - Restart: pm2 restart whatsapp-api
echo - Stop: pm2 stop whatsapp-api
echo.
echo Press any key to continue...
pause >nul
