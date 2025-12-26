#!/bin/bash
set -e

# Get the script's directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Starting pi-manager development environment..."

echo "Building Client (Svelte)..."
cd client
bun install
bun run build
cd ..

echo "Building Server (Go)..."
cd server
go build -o pi-manager ./cmd/pi-manager
cd ..

echo "All systems ready!"
echo "Starting server at http://127.0.0.1:8080"
echo "Press Ctrl+C to stop"

# Run server with allow-actions enabled for development
./server/pi-manager --addr 127.0.0.1:8080 --state ./server/state.json --allow-actions
