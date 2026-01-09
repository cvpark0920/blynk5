#!/bin/bash

# 배포 준비 스크립트
# 이 스크립트는 배포 전에 필요한 파일들이 모두 준비되었는지 확인합니다.

set -e

echo "🚀 배포 준비 상태 확인 중..."

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 체크 함수
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $1"
        return 0
    else
        echo -e "${RED}❌${NC} $1 (없음)"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅${NC} $1/"
        return 0
    else
        echo -e "${RED}❌${NC} $1/ (없음)"
        return 1
    fi
}

# 필수 파일 체크
echo ""
echo "📁 필수 파일 확인:"
echo "=================="

MISSING_FILES=0

# CI/CD 워크플로우
check_file ".github/workflows/deploy.yml" || MISSING_FILES=$((MISSING_FILES + 1))

# 배포 파일들
check_file "deployment/deploy.sh" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "deployment/nginx.conf" || MISSING_FILES=$((MISSING_FILES + 1))

# 백엔드 파일들
check_file "blynk_backend/Dockerfile" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "blynk_backend/docker-compose.prod.yml" || MISSING_FILES=$((MISSING_FILES + 1))

# 프론트엔드 설정 파일들
check_file "blynkV5QR_ShopOperator/vite.config.ts" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "blynkV5QR_Customer/vite.config.ts" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "blynkV5QR_Administrator/vite.config.ts" || MISSING_FILES=$((MISSING_FILES + 1))

# 패키지 파일들
check_file "blynk_backend/package.json" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "blynkV5QR_ShopOperator/package.json" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "blynkV5QR_Customer/package.json" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "blynkV5QR_Administrator/package.json" || MISSING_FILES=$((MISSING_FILES + 1))

echo ""
echo "📚 문서 파일 확인:"
echo "=================="

check_file "deployment/SETUP_CHECKLIST.md" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "deployment/WHAT_YOU_NEED_TO_DO.md" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "deployment/ARCHITECTURE_EXPLANATION.md" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "deployment/QUICK_START.md" || MISSING_FILES=$((MISSING_FILES + 1))
check_file "blynk_backend/DEPLOYMENT.md" || MISSING_FILES=$((MISSING_FILES + 1))

# Git 저장소 확인
echo ""
echo "🔍 Git 저장소 확인:"
echo "=================="

if [ -d ".git" ]; then
    echo -e "${GREEN}✅${NC} Git 저장소가 존재합니다"
    
    # 브랜치 확인
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅${NC} 현재 브랜치: $CURRENT_BRANCH"
    
    # 변경사항 확인
    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        echo -e "${YELLOW}⚠️${NC} 커밋되지 않은 변경사항이 있습니다"
        echo ""
        echo "다음 명령어로 커밋하세요:"
        echo "  git add ."
        echo "  git commit -m 'Add CI/CD deployment configuration'"
        echo "  git push origin main"
    else
        echo -e "${GREEN}✅${NC} 모든 변경사항이 커밋되었습니다"
    fi
else
    echo -e "${YELLOW}⚠️${NC} Git 저장소가 없습니다"
    echo ""
    echo "Git 저장소를 초기화하려면 다음 명령어를 실행하세요:"
    echo "  git init"
    echo "  git add ."
    echo "  git commit -m 'Initial commit'"
    echo ""
    echo "또는 기존 GitHub 저장소와 연결:"
    echo "  git remote add origin <your-repo-url>"
    echo "  git push -u origin main"
fi

# 배포 스크립트 실행 권한 확인
echo ""
echo "🔐 실행 권한 확인:"
echo "=================="

if [ -f "deployment/deploy.sh" ]; then
    if [ -x "deployment/deploy.sh" ]; then
        echo -e "${GREEN}✅${NC} deployment/deploy.sh 실행 권한 있음"
    else
        echo -e "${YELLOW}⚠️${NC} deployment/deploy.sh 실행 권한 없음"
        echo "다음 명령어로 권한 부여: chmod +x deployment/deploy.sh"
    fi
fi

# 최종 결과
echo ""
echo "=================="
if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN}✅ 모든 필수 파일이 준비되었습니다!${NC}"
    echo ""
    echo "다음 단계:"
    echo "1. GitHub에 코드 푸시"
    echo "2. GitHub Secrets 설정"
    echo "3. DigitalOcean Droplet 생성 및 설정"
    echo ""
    echo "자세한 내용은 deployment/QUICK_START.md를 참조하세요."
else
    echo -e "${RED}❌ $MISSING_FILES 개의 필수 파일이 없습니다${NC}"
    echo ""
    echo "누락된 파일을 확인하고 추가하세요."
fi

exit $MISSING_FILES
