#!/bin/bash

# 배포 전 체크리스트 스크립트
# 배포 전에 모든 필수 사항이 준비되었는지 확인합니다.

set -e  # 에러 발생 시 중단

echo "🔍 배포 전 체크리스트 확인..."
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 루트 디렉토리로 이동
cd "$(dirname "$0")/.."

ERRORS=0
WARNINGS=0

# 체크 함수
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ $1${NC}"
        return 0
    else
        echo -e "${RED}  ❌ $1${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

warn() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

echo -e "${BLUE}📋 Step 1: Git 상태 확인${NC}"

# Git 저장소 확인
git rev-parse --git-dir > /dev/null 2>&1 && check "Git 저장소 확인" || {
    echo -e "${RED}  ❌ Git 저장소가 아닙니다${NC}"
    exit 1
}

# 커밋되지 않은 변경사항 확인
if [ -n "$(git status --porcelain)" ]; then
    warn "커밋되지 않은 변경사항이 있습니다"
    git status --short
else
    check "모든 변경사항이 커밋되었습니다"
fi

# 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    check "현재 브랜치: $CURRENT_BRANCH"
else
    warn "현재 브랜치가 main/master가 아닙니다: $CURRENT_BRANCH"
fi

echo ""
echo -e "${BLUE}📦 Step 2: 필수 파일 확인${NC}"

# GitHub Actions 워크플로우 확인
[ -f ".github/workflows/deploy.yml" ] && check "GitHub Actions 워크플로우 파일 존재" || ERRORS=$((ERRORS + 1))

# 배포 스크립트 확인
[ -f "deployment/deploy.sh" ] && check "배포 스크립트 존재" || ERRORS=$((ERRORS + 1))
[ -f "deployment/nginx.conf" ] && check "Nginx 설정 파일 존재" || ERRORS=$((ERRORS + 1))

# Docker 파일 확인
[ -f "blynk_backend/Dockerfile" ] && check "백엔드 Dockerfile 존재" || ERRORS=$((ERRORS + 1))
[ -f "blynk_backend/docker-compose.prod.yml" ] && check "Docker Compose 프로덕션 파일 존재" || ERRORS=$((ERRORS + 1))

# Vite 설정 확인
[ -f "blynkV5QR_ShopOperator/vite.config.ts" ] && check "ShopOperator Vite 설정 존재" || ERRORS=$((ERRORS + 1))
[ -f "blynkV5QR_Customer/vite.config.ts" ] && check "Customer Vite 설정 존재" || ERRORS=$((ERRORS + 1))
[ -f "blynkV5QR_Administrator/vite.config.ts" ] && check "Administrator Vite 설정 존재" || ERRORS=$((ERRORS + 1))

echo ""
echo -e "${BLUE}🔐 Step 3: GitHub Secrets 확인 (수동)${NC}"
echo -e "${YELLOW}  다음 GitHub Secrets가 설정되어 있는지 확인하세요:${NC}"
echo "    - DOCKER_USERNAME"
echo "    - DOCKER_PASSWORD"
echo "    - DROPLET_HOST"
echo "    - DROPLET_USER"
echo "    - DROPLET_SSH_KEY"
echo "    - VITE_API_URL (선택사항)"
echo ""

echo -e "${BLUE}📝 Step 4: 환경 변수 확인${NC}"

# 백엔드 .env.example 확인
if [ -f "blynk_backend/.env.example" ]; then
    check "백엔드 .env.example 파일 존재"
else
    warn "백엔드 .env.example 파일이 없습니다"
fi

echo ""
echo -e "${BLUE}🧪 Step 5: 로컬 빌드 테스트 권장${NC}"
echo -e "${YELLOW}  배포 전에 다음 명령어로 로컬 빌드를 테스트하는 것을 권장합니다:${NC}"
echo "    ./scripts/test-local-docker-build.sh"
echo ""

# 결과 요약
echo ""
echo -e "${BLUE}📊 체크리스트 결과${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}  ✅ 모든 필수 체크 통과 ($WARNINGS 경고)${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}  ⚠️  경고 사항을 확인해주세요${NC}"
    fi
    echo ""
    echo -e "${GREEN}🎉 배포 준비 완료!${NC}"
    exit 0
else
    echo -e "${RED}  ❌ $ERRORS 개의 오류 발견 ($WARNINGS 경고)${NC}"
    echo ""
    echo -e "${RED}배포 전에 위 오류를 수정해주세요.${NC}"
    exit 1
fi
