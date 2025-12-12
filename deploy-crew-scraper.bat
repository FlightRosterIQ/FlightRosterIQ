@echo off
echo 🛩️ ABX Air Crew Scraper - Windows Deployment
echo =============================================

set SERVER_IP=157.245.126.24
set SERVER_USER=root
set SERVER_PATH=/root/FlightRosterIQ

echo 📡 Deploying to: %SERVER_USER%@%SERVER_IP%
echo 📁 Target path: %SERVER_PATH%

echo.
echo 🔗 Use one of these methods to deploy:
echo.
echo Method 1 - SCP Upload (if you have SCP):
echo scp crew-app.py %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/
echo.
echo Method 2 - SSH and paste content:
echo ssh %SERVER_USER%@%SERVER_IP%
echo cd %SERVER_PATH%
echo nano crew-app.py
echo [Then paste the content from crew-app.py]
echo.
echo Method 3 - Direct server command:
echo ssh %SERVER_USER%@%SERVER_IP% "cd %SERVER_PATH% && python3 crew-app.py"
echo.
echo 🎯 After upload, run on server:
echo cd /root/FlightRosterIQ
echo python3 crew-app.py
echo.
echo ✅ Server will be live at: http://157.245.126.24:8080
echo 🎉 Ready for 400+ ABX Air pilots!

pause