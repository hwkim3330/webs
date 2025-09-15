#!/bin/bash
#############################################################
# VelocityDRIVE Touch GUI - Release Packaging Script
# Creates distributable packages for different platforms
#############################################################

VERSION="v2025.07.12"
PROJECT_NAME="velocitydrive-touch-gui"
RELEASE_DIR="releases"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📦 VelocityDRIVE Touch GUI - Release Packaging${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo ""

# Create release directory
mkdir -p $RELEASE_DIR
cd $RELEASE_DIR

# Clean old releases
rm -rf ${PROJECT_NAME}*

echo -e "${YELLOW}🔧 Creating release packages...${NC}"

# 1. Source Code Package
echo -e "${GREEN}📁 Creating source package...${NC}"
mkdir -p ${PROJECT_NAME}-${VERSION}-source
cd ${PROJECT_NAME}-${VERSION}-source

# Copy source files
cp -r ../../templates .
cp -r ../../static .
cp ../../app*.py .
cp ../../requirements.txt .
cp ../../README.md .
cp ../../LICENSE .
cp ../../.gitignore .
cp ../../VelocityDrive-GUI-Final .
cp ../../*.sh .
cp ../../*.service .
cp ../../*.desktop .

# Create archive
cd ..
tar -czf ${PROJECT_NAME}-${VERSION}-source.tar.gz ${PROJECT_NAME}-${VERSION}-source/
zip -r ${PROJECT_NAME}-${VERSION}-source.zip ${PROJECT_NAME}-${VERSION}-source/

echo -e "${GREEN}✅ Source package created${NC}"

# 2. Raspberry Pi Package
echo -e "${GREEN}🍓 Creating Raspberry Pi package...${NC}"
mkdir -p ${PROJECT_NAME}-${VERSION}-raspberrypi
cd ${PROJECT_NAME}-${VERSION}-raspberrypi

# Copy all files
cp -r ../${PROJECT_NAME}-${VERSION}-source/* .

# Add Pi-specific files
cat > install-pi.sh << 'EOF'
#!/bin/bash
# Raspberry Pi Installation Script

echo "🍓 Installing VelocityDRIVE Touch GUI for Raspberry Pi..."

# Install system dependencies
sudo apt-get update
sudo apt-get install -y python3 python3-pip chromium-browser xinput-calibrator unclutter

# Install Python packages
pip3 install --break-system-packages -r requirements.txt

# Make scripts executable
chmod +x *.sh VelocityDrive-GUI-Final

# Install desktop integration
./install.sh

# Setup auto-start
echo "Setup auto-start? (y/n)"
read -r setup_autostart
if [[ $setup_autostart =~ ^[Yy]$ ]]; then
    sudo cp velocitydrive-gui.service /etc/systemd/system/
    sudo systemctl enable velocitydrive-gui.service
    echo "✅ Auto-start configured"
fi

echo "🎉 Installation complete!"
echo "Run: ./VelocityDrive-GUI-Final"
EOF

chmod +x install-pi.sh

# Create archive
cd ..
tar -czf ${PROJECT_NAME}-${VERSION}-raspberrypi.tar.gz ${PROJECT_NAME}-${VERSION}-raspberrypi/

echo -e "${GREEN}✅ Raspberry Pi package created${NC}"

# 3. Demo Package (No Hardware Required)
echo -e "${GREEN}🎭 Creating demo package...${NC}"
mkdir -p ${PROJECT_NAME}-${VERSION}-demo
cd ${PROJECT_NAME}-${VERSION}-demo

# Copy demo-specific files
cp -r ../../templates .
cp -r ../../static .
cp ../../app_demo.py .
cp ../../requirements.txt .
cp ../../README.md .
cp ../../LICENSE .

# Create demo launcher
cat > run-demo.sh << 'EOF'
#!/bin/bash
echo "🎭 Starting VelocityDRIVE Demo Mode..."
echo "📝 Installing dependencies..."
pip3 install --user flask flask-cors pyserial 2>/dev/null || pip3 install flask flask-cors pyserial

echo "🚀 Starting server..."
python3 app_demo.py &
SERVER_PID=$!

sleep 2
echo "✅ Demo server started!"
echo "🌐 Open browser: http://localhost:8080"

if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8080
fi

echo "Press Enter to stop server..."
read
kill $SERVER_PID 2>/dev/null
echo "🛑 Server stopped"
EOF

chmod +x run-demo.sh

# Create archive
cd ..
zip -r ${PROJECT_NAME}-${VERSION}-demo.zip ${PROJECT_NAME}-${VERSION}-demo/

echo -e "${GREEN}✅ Demo package created${NC}"

# 4. Windows Package
echo -e "${GREEN}🪟 Creating Windows package...${NC}"
mkdir -p ${PROJECT_NAME}-${VERSION}-windows
cd ${PROJECT_NAME}-${VERSION}-windows

# Copy files
cp -r ../${PROJECT_NAME}-${VERSION}-source/* .

# Create Windows batch file
cat > run-windows.bat << 'EOF'
@echo off
echo VelocityDRIVE Touch GUI - Windows Launcher
echo.

echo Installing Python dependencies...
pip install flask flask-cors pyserial

echo.
echo Starting server...
start "VelocityDRIVE Server" python app_demo.py

timeout /t 3

echo Opening browser...
start http://localhost:8080

echo.
echo Server is running. Close this window to stop.
pause
EOF

# Create archive
cd ..
zip -r ${PROJECT_NAME}-${VERSION}-windows.zip ${PROJECT_NAME}-${VERSION}-windows/

echo -e "${GREEN}✅ Windows package created${NC}"

# 5. Docker Package
echo -e "${GREEN}🐳 Creating Docker package...${NC}"
mkdir -p ${PROJECT_NAME}-${VERSION}-docker
cd ${PROJECT_NAME}-${VERSION}-docker

# Copy source files
cp -r ../${PROJECT_NAME}-${VERSION}-source/* .

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Make scripts executable
RUN chmod +x *.sh VelocityDrive-GUI-Final

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Run demo mode by default (no hardware in container)
CMD ["python3", "app_demo.py"]
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  velocitydrive-gui:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DEMO_MODE=true
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# Create Docker instructions
cat > README-Docker.md << 'EOF'
# VelocityDRIVE Touch GUI - Docker

## Quick Start

```bash
# Build and run
docker-compose up --build

# Or build manually
docker build -t velocitydrive-gui .
docker run -p 8080:8080 velocitydrive-gui
```

## Access
Open browser: http://localhost:8080

## Features
- Demo mode enabled by default
- No hardware required
- All CLI features available
- Auto-restart on failure
EOF

# Create archive
cd ..
tar -czf ${PROJECT_NAME}-${VERSION}-docker.tar.gz ${PROJECT_NAME}-${VERSION}-docker/

echo -e "${GREEN}✅ Docker package created${NC}"

# 6. Create checksums
echo -e "${YELLOW}🔐 Creating checksums...${NC}"
sha256sum *.tar.gz *.zip > ${PROJECT_NAME}-${VERSION}-checksums.txt

# 7. Create release summary
cat > ${PROJECT_NAME}-${VERSION}-RELEASE.md << EOF
# VelocityDRIVE Touch GUI ${VERSION} - Release

## 📦 Available Packages

### 📁 Source Code
- \`${PROJECT_NAME}-${VERSION}-source.tar.gz\` - Full source code
- \`${PROJECT_NAME}-${VERSION}-source.zip\` - Full source code (Windows)

### 🍓 Raspberry Pi
- \`${PROJECT_NAME}-${VERSION}-raspberrypi.tar.gz\` - Pi-optimized with installer

### 🎭 Demo Mode
- \`${PROJECT_NAME}-${VERSION}-demo.zip\` - Hardware-free demonstration

### 🪟 Windows
- \`${PROJECT_NAME}-${VERSION}-windows.zip\` - Windows-ready package

### 🐳 Docker
- \`${PROJECT_NAME}-${VERSION}-docker.tar.gz\` - Containerized deployment

## 🚀 Quick Start

### Raspberry Pi
\`\`\`bash
tar -xzf ${PROJECT_NAME}-${VERSION}-raspberrypi.tar.gz
cd ${PROJECT_NAME}-${VERSION}-raspberrypi
./install-pi.sh
./VelocityDrive-GUI-Final
\`\`\`

### Demo Mode
\`\`\`bash
unzip ${PROJECT_NAME}-${VERSION}-demo.zip
cd ${PROJECT_NAME}-${VERSION}-demo
./run-demo.sh
\`\`\`

### Docker
\`\`\`bash
tar -xzf ${PROJECT_NAME}-${VERSION}-docker.tar.gz
cd ${PROJECT_NAME}-${VERSION}-docker
docker-compose up
\`\`\`

## ✨ Features

- ✅ Complete VelocityDRIVE CLI integration
- ✅ Touch-optimized UI (44px+ targets)
- ✅ TSN protocols (PTP, TAS, CBS, FRER)
- ✅ Demo mode (no hardware required)
- ✅ Raspberry Pi 7" display support
- ✅ Auto-installation scripts
- ✅ Docker containerization

## 📋 Requirements

- Python 3.8+
- Flask 2.3+
- Optional: Microchip LAN9662 board

## 🔐 Checksums

See \`${PROJECT_NAME}-${VERSION}-checksums.txt\` for file verification.

## 📞 Support

- GitHub: https://github.com/yourusername/velocitydrive-touch-gui
- Issues: https://github.com/yourusername/velocitydrive-touch-gui/issues
EOF

# Display summary
echo ""
echo -e "${BLUE}🎉 Release packaging complete!${NC}"
echo ""
echo -e "${GREEN}📦 Created packages:${NC}"
ls -la *.tar.gz *.zip *.txt *.md | awk '{print "  📄 " $9 " (" $5 " bytes)"}'

echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "  1. Test packages on different platforms"
echo "  2. Upload to GitHub releases"
echo "  3. Update documentation"
echo "  4. Announce release"

cd ..
echo ""
echo -e "${GREEN}✅ All packages ready in ${RELEASE_DIR}/${NC}"