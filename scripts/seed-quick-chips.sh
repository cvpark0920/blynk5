#!/bin/bash

# Quick Chips 시드 데이터 실행 스크립트
# 사용법: ./scripts/seed-quick-chips.sh [local|production]

set -e

ENV=${1:-local}

echo "🌱 Quick Chips 시드 데이터 실행 중... (환경: $ENV)"

if [ "$ENV" = "local" ]; then
  echo "📦 로컬 환경에서 실행..."
  cd blynk_backend
  npx tsx prisma/seed.ts
elif [ "$ENV" = "production" ]; then
  echo "📦 프로덕션 환경에서 실행..."
  echo "서버에 SSH 접속 후 다음 명령어를 실행하세요:"
  echo ""
  echo "ssh root@165.232.172.98"
  echo "cd /opt/blynk-backend/blynk_backend"
  echo "docker compose exec backend npx tsx prisma/seed.ts"
  echo ""
  echo "또는 직접 실행:"
  echo "ssh root@165.232.172.98 'cd /opt/blynk-backend/blynk_backend && docker compose exec backend npx tsx prisma/seed.ts'"
else
  echo "❌ 잘못된 환경: $ENV"
  echo "사용법: ./scripts/seed-quick-chips.sh [local|production]"
  exit 1
fi

echo "✅ Quick Chips 시드 데이터 실행 완료!"
