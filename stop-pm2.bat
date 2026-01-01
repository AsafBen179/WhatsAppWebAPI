@echo off
chcp 65001 >nul 2>&1
title Stop PM2 Service
color 0C

echo ========================================
echo       Stop WhatsApp API Service
echo ========================================
echo.

echo Stopping WhatsApp API service...
pm2 stop whatsapp-api
pm2 delete whatsapp-api

echo.
echo Checking remaining processes...
pm2 list

echo.
echo Service stopped successfully!
echo.
pause
