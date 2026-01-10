#!/bin/bash

# 로컬 Docker Compose 동작 테스트 스크립트
# 전체 시스템이 정상 작동하는지 확인합니다.

set -e  # 에러 발생 시 중단

echo "🚀 로컬 Docker Compose 동작 테스트 시작..."
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

# docker-compose 명령어 확인
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo -e "${RED}❌ docker-compose를 찾을 수 없습니다.${NC}"
    exit 1
fi

cd blynk_backend

echo -e "${BLUE}📋 Step 1: 환경 변수 확인${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}  ⚠️  .env 파일이 없습니다. .env.example을 복사하여 생성해주세요.${NC}"
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}     cp .env.example .env${NC}"
    fi
    exit 1
fi
echo -e "${GREEN}  ✅ .env 파일 확인 완료${NC}"
echo ""

echo -e "${BLUE}🐳 Step 2: Docker Compose로 서비스 시작${NC}"
echo -e "${YELLOW}  - 서비스 시작 중...${NC}"

# 기존 컨테이너 정리
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down 2>/dev/null || true

# 서비스 시작
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d || {
    echo -e "${RED}❌ Docker Compose 서비스 시작 실패${NC}"
    exit 1
}

echo -e "${GREEN}  ✅ 서비스 시작 완료${NC}"
echo ""

echo -e "${BLUE}⏳ Step 3: 서비스 시작 대기 (30초)${NC}"
sleep 30

echo ""
echo -e "${BLUE}🔍 Step 4: 서비스 상태 확인${NC}"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps

echo ""
echo -e "${BLUE}🏥 Step 5: 헬스 체크${NC}"

# 백엔드 헬스 체크
echo -e "${YELLOW}  - 백엔드 헬스 체크...${NC}"
for i in {1..10}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ 백엔드 헬스 체크 성공${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}  ❌ 백엔드 헬스 체크 실패 (10회 시도)${NC}"
        echo -e "${YELLOW}     로그 확인:${NC}"
        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs backend | tail -20
        exit 1
    fi
    echo "    시도 $i/10..."
    sleep 3
done

echo ""
echo -e "${BLUE}📊 Step 6: 로그 확인${NC}"
echo -e "${YELLOW}  - 최근 백엔드 로그:${NC}"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs --tail=20 backend

echo ""
echo -e "${GREEN}🎉 로컬 Docker Compose 동작 테스트 완료!${NC}"
echo ""
echo -e "${BLUE}📝 다음 단계:${NC}"
echo "  - 서비스 중지: cd blynk_backend && $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down"
echo "  - 로그 확인: cd blynk_backend && $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f"
echo ""
