#!/bin/bash

# Kill any existing processes on ports 3000 and 5173/5174
echo "🔄 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null

# Wait a moment for ports to be freed
sleep 2

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if npm is installed
if ! command_exists npm; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing server dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd client && npm install && cd ..
fi

# Check if Vanta SDK is built
if [ ! -f "vanta-auditor-api-sdk-typescript/index.js" ]; then
    echo "🔨 Building Vanta SDK..."
    cd vanta-auditor-api-sdk-typescript
    npm install
    npm run build
    cd ..
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found! Please create one with your Vanta credentials."
    echo "Example .env file:"
    echo "VANTA_CLIENT_ID=your_client_id"
    echo "VANTA_CLIENT_SECRET=your_client_secret"
    exit 1
fi

# Start the backend server
echo "🚀 Starting backend server on port 3000..."
node server/index.js &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
for i in {1..10}; do
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo "✅ Backend is running!"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ Backend failed to start. Check the logs above."
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# Start the frontend
echo "🚀 Starting frontend server..."
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 3

# Display status
echo ""
echo "✨ Application is running!"
echo "📡 Backend API: http://localhost:3000"
echo "🌐 Frontend UI: http://localhost:5173 (or http://localhost:5174 if 5173 is in use)"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    # Also kill any node processes that might be lingering
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    lsof -ti:5174 | xargs kill -9 2>/dev/null
    echo "👋 Servers stopped. Goodbye!"
    exit 0
}

# Set up trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep script running
wait