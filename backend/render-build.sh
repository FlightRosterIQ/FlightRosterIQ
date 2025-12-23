#!/usr/bin/env bash
# Build script for Render deployment

echo "Installing dependencies..."
npm install

echo "Installing Chrome for Puppeteer..."
npx puppeteer browsers install chrome

echo "Build complete!"
