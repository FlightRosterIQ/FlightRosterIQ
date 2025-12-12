@echo off
echo 🛩️ ABX Air Crew Scraper - Simple Deployment
echo ============================================
echo.
echo Copy this command and run it on your DigitalOcean server:
echo.
echo ssh root@157.245.126.24
echo.
echo Then paste this entire block:
echo.
echo ------------------------- COPY FROM HERE -------------------------
echo cd /root
echo cat ^> crew-simple.py ^<^< 'EOF'
type crew-app.py
echo EOF
echo python3 crew-simple.py
echo ------------------------- COPY TO HERE ---------------------------
echo.
echo After pasting, your ABX Air Crew Scraper will be live at:
echo http://157.245.126.24:8080
echo.
pause