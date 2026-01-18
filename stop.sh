#!/bin/bash

# Get the script's directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Stopping pi-manager services..."

# 1. Kill Managed Projects (from state.json)
if [ -f "server/state.json" ]; then
    echo "Stopping managed projects..."
    # Extract all ports from state.json using grep/sed (simple but effective for this JSON structure)
    PROJECT_PORTS=$(grep -o '"ports": \[[^]]*\]' server/state.json | grep -o '[0-9]\+')
    
    for port in $PROJECT_PORTS; do
        PID=$(lsof -ti:$port)
        if [ ! -z "$PID" ]; then
            kill -9 $PID
            echo "✓ Stopped project on port $port"
        fi
    done
fi

# 2. Kill Backend (Production and Dev)
echo "Stopping pi-manager backend on port 2001..."
PID_2001=$(lsof -ti:2001)
if [ ! -z "$PID_2001" ]; then
    kill -9 $PID_2001
    echo "✓ Stopped pi-manager on port 2001"
fi

# 3. Kill Frontend Dev (if running)
echo "Stopping frontend dev on port 2000..."
PID_2000=$(lsof -ti:2000)
if [ ! -z "$PID_2000" ]; then
    kill -9 $PID_2000
    echo "✓ Stopped dev UI on port 2000"
fi

echo "Done."
