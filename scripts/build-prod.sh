#!/bin/bash

# 프로덕션용 프론트엔드 빌드 스크립트
# 사용법: ./scripts/build-prod.sh

set -e

echo "🔨 프로덕션용 프론트엔드 빌드 중..."

# 프로젝트 루트로 이동
cd "$(dirname "$0")/.."

# 프로덕션 환경 변수 확인
if [ -z "$VITE_API_URL" ] || [ -z "$VITE_FRONTEND_BASE_URL" ]; then
  echo "⚠️  환경 변수가 설정되지 않았습니다."
  echo "📝 다음 환경 변수를 설정하세요:"
  echo "   export VITE_API_URL=https://api.qoodle.top"
  echo "   export VITE_FRONTEND_BASE_URL=https://qoodle.top"
  echo ""
  echo "또는 .env.production 파일을 사용하세요."
  exit 1
fi

# 빌드 실행
npm run build

echo "✅ 프로덕션 빌드 완료!"
echo "📦 빌드 결과: dist/"
echo ""
echo "📝 배포 방법:"
echo "   1. GitHub Actions를 통해 자동 배포 (권장)"
echo "   2. 수동 배포: dist 폴더를 서버에 업로드"
