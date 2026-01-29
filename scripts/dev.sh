#!/bin/bash

# 로컬 개발 환경 시작 스크립트
# 사용법: ./scripts/dev.sh

set -e

echo "🚀 로컬 개발 환경 시작 중..."

# 프로젝트 루트로 이동
cd "$(dirname "$0")/.."

# 1. Docker Compose로 DB 시작
echo "📦 Docker Compose로 데이터베이스 시작 중..."
cd blynk_backend
docker compose -f docker-compose.dev.yml up -d

# 2. Prisma Client 생성
echo "🔧 Prisma Client 생성 중..."
npm run prisma:generate

# 3. 데이터베이스 마이그레이션 (필요시)
echo "🗄️  데이터베이스 마이그레이션 확인 중..."
npm run prisma:migrate || echo "⚠️  마이그레이션 스킵 (이미 최신 상태일 수 있음)"

# 4. 루트로 돌아가서 프론트엔드 개발 서버 시작
cd ..
echo "🎨 프론트엔드 개발 서버 시작 중..."
echo ""
echo "✅ 개발 환경이 준비되었습니다!"
echo ""
echo "📝 다음 명령어를 별도 터미널에서 실행하세요:"
echo ""
echo "   # 백엔드 개발 서버 (blynk_backend 디렉토리에서)"
echo "   cd blynk_backend && npm run dev"
echo ""
echo "   # 프론트엔드 개발 서버 (프로젝트 루트에서)"
echo "   npm run dev"
echo ""
echo "🌐 접속 URL:"
echo "   - 프론트엔드: http://localhost:5173"
echo "   - 백엔드 API: http://localhost:3000"
echo "   - Prisma Studio: cd blynk_backend && npm run prisma:studio"
echo ""
