@echo off
REM FlightRosterIQ Server Configuration Update Script (Windows)
REM Run this script after recreating your DigitalOcean droplet

echo 🚀 FlightRosterIQ Server IP Configuration Update
echo ==============================================

set /p NEW_SERVER_IP=Enter your new DigitalOcean server IP address: 

if "%NEW_SERVER_IP%"=="" (
    echo ❌ Error: No IP address provided
    pause
    exit /b 1
)

echo 📝 Updating configuration files...

REM Update src/config.js
powershell -Command "(Get-Content src\config.js) -replace 'YOUR_NEW_SERVER_IP', '%NEW_SERVER_IP%' | Set-Content src\config.js"

REM Update any files with old IP
powershell -Command "Get-ChildItem -Recurse -Include *.js,*.jsx,*.cjs,*.json | ForEach-Object { (Get-Content $_.FullName) -replace '138\.197\.110\.225', '%NEW_SERVER_IP%' | Set-Content $_.FullName }"

echo ✅ Configuration updated successfully!
echo.
echo 🔧 Updated files:
echo   - src/config.js  
echo   - All files containing old IP address
echo.
echo 🌐 New API Base URL: http://%NEW_SERVER_IP%:8080
echo.
echo 📋 Next steps:
echo 1. Build your React app: npm run build
echo 2. Test the connection: http://%NEW_SERVER_IP%:8080
echo 3. Deploy to your server if needed
echo.
echo 🚀 Your FlightRosterIQ crew scraper is ready for 400+ ABX Air/ATI pilots!
pause