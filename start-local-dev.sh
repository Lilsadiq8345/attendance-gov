#!/bin/bash

# Local Development Script
# Frontend runs locally, backend runs on Render

echo "🚀 Starting Local Development Environment"
echo "Frontend: http://localhost:8080"
echo "Backend: https://attendance-gov-backend.onrender.com"
echo ""

# Set environment variables for local development
export VITE_API_URL=https://attendance-gov-backend.onrender.com
export VITE_APP_NAME="Attendance Management System (Local Dev)"
export VITE_APP_VERSION="1.0.0-dev"

echo "Environment variables set:"
echo "VITE_API_URL=$VITE_API_URL"
echo "VITE_APP_NAME=$VITE_APP_NAME"
echo "VITE_APP_VERSION=$VITE_APP_VERSION"
echo ""

# Start the development server
echo "Starting Vite development server..."
npm run dev
