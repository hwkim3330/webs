#!/bin/bash
#############################################################
# VelocityDRIVE GUI - 설치 스크립트
# 데스크톱 아이콘 및 메뉴 항목 생성
#############################################################

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📦 VelocityDRIVE GUI 설치 중..."

# 실행 권한 설정
chmod +x "$INSTALL_DIR/VelocityDrive-GUI"
chmod +x "$INSTALL_DIR/start-gui.sh"

# 데스크톱 파일 경로 업데이트
sed -i "s|Exec=.*|Exec=$INSTALL_DIR/VelocityDrive-GUI|g" "$INSTALL_DIR/VelocityDrive.desktop"
sed -i "s|Icon=.*|Icon=$INSTALL_DIR/static/img/icon.png|g" "$INSTALL_DIR/VelocityDrive.desktop"

# 아이콘 생성 (SVG)
cat > "$INSTALL_DIR/static/img/icon.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="32" fill="#0066cc"/>
  <text x="128" y="100" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">VD</text>
  <text x="128" y="140" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="white">Touch GUI</text>
  <circle cx="128" cy="180" r="20" fill="none" stroke="white" stroke-width="3"/>
  <circle cx="128" cy="180" r="10" fill="#00ff00"/>
</svg>
EOF

# PNG 아이콘 생성 (ImageMagick 사용 가능한 경우)
if command -v convert &> /dev/null; then
    convert "$INSTALL_DIR/static/img/icon.svg" -resize 256x256 "$INSTALL_DIR/static/img/icon.png"
else
    cp "$INSTALL_DIR/static/img/icon.svg" "$INSTALL_DIR/static/img/icon.png"
fi

# 데스크톱 파일 설치
if [ -d "$HOME/Desktop" ]; then
    cp "$INSTALL_DIR/VelocityDrive.desktop" "$HOME/Desktop/"
    chmod +x "$HOME/Desktop/VelocityDrive.desktop"
    echo "✅ 데스크톱 아이콘 생성됨"
fi

# 애플리케이션 메뉴에 추가
if [ -d "$HOME/.local/share/applications" ]; then
    cp "$INSTALL_DIR/VelocityDrive.desktop" "$HOME/.local/share/applications/"
    echo "✅ 애플리케이션 메뉴에 추가됨"
fi

# 심볼릭 링크 생성 (선택사항)
read -p "시스템 전역에서 실행 가능하도록 설정하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "$HOME/.local/bin" ]; then
        ln -sf "$INSTALL_DIR/VelocityDrive-GUI" "$HOME/.local/bin/velocitydrive-gui"
        echo "✅ 명령어 'velocitydrive-gui'로 실행 가능"
    fi
fi

echo ""
echo "🎉 설치 완료!"
echo ""
echo "실행 방법:"
echo "  1. 데스크톱 아이콘 더블클릭"
echo "  2. 터미널: $INSTALL_DIR/VelocityDrive-GUI"
echo "  3. 애플리케이션 메뉴에서 'VelocityDRIVE GUI' 검색"
echo ""