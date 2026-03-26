#!/bin/bash
# Exit on error
set -e

echo "Starting deployment script..."
cd app

# Ensure we are using the right Node version if possible
node -v

echo "Installing dependencies..."
# Use --build-from-source for better-sqlite3 if needed, but npm ci should handle it if python is present
npm install

echo "Building application..."
npm run build

echo "Starting server..."
npm run server
