#!/bin/bash

# 로컬 도커 환경에서 서브도메인 테스트 스크립트

set -e

echo "🧪 서브도메인 테스트 시작..."

# 1. dnsmasq 설정 확인
echo ""
echo "1️⃣ dnsmasq 설정 확인..."
if brew services list | grep -q "dnsmasq.*started"; then
    echo "✅ dnsmasq가 실행 중입니다."
else
    echo "❌ dnsmasq가 실행되지 않았습니다."
    echo "   다음 명령어로 시작하세요: brew services start dnsmasq"
    exit 1
fi

# 2. DNS 설정 확인
echo ""
echo "2️⃣ DNS 설정 확인..."
dnsServers=$(scutil --dns | grep "nameserver\[0\]" | head -1)
if echo "$dnsServers" | grep -q "127.0.0.1"; then
    echo "✅ 로컬 DNS 서버(127.0.0.1)가 설정되어 있습니다."
else
    echo "⚠️  로컬 DNS 서버가 설정되지 않았습니다."
    echo "   시스템 설정 → 네트워크 → 고급 → DNS에서 127.0.0.1을 추가하세요."
fi

# 3. 서브도메인 리졸브 테스트
echo ""
echo "3️⃣ 서브도메인 리졸브 테스트..."
if ping -c 1 shop_1.localhost &> /dev/null; then
    echo "✅ shop_1.localhost 리졸브 성공"
else
    echo "❌ shop_1.localhost 리졸브 실패"
    echo "   DNS 설정을 확인하세요."
fi

# 4. 도커 컨테이너 상태 확인
echo ""
echo "4️⃣ 도커 컨테이너 상태 확인..."
cd "$(dirname "$0")/../blynk_backend"
if docker compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo "✅ 도커 컨테이너가 실행 중입니다."
else
    echo "⚠️  도커 컨테이너가 실행되지 않았습니다."
    echo "   다음 명령어로 시작하세요: docker compose -f docker-compose.dev.yml up -d"
fi

# 5. 데이터베이스 마이그레이션 확인
echo ""
echo "5️⃣ 데이터베이스 마이그레이션 확인..."
echo "   Prisma 마이그레이션을 실행하세요:"
echo "   cd blynk_backend && npx prisma migrate dev"

# 6. 테스트 데이터 생성 안내
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 다음 단계:"
echo ""
echo "1. 데이터베이스 마이그레이션 실행:"
echo "   cd blynk_backend"
echo "   npx prisma migrate dev --name add_subdomain_to_restaurant"
echo ""
echo "2. 테스트 식당 생성 (서브도메인: shop_1):"
echo "   - Admin 앱에서 식당 생성"
echo "   - 서브도메인 필드에 'shop_1' 입력"
echo ""
echo "3. 브라우저에서 테스트:"
echo "   http://shop_1.localhost:3000/shop/login"
echo "   http://shop_1.localhost:3000/customer/table/1"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
