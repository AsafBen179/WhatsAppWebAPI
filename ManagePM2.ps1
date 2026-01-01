# ManagePM2.ps1

# קביעת קידוד וצבעים
chcp 65001 > $null
$Host.UI.RawUI.ForegroundColor = "Green"
Clear-Host

# שמור את נתיב הסקריפט
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# בדוק אם רץ כמנהל מערכת
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "🔐 Relaunching as Administrator..."
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command `"cd '$scriptDir'; & '$PSCommandPath'`""
    exit
}

# ודא שנשארנו בתיקיית הסקריפט
Set-Location $scriptDir

# תפריט
Write-Host "========================================="
Write-Host "     WhatsApp API PM2 Service Manager"
Write-Host "=========================================`n"
Write-Host "1. Start WhatsApp API"
Write-Host "2. Stop WhatsApp API"
Write-Host "3. Exit"
Write-Host "`nSelect an option:"

$choice = Read-Host

switch ($choice) {
    "1" {
        Clear-Host
        $Host.UI.RawUI.ForegroundColor = "Green"
        Write-Host "🚀 Starting WhatsApp API with PM2..."
        Set-Location $scriptDir
        $ecosystemPath = Join-Path $scriptDir "ecosystem.config.js"
        Write-Host "➡️ Running: pm2 start `"$ecosystemPath`" --env production"
        pm2 start "$ecosystemPath" --env production
        pm2 save
        pm2 status
        Write-Host "`n✅ Service started successfully!"
        Write-Host "🌐 API URLs:"
        Write-Host "- Health: http://localhost:3000/api/health"
        Write-Host "- Docs:   http://localhost:3000/docs"
    }
    "2" {
        Clear-Host
        $Host.UI.RawUI.ForegroundColor = "Red"
        Write-Host "🛑 Stopping WhatsApp API service..."
        pm2 stop whatsapp-api
        pm2 delete whatsapp-api
        Write-Host "`n🔍 Remaining PM2 processes:"
        pm2 list
        Write-Host "`n✅ Service stopped successfully!"
    }
    default {
        Write-Host "👋 Exiting..."
    }
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
exit
