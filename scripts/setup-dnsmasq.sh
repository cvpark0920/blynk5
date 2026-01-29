#!/bin/bash

# dnsmasq 설정 스크립트 (macOS)
# 로컬 개발 환경에서 서브도메인을 사용할 수 있도록 설정합니다.

set -e

echo "🔧 dnsmasq 설정 시작..."

# Homebrew 설치 확인
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew가 설치되어 있지 않습니다."
    echo "   다음 명령어로 설치하세요: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

# dnsmasq 설치 확인 및 설치
if ! command -v dnsmasq &> /dev/null; then
    echo "📦 dnsmasq 설치 중..."
    brew install dnsmasq
else
    echo "✅ dnsmasq가 이미 설치되어 있습니다."
fi

# 설정 파일 생성
CONFIG_FILE="/usr/local/etc/dnsmasq.conf"
echo "📝 dnsmasq 설정 파일 생성: $CONFIG_FILE"

# 기존 설정 파일 백업
if [ -f "$CONFIG_FILE" ]; then
    echo "   기존 설정 파일 백업 중..."
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# 설정 파일 생성/업데이트
cat > "$CONFIG_FILE" << 'EOF'
# Blynk 서브도메인 개발 환경 설정
# 모든 .localhost 서브도메인을 127.0.0.1로 리졸브
address=/.localhost/127.0.0.1

# 로컬에서만 리스닝
listen-address=127.0.0.1

# 로그 활성화 (선택사항)
# log-queries
# log-facility=/var/log/dnsmasq.log
EOF

echo "✅ 설정 파일 생성 완료"

# dnsmasq 서비스 시작
echo "🚀 dnsmasq 서비스 시작 중..."
if brew services list | grep -q "dnsmasq.*started"; then
    echo "   dnsmasq가 이미 실행 중입니다. 재시작합니다..."
    brew services restart dnsmasq
else
    brew services start dnsmasq
fi

# DNS 설정 안내
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ dnsmasq 설정 완료!"
echo ""
echo "📋 다음 단계: macOS DNS 설정"
echo ""
echo "1. 시스템 설정 열기"
echo "2. 네트워크 → 고급 → DNS 탭"
echo "3. '+' 버튼 클릭"
echo "4. '127.0.0.1' 입력 후 추가"
echo "5. 127.0.0.1을 맨 위로 이동 (드래그)"
echo ""
echo "💡 또는 터미널에서 다음 명령어 실행:"
echo "   sudo networksetup -setdnsservers Wi-Fi 127.0.0.1 8.8.8.8"
echo "   (Wi-Fi를 사용하는 경우, 이더넷을 사용하면 'Ethernet'으로 변경)"
echo ""
echo "🧪 테스트:"
echo "   ping shop_1.localhost"
echo "   → 127.0.0.1로 응답해야 합니다"
echo ""
echo "📚 자세한 내용은 Docs/LOCAL_SUBDOMAIN_SETUP.md를 참고하세요."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
