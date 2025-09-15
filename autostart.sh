#!/bin/bash

# Raspberry Pi Autostart Script for VelocityDRIVE Touch GUI
# Add this to /etc/rc.local or use systemd service

# Wait for network to be ready
sleep 10

# Set display for GUI (adjust if needed)
export DISPLAY=:0
export XAUTHORITY=/home/pi/.Xauthority

# Disable screen saver and power management
xset s off
xset -dpms
xset s noblank

# Hide mouse cursor after 3 seconds of inactivity
unclutter -idle 3 &

# Start the VelocityDRIVE Touch GUI
/home/pi/velocitydrive-touch-gui/start-gui.sh &

# Optional: Disable right-click context menu for touch screen
xinput set-prop "raspberrypi-ts" "libinput Click Method Enabled" 0 1