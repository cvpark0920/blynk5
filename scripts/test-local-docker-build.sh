#!/bin/bash

# 로컬 Docker 빌드 및 동작 테스트 스크립트
# 배포 전에 로컬에서 전체 빌드 프로세스를 검증합니다.

set -e  # 에러 발생 시 중단

echo "🚀 로컬 Docker 빌드 및 동작 테스트 시작..."
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 루트 디렉토리로 이동
cd "$(dirname "$0")/.."

# Docker가 실행 중인지 확인
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker가 실행 중이 아닙니다. Docker를 시작해주세요.${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Step 1: 환경 확인${NC}"
echo "  - Docker 버전 확인..."
docker --version
echo "  - Docker Compose 버전 확인..."
docker compose version || docker-compose --version
echo ""

echo -e "${BLUE}📦 Step 2: 프론트엔드 빌드 테스트${NC}"

# ShopOperator 빌드
echo -e "${YELLOW}  - ShopOperator 빌드 중...${NC}"
cd blynkV5QR_ShopOperator
npm ci || {
    echo -e "${RED}❌ ShopOperator 의존성 설치 실패${NC}"
    exit 1
}
npm run build || {
    echo -e "${RED}❌ ShopOperator 빌드 실패${NC}"
    exit 1
}
echo -e "${GREEN}  ✅ ShopOperator 빌드 성공${NC}"
cd ..

# Customer 빌드
echo -e "${YELLOW}  - Customer 빌드 중...${NC}"
cd blynkV5QR_Customer
npm ci || {
    echo -e "${RED}❌ Customer 의존성 설치 실패${NC}"
    exit 1
}
npm run build || {
    echo -e "${RED}❌ Customer 빌드 실패${NC}"
    exit 1
}
echo -e "${GREEN}  ✅ Customer 빌드 성공${NC}"
cd ..

# Administrator 빌드
echo -e "${YELLOW}  - Administrator 빌드 중...${NC}"
cd blynkV5QR_Administrator
npm ci || {
    echo -e "${RED}❌ Administrator 의존성 설치 실패${NC}"
    exit 1
}
npm run build || {
    echo -e "${RED}❌ Administrator 빌드 실패${NC}"
    exit 1
}
echo -e "${GREEN}  ✅ Administrator 빌드 성공${NC}"
cd ..

echo ""
echo -e "${BLUE}🐳 Step 3: 백엔드 Docker 빌드 테스트${NC}"

# Docker Hub 사용자명 확인 (선택사항)
if [ -z "$DOCKER_USERNAME" ]; then
    echo -e "${YELLOW}  ⚠️  DOCKER_USERNAME 환경변수가 설정되지 않았습니다.${NC}"
    echo -e "${YELLOW}     로컬 테스트용으로 'test' 태그를 사용합니다.${NC}"
    DOCKER_USERNAME="test"
fi

cd blynk_backend

echo -e "${YELLOW}  - 백엔드 Docker 이미지 빌드 중...${NC}"
docker build -t ${DOCKER_USERNAME}/blynk-backend:local-test . || {
    echo -e "${RED}❌ 백엔드 Docker 빌드 실패${NC}"
    exit 1
}
echo -e "${GREEN}  ✅ 백엔드 Docker 빌드 성공${NC}"

cd ..

echo ""
echo -e "${BLUE}🧪 Step 4: 빌드 결과 확인${NC}"

# 프론트엔드 빌드 결과 확인
if [ -d "blynkV5QR_ShopOperator/dist" ] && [ -d "blynkV5QR_Customer/dist" ] && [ -d "blynkV5QR_Administrator/dist" ]; then
    echo -e "${GREEN}  ✅ 모든 프론트엔드 빌드가 성공적으로 완료되었습니다!${NC}"
    echo ""
    echo "  빌드 결과:"
    echo "    - ShopOperator: $(du -sh blynkV5QR_ShopOperator/dist | cut -f1)"
    echo "    - Customer: $(du -sh blynkV5QR_Customer/dist | cut -f1)"
    echo "    - Administrator: $(du -sh blynkV5QR_Administrator/dist | cut -f1)"
else
    echo -e "${RED}  ❌ 일부 프론트엔드 빌드 결과 디렉토리가 없습니다${NC}"
    exit 1
fi

# Docker 이미지 확인
if docker images | grep -q "${DOCKER_USERNAME}/blynk-backend.*local-test"; then
    echo -e "${GREEN}  ✅ Docker 이미지가 성공적으로 생성되었습니다!${NC}"
    echo ""
    echo "  Docker 이미지:"
    docker images | grep "${DOCKER_USERNAME}/blynk-backend.*local-test" | head -1
else
    echo -e "${RED}  ❌ Docker 이미지가 생성되지 않았습니다${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 로컬 Docker 빌드 테스트 완료!${NC}"
echo ""
echo -e "${BLUE}📝 다음 단계:${NC}"
echo "  1. GitHub Actions에서 배포 워크플로우 실행"
echo "  2. 또는 'git push origin main'으로 자동 배포 트리거"
echo ""
