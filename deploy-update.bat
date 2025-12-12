@echo off
REM Deploy updated FlightRosterIQ to DigitalOcean server
REM Server IP: 157.245.126.24

set SERVER_IP=157.245.126.24
set SERVER_USER=root

echo 🚀 Deploying FlightRosterIQ to DigitalOcean Server
echo ==================================================
echo Server: %SERVER_IP%:8080
echo.

REM Create deployment package
echo 📦 Creating deployment package...
tar -czf flightrosteriq-update.tar.gz dist/

REM Copy to server
echo 📤 Uploading to server...
scp flightrosteriq-update.tar.gz %SERVER_USER%@%SERVER_IP%:/root/

REM Deploy on server via SSH
echo 🔧 Deploying on server...
ssh %SERVER_USER%@%SERVER_IP% "cd /root && echo '📂 Backing up current FlightRosterIQ...' && if [ -d 'FlightRosterIQ' ]; then cp -r FlightRosterIQ FlightRosterIQ-backup-$(date +%%Y%%m%%d-%%H%%M%%S); fi && echo '📦 Extracting new build...' && cd /root/FlightRosterIQ && tar -xzf /root/flightrosteriq-update.tar.gz && echo '🔄 Restarting server...' && pkill -f 'node.*crew-server.js' || pkill -f 'node.*working-server.js' || true && nohup node crew-server.js > server.log 2>&1 & && echo '✅ Deployment complete!' && echo '🌐 FlightRosterIQ is running at: http://157.245.126.24:8080'"

REM Cleanup
del flightrosteriq-update.tar.gz

echo.
echo ✅ Deployment completed successfully!
echo 🔗 Access your FlightRosterIQ crew scraper at:
echo    http://157.245.126.24:8080
echo.
echo 🧪 Test authentication with ABX Air or ATI credentials
echo 📊 Ready for 400+ pilots!
pause