# 🚀 VelocityDRIVE Touch GUI

**Touch-Optimized Web Interface for Microchip VelocityDRIVE LAN9662 Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/Flask-2.3+-green.svg)](https://flask.palletsprojects.com/)

A complete web-based control center for Microchip's VelocityDRIVE CLI tools, designed specifically for **Raspberry Pi touchscreens** and TSN (Time-Sensitive Networking) applications.

![VelocityDRIVE GUI Screenshot](docs/screenshot-main.png)

## ✨ Features

### 🎯 **Touch-Optimized Interface**
- **44px+ touch targets** for reliable finger interaction
- **7-inch display optimization** for Raspberry Pi official touchscreen
- **Kiosk mode support** for dedicated control panels
- **Responsive design** that adapts to different screen sizes

### 🔧 **Complete CLI Integration**
- **All mvdct commands** wrapped in intuitive web interface
- **Real-time feedback** with visual status indicators
- **Batch operations** for multiple commands
- **Raw console access** for advanced users

### 🌐 **TSN Protocol Support**
- **IEEE 1588 PTP** - Precision Time Protocol configuration
- **IEEE 802.1Qbv TAS** - Time-Aware Shaper scheduling
- **IEEE 802.1Qav CBS** - Credit-Based Shaper parameters
- **IEEE 802.1CB FRER** - Frame Replication and Elimination
- **Real-time statistics** and monitoring

### 🎭 **Demo Mode**
- **Hardware-free testing** with simulated responses
- **Realistic data simulation** for development and training
- **Automatic hardware detection** and mode switching

## 🚀 Quick Start

### One-Click Installation & Launch

```bash
# Clone repository
git clone https://github.com/yourusername/velocitydrive-touch-gui.git
cd velocitydrive-touch-gui

# Run the final launcher (auto-installs dependencies)
./VelocityDrive-GUI-Final
```

The launcher will automatically:
- ✅ Install Python dependencies
- ✅ Detect connected hardware
- ✅ Choose appropriate mode (Hardware/Demo)
- ✅ Start web server
- ✅ Open browser

### Alternative Launch Methods

```bash
# Hardware mode (with LAN9662 connected)
python3 app_complete.py

# Demo mode (no hardware required)
python3 app_demo.py

# Basic mode
python3 app.py
```

## 📋 Requirements

### Software
- **Python 3.8+**
- **Flask 2.3+**
- **Flask-CORS**
- **PySerial** (for serial communication)

### Hardware (Optional)
- **Microchip LAN9662 VelocityDRIVE** evaluation board
- **Raspberry Pi** with 7-inch touchscreen
- **USB cable** for board connection

### Supported Platforms
- ✅ **Raspberry Pi OS** (Recommended)
- ✅ **Ubuntu 20.04+**
- ✅ **Debian 11+**
- ✅ **Windows 10+** (with Python)
- ✅ **macOS** (with Python)

## 🏗️ Project Structure

```
velocitydrive-touch-gui/
├── 🚀 VelocityDrive-GUI-Final      # Main launcher (recommended)
├── 🐍 app_demo.py                 # Demo mode server
├── 🐍 app_complete.py             # Full hardware mode server
├── 🐍 app.py                      # Basic server
├── 📁 templates/
│   ├── index.html                 # Basic interface
│   └── index_complete.html        # Complete interface
├── 📁 static/
│   ├── 🎨 css/
│   │   ├── style.css              # Basic styles
│   │   └── style_complete.css     # Complete styles
│   ├── ⚡ js/
│   │   ├── app.js                 # Basic JavaScript
│   │   └── app_complete.js        # Complete JavaScript
│   └── 🖼️ img/                    # Images and icons
├── 🔧 scripts/
│   ├── install.sh                 # System installation
│   ├── autostart.sh              # Auto-start configuration
│   └── build-portable.sh         # Portable build
├── 📄 requirements.txt            # Python dependencies
├── 📖 README.md                   # This file
└── 📜 LICENSE                     # MIT License
```

## 🖥️ User Interface

### Main Navigation Tabs

| Tab | Description | Features |
|-----|-------------|----------|
| **🔌 Device** | Connection & Info | Port selection, device type, connection status |
| **🌳 YANG** | Data Operations | GET/SET/DELETE operations, RPC calls, catalogs |
| **⏰ TSN** | Network Config | PTP, TAS, CBS, FRER configuration |
| **🔄 Protocols** | Communication | CoAP and MUP1 message handling |
| **💾 Firmware** | Updates | Version check and firmware upgrade |
| **⚙️ Advanced** | Power Users | Import/Export, Patch, Batch operations |
| **💻 Console** | Direct Access | Raw CLI command execution |

### Touch-Friendly Design

- **Large buttons** (minimum 44px) for reliable touch interaction
- **High contrast** colors for outdoor visibility
- **Gesture support** for swipe navigation
- **Auto-hide elements** to maximize screen space
- **Toast notifications** for user feedback

## 🔧 Configuration

### CLI Tool Path

Update the CLI path in the Python files:

```python
# In app_demo.py, app_complete.py, or app.py
CLI_PATH = "/path/to/your/mvdct.cli"
```

### Network Settings

The web server runs on port **8080** by default. To change:

```python
app.run(host='0.0.0.0', port=8080, debug=True)
```

### Touch Screen Calibration

For Raspberry Pi touchscreen setup:

```bash
# Install calibration tool
sudo apt-get install xinput-calibrator

# Run calibration
xinput_calibrator

# Apply settings to /usr/share/X11/xorg.conf.d/99-calibration.conf
```

## 🎯 Raspberry Pi Deployment

### Automatic Startup

#### Method 1: systemd Service (Recommended)

```bash
# Copy service file
sudo cp velocitydrive-gui.service /etc/systemd/system/

# Enable and start
sudo systemctl enable velocitydrive-gui.service
sudo systemctl start velocitydrive-gui.service
```

#### Method 2: Desktop Autostart

```bash
# Install desktop integration
./install.sh

# Service will start automatically on login
```

### Kiosk Mode Setup

For dedicated control panel:

```bash
# Edit autostart
nano ~/.config/lxsession/LXDE-pi/autostart

# Add these lines:
@chromium-browser --kiosk --noerrdialogs --disable-infobars http://localhost:8080
@unclutter -idle 3
```

### Performance Optimization

```bash
# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable wifi-powersave

# GPU memory split for better graphics
echo "gpu_mem=128" | sudo tee -a /boot/config.txt

# Disable screen blanking
echo "@xset s noblank" >> ~/.config/lxsession/LXDE-pi/autostart
echo "@xset s off" >> ~/.config/lxsession/LXDE-pi/autostart
echo "@xset -dpms" >> ~/.config/lxsession/LXDE-pi/autostart
```

## 🔌 Hardware Connection

### LAN9662 Board Setup

1. **Connect USB cable** from board to Raspberry Pi
2. **Power on** the VelocityDRIVE board
3. **Check device** appears as `/dev/ttyACM0` or `/dev/ttyUSB0`
4. **Launch GUI** - hardware will be auto-detected

### Network Configuration

Connect Ethernet cables between:
- **Board Port 0** ↔ **PC/Pi Interface 1**
- **Board Port 1** ↔ **PC/Pi Interface 2**

For TSN testing, use TSN-capable network cards (Intel i210 recommended).

## 🎭 Demo Mode

Perfect for development, training, and demonstrations without hardware:

### Features
- ✅ **Realistic responses** matching actual CLI output
- ✅ **Dynamic data** with changing statistics
- ✅ **Error simulation** for testing error handling
- ✅ **All CLI commands** fully functional

### Use Cases
- 🎓 **Training** new users on TSN concepts
- 🧪 **Development** without hardware dependency
- 📊 **Demonstrations** at trade shows
- 🔍 **Testing** UI functionality

## 🛠️ Development

### Adding New Features

1. **Backend**: Add API endpoints in `app_complete.py`
2. **Frontend**: Update HTML in `templates/index_complete.html`
3. **Styling**: Modify CSS in `static/css/style_complete.css`
4. **Logic**: Add JavaScript in `static/js/app_complete.js`

### API Structure

All endpoints follow REST conventions:

```
GET  /api/health              # Health check
GET  /api/capabilities        # Feature list
POST /api/device/connect      # Device connection
POST /api/yang/get            # YANG data retrieval
POST /api/tsn/ptp/config      # PTP configuration
```

### Testing

```bash
# Test API endpoints
curl -X POST http://localhost:8080/api/device/connect \
  -H "Content-Type: application/json" \
  -d '{"device": "/dev/ttyACM0"}'

# Check server health
curl http://localhost:8080/api/health
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md).

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/velocitydrive-touch-gui.git
cd velocitydrive-touch-gui

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install development dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run in development mode
python3 app_demo.py
```

## 📚 Documentation

- 📖 **[User Manual](docs/user-manual.md)** - Complete usage guide
- 🔧 **[API Reference](docs/api-reference.md)** - REST API documentation
- 🎯 **[TSN Guide](docs/tsn-guide.md)** - Time-Sensitive Networking setup
- 🍓 **[Raspberry Pi Setup](docs/raspberry-pi.md)** - Detailed Pi configuration
- 🎭 **[Demo Mode Guide](docs/demo-mode.md)** - Using without hardware

## 🐛 Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check if port is in use
sudo netstat -tlnp | grep 8080

# Kill existing processes
pkill -f "python3 app"

# Check permissions
ls -la VelocityDrive-GUI-Final
```

#### Device Not Detected
```bash
# Check USB connections
lsusb

# Check serial devices
ls -la /dev/ttyACM* /dev/ttyUSB*

# Check permissions
sudo usermod -a -G dialout $USER
# (logout/login required)
```

#### Touch Not Working
```bash
# Check input devices
xinput list

# Test touch events
evtest

# Recalibrate touchscreen
xinput_calibrator
```

### Log Files

- **Server logs**: `/tmp/velocitydrive.log`
- **System logs**: `journalctl -u velocitydrive-gui`
- **Browser console**: F12 → Console tab

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Third-Party Software

- **Microchip VelocityDRIVE CLI**: Subject to Microchip's license terms
- **Flask Framework**: BSD-3-Clause License
- **Font Awesome Icons**: Font Awesome Free License

## 🙏 Acknowledgments

- **Microchip Technology Inc.** for VelocityDRIVE platform and CLI tools
- **Flask Community** for the excellent web framework
- **Raspberry Pi Foundation** for amazing hardware platform
- **TSN Task Group (IEEE 802.1)** for Time-Sensitive Networking standards

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/velocitydrive-touch-gui/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/velocitydrive-touch-gui/discussions)
- 📧 **Email**: support@yourdomain.com
- 💬 **Discord**: [Join our server](https://discord.gg/your-invite)

## 🗺️ Roadmap

### Version 2.1 (Q1 2025)
- [ ] **Multi-language support** (Korean, Japanese, German)
- [ ] **Dark/Light theme toggle**
- [ ] **Advanced logging dashboard**
- [ ] **Plugin system** for custom extensions

### Version 2.2 (Q2 2025)
- [ ] **MQTT integration** for IoT connectivity
- [ ] **Grafana dashboard** for long-term monitoring
- [ ] **REST API authentication**
- [ ] **Multi-device management**

### Version 3.0 (Q3 2025)
- [ ] **Docker containerization**
- [ ] **Kubernetes deployment**
- [ ] **Cloud integration**
- [ ] **AI-assisted configuration**

---

<div align="center">

**⭐ Star this repository if you find it useful! ⭐**

Made with ❤️ for the TSN community

</div>