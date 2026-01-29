#!/bin/bash
# 프론트엔드 빌드 파일을 백엔드 public 디렉토리로 복사하고 컨테이너 재시작
# DEPLOYMENT_WORKFLOW.md에 따른 로컬 도커 동기화 절차
# 사용법: bash blynk_backend/scripts/sync-frontend.sh
# 또는: npm run build:local:sync

# set -e를 제거하여 에러가 발생해도 계속 진행
set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/blynk_backend"

echo "🔄 프론트엔드 파일 동기화 중..."
echo "📝 DEPLOYMENT_WORKFLOW.md에 따른 로컬 도커 동기화 절차"

# dist 디렉토리 확인
if [ ! -d "$PROJECT_ROOT/dist" ]; then
  echo "❌ dist 디렉토리를 찾을 수 없습니다. 먼저 빌드를 실행하세요."
  echo "   실행: npm run build:local"
  exit 1
fi

# public 디렉토리로 복사
echo "📦 프론트엔드 파일 복사 중..."

# uploads 디렉토리 백업 (알림음 파일 등 보존)
UPLOADS_BACKUP_DIR=""
if [ -d "$BACKEND_DIR/public/uploads" ] && [ "$(ls -A $BACKEND_DIR/public/uploads 2>/dev/null)" ]; then
  UPLOADS_BACKUP_DIR=$(mktemp -d)
  echo "💾 uploads 디렉토리 백업 중..."
  cp -r "$BACKEND_DIR/public/uploads" "$UPLOADS_BACKUP_DIR/" 2>/dev/null
  if [ $? -eq 0 ] && [ -d "$UPLOADS_BACKUP_DIR/uploads" ]; then
    file_count=$(find "$UPLOADS_BACKUP_DIR/uploads" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "✅ uploads 백업 완료: $file_count 개 파일"
  else
    echo "⚠️  uploads 백업 실패"
    UPLOADS_BACKUP_DIR=""
  fi
fi

# dist의 각 파일/디렉토리를 개별적으로 복사 (uploads는 완전히 제외)
if [ -d "$PROJECT_ROOT/dist" ]; then
  # public 디렉토리 생성 (없으면)
  mkdir -p "$BACKEND_DIR/public"
  
  # dist의 각 항목을 개별적으로 복사 (uploads 제외)
  for item in "$PROJECT_ROOT/dist"/*; do
    if [ -e "$item" ]; then
      item_name=$(basename "$item")
      if [ "$item_name" != "uploads" ]; then
        echo "  복사 중: $item_name"
        rm -rf "$BACKEND_DIR/public/$item_name" 2>/dev/null || true
        cp -r "$item" "$BACKEND_DIR/public/" 2>/dev/null || true
      else
        echo "  건너뜀: uploads (보존됨)"
      fi
    fi
  done
fi

# uploads 디렉토리 복원 (백업이 있는 경우)
if [ -n "$UPLOADS_BACKUP_DIR" ] && [ -d "$UPLOADS_BACKUP_DIR/uploads" ]; then
  echo "🔄 uploads 디렉토리 복원 중..."
  mkdir -p "$BACKEND_DIR/public/uploads"
  # 백업된 uploads의 모든 내용 복원
  cp -r "$UPLOADS_BACKUP_DIR/uploads"/* "$BACKEND_DIR/public/uploads/" 2>/dev/null
  if [ $? -eq 0 ]; then
    file_count=$(find "$BACKEND_DIR/public/uploads" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "✅ uploads 디렉토리 복원 완료: $file_count 개 파일"
  else
    echo "⚠️  uploads 복원 실패"
  fi
  rm -rf "$UPLOADS_BACKUP_DIR"
elif [ ! -d "$BACKEND_DIR/public/uploads" ]; then
  # uploads 디렉토리가 없으면 생성
  echo "📁 uploads 디렉토리 생성 중..."
  mkdir -p "$BACKEND_DIR/public/uploads/notification-sounds"
fi

echo "✅ 파일 복사 완료"

# Docker 컨테이너 상태 확인 및 재시작
echo "🔄 백엔드 컨테이너 상태 확인 중..."
cd "$BACKEND_DIR"

# 컨테이너가 실행 중인지 확인
if docker compose -f docker-compose.dev.yml ps backend | grep -q "Up"; then
  echo "🔄 백엔드 컨테이너 재시작 중 (볼륨 마운트 동기화)..."
  docker compose -f docker-compose.dev.yml restart backend
  
  echo "✅ 동기화 완료!"
  echo "📝 파일이 컨테이너에 마운트되었는지 확인 중..."
  sleep 3
  
  if docker compose -f docker-compose.dev.yml exec -T backend test -f /app/public/index.html 2>/dev/null; then
    echo "✅ 컨테이너에 파일이 정상적으로 마운트되었습니다."
  else
    echo "⚠️  컨테이너에 파일이 아직 나타나지 않았습니다."
    echo "   볼륨 마운트 경로 확인: $BACKEND_DIR/public -> /app/public"
  fi
else
  echo "⚠️  백엔드 컨테이너가 실행 중이 아닙니다."
  echo "📝 컨테이너를 시작하려면 다음 명령을 실행하세요:"
  echo "   cd blynk_backend && docker compose -f docker-compose.dev.yml up -d"
  echo ""
  echo "✅ 파일 복사는 완료되었습니다. 컨테이너 시작 후 자동으로 마운트됩니다."
fi
