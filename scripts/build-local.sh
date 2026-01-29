#!/bin/bash

# 로컬 테스트용 프론트엔드 빌드 스크립트
# DEPLOYMENT_WORKFLOW.md에 따른 로컬 빌드 절차
# 사용법: ./scripts/build-local.sh
# 또는: npm run build:local

set -e

echo "🔨 로컬 테스트용 프론트엔드 빌드 중..."

# 프로젝트 루트로 이동
cd "$(dirname "$0")/.."

# 로컬 환경 변수 설정
export VITE_API_URL=https://api.localhost
export VITE_FRONTEND_BASE_URL=https://admin.localhost

# 빌드 실행
npm run build

echo "✅ 로컬 빌드 완료!"
echo "📦 빌드 결과: dist/"
echo ""
echo "📝 다음 단계:"
echo "   - 백엔드 컨테이너에 동기화: npm run build:local:sync"
echo "   - 또는 수동 동기화: bash blynk_backend/scripts/sync-frontend.sh"
