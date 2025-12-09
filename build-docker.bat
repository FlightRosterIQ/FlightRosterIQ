@echo off
REM Crew Scheduler Docker Build Script for Windows

echo 🐳 Building Crew Scheduler Docker Container...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Build the Docker image
echo 📦 Building Docker image...
docker build -t crew-scraper:latest .

if %errorlevel% equ 0 (
    echo ✅ Docker image built successfully!
    echo.
    echo 🚀 To run the container:
    echo    docker run -p 3000:3000 crew-scraper:latest
    echo.
    echo 🔧 Or use Docker Compose:
    echo    docker-compose up -d
    echo.
    echo 🌐 Access the app at: http://localhost:3000
) else (
    echo ❌ Docker build failed!
    pause
    exit /b 1
)

pause