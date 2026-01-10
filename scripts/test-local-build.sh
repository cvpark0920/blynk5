#!/bin/bash

# 로컬 빌드 테스트 스크립트
# 이 스크립트는 GitHub Actions와 동일한 방식으로 로컬에서 빌드를 테스트합니다.

set -e  # 에러 발생 시 중단

echo "🚀 로컬 빌드 테스트 시작..."

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 루트 디렉토리로 이동
cd "$(dirname "$0")/.."

echo -e "${YELLOW}📦 Step 1: UnifiedAuthContext 파일 복사${NC}"

# ShopOperator
echo "  - ShopOperator에 UnifiedAuthContext 복사 중..."
mkdir -p blynkV5QR_ShopOperator/src/context
cp src/context/UnifiedAuthContext.tsx blynkV5QR_ShopOperator/src/context/ || {
    echo -e "${RED}❌ ShopOperator 복사 실패${NC}"
    exit 1
}

# Customer
echo "  - Customer에 UnifiedAuthContext 복사 중..."
mkdir -p blynkV5QR_Customer/src/context
cp src/context/UnifiedAuthContext.tsx blynkV5QR_Customer/src/context/ || {
    echo -e "${RED}❌ Customer 복사 실패${NC}"
    exit 1
}

# Administrator
echo "  - Administrator에 UnifiedAuthContext 복사 중..."
mkdir -p blynkV5QR_Administrator/src/context
cp src/context/UnifiedAuthContext.tsx blynkV5QR_Administrator/src/context/ || {
    echo -e "${RED}❌ Administrator 복사 실패${NC}"
    exit 1
}

echo -e "${GREEN}✅ 파일 복사 완료${NC}"

echo -e "${YELLOW}📦 Step 2: 프론트엔드 빌드 테스트${NC}"

# ShopOperator 빌드
echo "  - ShopOperator 빌드 중..."
cd blynkV5QR_ShopOperator
npm ci || {
    echo -e "${RED}❌ ShopOperator 의존성 설치 실패${NC}"
    exit 1
}
npm run build || {
    echo -e "${RED}❌ ShopOperator 빌드 실패${NC}"
    exit 1
}
echo -e "${GREEN}✅ ShopOperator 빌드 성공${NC}"
cd ..

# Customer 빌드
echo "  - Customer 빌드 중..."
cd blynkV5QR_Customer
npm ci || {
    echo -e "${RED}❌ Customer 의존성 설치 실패${NC}"
    exit 1
}
npm run build || {
    echo -e "${RED}❌ Customer 빌드 실패${NC}"
    exit 1
}
echo -e "${GREEN}✅ Customer 빌드 성공${NC}"
cd ..

# Administrator 빌드
echo "  - Administrator 빌드 중..."
cd blynkV5QR_Administrator
npm ci || {
    echo -e "${RED}❌ Administrator 의존성 설치 실패${NC}"
    exit 1
}
npm run build || {
    echo -e "${RED}❌ Administrator 빌드 실패${NC}"
    exit 1
}
echo -e "${GREEN}✅ Administrator 빌드 성공${NC}"
cd ..

echo -e "${YELLOW}📦 Step 3: 빌드 결과 확인${NC}"

# 빌드 결과 확인
if [ -d "blynkV5QR_ShopOperator/dist" ] && [ -d "blynkV5QR_Customer/dist" ] && [ -d "blynkV5QR_Administrator/dist" ]; then
    echo -e "${GREEN}✅ 모든 빌드가 성공적으로 완료되었습니다!${NC}"
    echo ""
    echo "빌드 결과:"
    echo "  - ShopOperator: $(du -sh blynkV5QR_ShopOperator/dist | cut -f1)"
    echo "  - Customer: $(du -sh blynkV5QR_Customer/dist | cut -f1)"
    echo "  - Administrator: $(du -sh blynkV5QR_Administrator/dist | cut -f1)"
    echo ""
    echo -e "${GREEN}🎉 로컬 빌드 테스트 완료!${NC}"
else
    echo -e "${RED}❌ 빌드 결과 디렉토리가 없습니다${NC}"
    exit 1
fi
