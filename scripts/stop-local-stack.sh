#!/bin/bash

# 로컬 전체 스택 중지 스크립트
# 실행 중인 모든 서비스를 중지하고 리소스를 정리합니다.

set -e  # 에러 발생 시 중단

# 헬퍼 함수 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

echo "🛑 로컬 전체 스택 중지..."
echo ""

# 루트 디렉토리로 이동
cd "$SCRIPT_DIR/.."

# docker-compose 명령어 확인
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    log_error "docker-compose를 찾을 수 없습니다."
    exit 1
fi

cd blynk_backend

log_info "Step 1: 서비스 중지"
log_info "실행 중인 컨테이너 중지 중..."
$DOCKER_COMPOSE_CMD -f docker-compose.local.yml down || {
    log_error "서비스 중지 실패"
    exit 1
}
log_success "서비스 중지 완료"
echo ""

log_info "Step 2: 리소스 정리 옵션"
read -p "볼륨도 삭제하시겠습니까? (데이터가 삭제됩니다) (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "볼륨 삭제 중..."
    $DOCKER_COMPOSE_CMD -f docker-compose.local.yml down -v || {
        log_warning "볼륨 삭제 중 오류 발생 (무시 가능)"
    }
    log_success "볼륨 삭제 완료"
else
    log_info "볼륨은 유지됩니다"
fi
echo ""

log_info "Step 3: 사용하지 않는 리소스 정리"
read -p "사용하지 않는 Docker 이미지와 컨테이너를 정리하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "사용하지 않는 리소스 정리 중..."
    docker system prune -f || {
        log_warning "리소스 정리 중 오류 발생 (무시 가능)"
    }
    log_success "리소스 정리 완료"
else
    log_info "리소스 정리를 건너뜁니다"
fi
echo ""

log_success "✅ 로컬 전체 스택 중지 완료!"
echo ""
log_info "다음 단계:"
echo "  - 스택 다시 시작: npm run docker:local:up"
echo ""
