#!/bin/bash
#############################################################
# VelocityDRIVE GUI - Portable Build Script
# PyInstaller를 사용한 단일 실행 파일 생성
#############################################################

echo "🔨 VelocityDRIVE GUI 포터블 빌드 시작..."

# PyInstaller 설치 확인
if ! python3 -c "import PyInstaller" 2>/dev/null; then
    echo "📦 PyInstaller 설치 중..."
    pip3 install --break-system-packages pyinstaller
fi

# 의존성 설치
pip3 install --break-system-packages flask flask-cors pyserial

# PyInstaller spec 파일 생성
cat > velocitydrive.spec << 'EOF'
# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('static', 'static'),
    ],
    hiddenimports=[
        'flask',
        'flask_cors',
        'serial',
        'serial.tools',
        'serial.tools.list_ports',
        'serial.tools.list_ports_linux',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='VelocityDrive-GUI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None
)
EOF

# 빌드 실행
echo "🚀 빌드 시작..."
python3 -m PyInstaller velocitydrive.spec --noconfirm

# 실행 파일 이동
if [ -f "dist/VelocityDrive-GUI" ]; then
    mv dist/VelocityDrive-GUI ./VelocityDrive-GUI-Portable
    chmod +x VelocityDrive-GUI-Portable
    echo "✅ 빌드 완료! 실행 파일: ./VelocityDrive-GUI-Portable"

    # 클린업
    rm -rf build dist __pycache__ *.spec
else
    echo "❌ 빌드 실패"
    exit 1
fi