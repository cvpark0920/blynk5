#!/bin/bash

# Git 저장소 초기화 및 GitHub 연결 스크립트

set -e

echo "🔧 Git 저장소 설정 중..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 현재 디렉토리 확인
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 오류: 프로젝트 루트 디렉토리에서 실행해주세요${NC}"
    exit 1
fi

# Git 저장소 초기화
if [ ! -d ".git" ]; then
    echo -e "${GREEN}📦 Git 저장소 초기화 중...${NC}"
    git init
    
    # 기본 브랜치를 main으로 설정
    git branch -M main
    
    echo -e "${GREEN}✅ Git 저장소가 초기화되었습니다${NC}"
else
    echo -e "${YELLOW}⚠️ Git 저장소가 이미 존재합니다${NC}"
fi

# .gitignore 확인 및 생성
if [ ! -f ".gitignore" ]; then
    echo -e "${GREEN}📝 .gitignore 파일 생성 중...${NC}"
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build output
dist/
build/

# Environment variables
.env
.env.local
.env.development
.env.production
.env.test
.env.*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Prisma
prisma/migrations/

# Deployment
*.tar.gz
deployment-package/
EOF
    echo -e "${GREEN}✅ .gitignore 파일이 생성되었습니다${NC}"
else
    echo -e "${YELLOW}⚠️ .gitignore 파일이 이미 존재합니다${NC}"
fi

# 모든 파일 추가
echo -e "${GREEN}📦 파일 추가 중...${NC}"
git add .

# 커밋
echo -e "${GREEN}💾 커밋 중...${NC}"
git commit -m "Initial commit: Add CI/CD deployment configuration" || {
    echo -e "${YELLOW}⚠️ 커밋할 변경사항이 없습니다${NC}"
}

echo ""
echo -e "${GREEN}✅ Git 저장소 설정이 완료되었습니다!${NC}"
echo ""
echo "다음 단계:"
echo ""
echo "1. GitHub 저장소 생성 (아직 없다면):"
echo "   - https://github.com/new 에서 새 저장소 생성"
echo ""
echo "2. GitHub 저장소와 연결:"
echo "   git remote add origin <your-repo-url>"
echo ""
echo "3. 코드 푸시:"
echo "   git push -u origin main"
echo ""
echo "4. GitHub Secrets 설정:"
echo "   - GitHub 저장소 > Settings > Secrets and variables > Actions"
echo "   - 5개 Secrets 추가 (자세한 내용은 deployment/QUICK_START.md 참조)"
echo ""
