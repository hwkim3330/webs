#!/bin/bash

# VelocityDRIVE Touch GUI Startup Script for Raspberry Pi
# This script starts the web server and opens the browser in kiosk mode

echo "Starting VelocityDRIVE Touch GUI..."

# Change to application directory
cd "$(dirname "$0")"

# Install Python dependencies if needed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "Installing required Python packages..."
    pip3 install --break-system-packages flask flask-cors pyserial
fi

# Kill any existing instances
pkill -f "python3 app.py"

# Start the Flask server in the background
echo "Starting web server on port 8080..."
python3 app.py &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Check if server is running
if ! curl -s http://localhost:8080/api/health > /dev/null; then
    echo "Failed to start web server"
    exit 1
fi

echo "Server started successfully (PID: $SERVER_PID)"

# Open browser in kiosk mode (for Raspberry Pi with GUI)
if [ -n "$DISPLAY" ]; then
    echo "Opening browser in kiosk mode..."

    # Try Chromium first (most common on Raspberry Pi)
    if command -v chromium-browser &> /dev/null; then
        chromium-browser --kiosk --noerrdialogs --disable-infobars \
            --disable-session-crashed-bubble --disable-translate \
            --no-first-run --app=http://localhost:8080 &
    # Try Chromium alternative name
    elif command -v chromium &> /dev/null; then
        chromium --kiosk --noerrdialogs --disable-infobars \
            --disable-session-crashed-bubble --disable-translate \
            --no-first-run --app=http://localhost:8080 &
    # Fallback to Firefox
    elif command -v firefox &> /dev/null; then
        firefox --kiosk http://localhost:8080 &
    # Last resort - basic browser
    else
        xdg-open http://localhost:8080 &
    fi

    BROWSER_PID=$!
    echo "Browser opened (PID: $BROWSER_PID)"
else
    echo "No display detected. Access the GUI at http://localhost:8080"
fi

# Function to cleanup on exit
cleanup() {
    echo "Shutting down VelocityDRIVE Touch GUI..."
    kill $SERVER_PID 2>/dev/null
    if [ -n "$BROWSER_PID" ]; then
        kill $BROWSER_PID 2>/dev/null
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
echo "VelocityDRIVE Touch GUI is running. Press Ctrl+C to stop."
wait $SERVER_PID