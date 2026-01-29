#!/bin/bash

# 로컬 환경 전체 테스트 스크립트
# 사용법: ./scripts/test-local.sh

set -e

echo "🧪 로컬 환경 테스트 시작..."

# 프로젝트 루트로 이동
cd "$(dirname "$0")/.."

# 1. Docker Compose 상태 확인
echo "📦 Docker Compose 상태 확인 중..."
cd blynk_backend
if ! docker compose -f docker-compose.dev.yml ps | grep -q "Up"; then
  echo "⚠️  Docker Compose가 실행되지 않았습니다. 먼저 ./scripts/dev.sh를 실행하세요."
  exit 1
fi

# 2. 백엔드 헬스체크
echo "🏥 백엔드 헬스체크 중..."
if curl -s http://localhost:3000/health | grep -q "ok"; then
  echo "✅ 백엔드 정상 작동"
else
  echo "❌ 백엔드 응답 없음"
  exit 1
fi

# 3. 프론트엔드 빌드 테스트
echo "🔨 프론트엔드 빌드 테스트 중..."
cd ..
export VITE_API_URL=https://api.localhost
export VITE_FRONTEND_BASE_URL=https://admin.localhost
npm run build

# 4. 빌드 결과 확인
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo "✅ 프론트엔드 빌드 성공"
else
  echo "❌ 프론트엔드 빌드 실패"
  exit 1
fi

echo ""
echo "✅ 모든 테스트 통과!"
echo "📝 다음 단계:"
echo "   - 로컬 개발: ./scripts/dev.sh"
echo "   - 프로덕션 빌드: ./scripts/build-prod.sh"
