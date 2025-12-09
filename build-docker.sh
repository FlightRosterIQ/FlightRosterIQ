#!/bin/bash

# Crew Scheduler Docker Build Script

set -e

echo "🐳 Building Crew Scheduler Docker Container..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t crew-scraper:latest .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo ""
    echo "🚀 To run the container:"
    echo "   docker run -p 3000:3000 crew-scraper:latest"
    echo ""
    echo "🔧 Or use Docker Compose:"
    echo "   docker-compose up -d"
    echo ""
    echo "🌐 Access the app at: http://localhost:3000"
else
    echo "❌ Docker build failed!"
    exit 1
fi