@echo off
title Start PM2 Service
color 0A

echo Starting WhatsApp API with PM2...
echo.

pm2 start ecosystem.config.js --env production
pm2 save
pm2 status

echo.
echo Service started successfully!
echo.
echo API URLs:
echo - Health: http://localhost:3000/api/health
echo - Documentation: http://localhost:3000/docs
echo.
echo Management:
echo - Status: pm2 status
echo - Logs: pm2 logs whatsapp-api
echo - Stop: pm2 stop whatsapp-api
echo.
pause
