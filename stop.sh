#!/bin/bash

# Get the script's directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Stopping pi-manager services..."

# 1. Kill Backend (Production and Dev)
echo "Stopping backend on port 2001..."
PID_2001=$(lsof -ti:2001)
if [ ! -z "$PID_2001" ]; then
    kill -9 $PID_2001
    echo "✓ Stopped process on port 2001"
else
    echo "- No process found on port 2001"
fi

# 2. Kill Frontend Dev (if running)
echo "Stopping frontend dev on port 2000..."
PID_2000=$(lsof -ti:2000)
if [ ! -z "$PID_2000" ]; then
    kill -9 $PID_2000
    echo "✓ Stopped process on port 2000"
else
    echo "- No process found on port 2000"
fi

echo "Done."
