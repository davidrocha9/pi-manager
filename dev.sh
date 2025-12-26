#!/bin/bash

# Get the script's directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping development servers..."
    # Kill all background processes started by this script
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap signals to ensure cleanup
trap cleanup SIGINT SIGTERM

echo "Starting pi-manager development environment..."

# 1. Start Go backend
echo "Starting Backend (Go) on http://127.0.0.1:2001"
(
  cd server
  go run ./cmd/pi-manager/main.go --addr 127.0.0.1:2001 --state ./state.json --allow-actions
) &

# 2. Start Frontend dev server
echo "Starting Frontend (Vite) with Hot Reload..."
(
  cd client
  # Ensure dependencies are installed
  bun install > /dev/null 2>&1
  bun run dev
) &

echo "All systems starting up!"
echo "Access the UI via Vite's port (http://localhost:2000)"
echo "API is proxied to http://127.0.0.1:2001"
echo "Press Ctrl+C to stop both servers"

# Wait for background processes
wait
