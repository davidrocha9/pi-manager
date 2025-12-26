#!/bin/bash

# Get the script's directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Starting pi-manager production environment..."

# 1. Build Client
echo "Building Client (Svelte)..."
(
  cd client
  # Ensure dependencies are installed
  bun install > /dev/null 2>&1
  bun run build
)

# 2. Build Server
echo "Building Server (Go)..."
(
  cd server
  go build -o pi-manager ./cmd/pi-manager
)

# 3. Serve with nohup
echo "All systems ready!"
echo "Starting Backend (Go) with nohup on port 2001"
nohup ./server/pi-manager --addr 0.0.0.0:2001 --state ./server/state.json --allow-actions > pi-manager.log 2>&1 &

echo "Server running with PID: $!"
echo "Logs available in pi-manager.log"
