@echo off
title WhatsApp API Quick Start
color 0A

echo ========================================
echo        WhatsApp API Quick Start
echo ========================================
echo.
echo Starting WhatsApp API Server
echo With Hebrew support and PM2
echo.

REM Check Node.js installation
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo OK: Node.js is installed
node --version

echo.
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Creating directories...
if not exist logs mkdir logs
if not exist sessions mkdir sessions

echo.
echo Setting up configuration...
if not exist .env (
    echo NODE_ENV=development > .env
    echo PORT=3000 >> .env
    echo LOG_LEVEL=info >> .env
    echo AUTO_CONNECT=false >> .env
    echo API_KEY=whatsapp-api-key-2024 >> .env
    echo ALLOWED_ORIGINS=http://localhost:3000 >> .env
    echo SESSION_PATH=./sessions >> .env
    echo TEST_PHONE_NUMBER=972501234567 >> .env
    echo OK: .env file created
) else (
    echo INFO: .env file already exists
)

echo.
echo Running quick test...
timeout /t 2 >nul
node -e "console.log('OK: Node.js working properly'); process.exit(0);"

echo.
echo Choose startup mode:
echo.
echo 1. Simple run (Development)
echo 2. Run with PM2 (Production)
echo 3. Install as Windows Service
echo 4. Exit
echo.
set /p mode="Choose option (1-4): "

if "%mode%"=="1" goto simple
if "%mode%"=="2" goto pm2
if "%mode%"=="3" goto service
if "%mode%"=="4" goto exit
goto simple

:simple
echo.
echo Starting in development mode...
echo.
echo INFO: Server will start at: http://localhost:3000
echo INFO: Press Ctrl+C to stop
echo.
timeout /t 3 >nul
npm start
goto end

:pm2
echo.
echo Checking PM2 installation...
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo Installing PM2...
    npm install -g pm2
    if errorlevel 1 (
        echo ERROR: PM2 installation failed
        echo TIP: Try running as administrator
        pause
        goto simple
    )
)

echo OK: PM2 is installed
echo.
echo Starting with PM2...
pm2 start ecosystem.config.js --env production
pm2 save

echo.
echo OK: Server is running!
echo.
echo Useful commands:
echo   pm2 status              - Server status
echo   pm2 logs whatsapp-api   - View logs
echo   pm2 restart whatsapp-api - Restart
echo   pm2 stop whatsapp-api   - Stop
echo.
echo API URL: http://localhost:3000
echo Health check: http://localhost:3000/api/health
echo Documentation: http://localhost:3000/docs
echo.
pause
goto end

:service
echo.
echo Installing as Windows Service...
echo WARNING: Requires administrator privileges
echo.

pm2 --version >nul 2>&1
if errorlevel 1 (
    echo Installing PM2...
    npm install -g pm2 pm2-windows-service
    if errorlevel 1 (
        echo ERROR: PM2 installation failed
        echo TIP: Run as administrator
        pause
        goto simple
    )
)

echo Starting with PM2...
pm2 start ecosystem.config.js --env production
pm2 save

echo Installing Windows Service...
npm install -g pm2-windows-service
pm2-service-install -n "WhatsAppAPI"
pm2-service-start

echo.
echo OK: Service installed successfully!
echo.
echo Service management:
echo   pm2-service-start   - Start
echo   pm2-service-stop    - Stop
echo   pm2-service-restart - Restart
echo.
echo PM2 management:
echo   pm2 status          - Status
echo   pm2 logs            - Logs
echo.
echo Service will start automatically with Windows
echo.
pause
goto end

:exit
echo.
echo Goodbye!
timeout /t 2 >nul
exit /b 0

:end
echo.
echo Next steps:
echo.
echo 1. Check server is running: http://localhost:3000
echo 2. Connect to WhatsApp: POST /api/connect
echo 3. Get QR Code: GET /api/qr
echo 4. Send message: POST /api/send
echo.
echo Full documentation: README.md
echo Tests: npm test
echo Examples: node examples/usage-examples.js
echo.
echo Tips:
echo   - Change API_KEY in .env file
echo   - Check logs in logs/ folder
echo   - Use pm2-manager.bat for easy management
echo.
pause
