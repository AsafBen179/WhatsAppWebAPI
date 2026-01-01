@echo off
echo ========================================
echo       WhatsApp API PM2 Setup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

REM Check if PM2 is installed
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo 📦 Installing PM2 globally...
    npm install -g pm2 pm2-windows-service
    if errorlevel 1 (
        echo ❌ Failed to install PM2
        pause
        exit /b 1
    )
    echo ✅ PM2 installed successfully
) else (
    echo ✅ PM2 found: 
    pm2 --version
)

echo.
echo 📋 Installing project dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 🔧 Creating required directories...
if not exist logs mkdir logs
if not exist sessions mkdir sessions

echo.
echo 🚀 Starting WhatsApp API with PM2...
pm2 start ecosystem.config.js --env production

echo.
echo 💾 Saving PM2 configuration...
pm2 save

echo.
echo 🛠️ Installing PM2 as Windows Service...
pm2-service-install -n "WhatsAppAPI"

echo.
echo ▶️ Starting PM2 service...
pm2-service-start

echo.
echo ========================================
echo          Setup Complete! ✅
echo ========================================
echo.
echo 📊 Check status: pm2 status
echo 📋 View logs: pm2 logs whatsapp-api
echo 🔄 Restart: pm2 restart whatsapp-api
echo 🛑 Stop: pm2 stop whatsapp-api
echo.
echo 🌐 API URL: http://localhost:3000
echo 💚 Health: http://localhost:3000/api/health
echo.
echo The service will start automatically with Windows!
echo.
pause
