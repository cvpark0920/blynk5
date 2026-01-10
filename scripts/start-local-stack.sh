#!/bin/bash

# 로컬 전체 스택 시작 스크립트
# 전체 스택을 빌드하고 시작합니다.

set -e  # 에러 발생 시 중단

# 헬퍼 함수 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

echo "🚀 로컬 전체 스택 시작..."
echo ""

# 루트 디렉토리로 이동
cd "$SCRIPT_DIR/.."

# Docker가 실행 중인지 확인
if ! docker info > /dev/null 2>&1; then
    log_error "Docker가 실행 중이 아닙니다. Docker를 시작해주세요."
    exit 1
fi

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

log_info "Step 1: 환경 변수 확인"
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    log_warning ".env 파일이 없습니다."
    if [ -f ".env.local.example" ]; then
        log_info ".env.local.example을 참고하여 .env.local 파일을 생성해주세요."
        log_info "예: cp .env.local.example .env.local"
    fi
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    log_success "환경 변수 파일 확인 완료"
fi
echo ""

log_info "Step 2: 기존 컨테이너 정리"
log_info "기존 컨테이너 중지 및 제거 중..."
$DOCKER_COMPOSE_CMD -f docker-compose.local.yml down 2>/dev/null || true
log_success "기존 컨테이너 정리 완료"
echo ""

log_info "Step 3: Docker 이미지 빌드"
log_info "백엔드 및 프론트엔드 Docker 이미지 빌드 중..."
log_warning "이 작업은 몇 분이 소요될 수 있습니다..."
$DOCKER_COMPOSE_CMD -f docker-compose.local.yml build --no-cache || {
    log_error "Docker 이미지 빌드 실패"
    exit 1
}
log_success "Docker 이미지 빌드 완료"
echo ""

log_info "Step 4: 서비스 시작"
log_info "모든 서비스 시작 중..."
$DOCKER_COMPOSE_CMD -f docker-compose.local.yml up -d || {
    log_error "서비스 시작 실패"
    exit 1
}
log_success "서비스 시작 완료"
echo ""

log_info "Step 5: 서비스 준비 대기"
log_info "서비스가 준비될 때까지 대기 중..."
sleep 15

log_info "컨테이너 상태 확인..."
$DOCKER_COMPOSE_CMD -f docker-compose.local.yml ps
echo ""

log_info "Step 6: 헬스 체크"
log_info "백엔드 헬스 체크 대기 중..."
if wait_for_service "http://localhost:3000/health" "Backend" 60; then
    log_success "백엔드가 준비되었습니다"
else
    log_error "백엔드 헬스 체크 실패"
    log_info "백엔드 로그:"
    get_logs "blynk_backend_local" 50
    exit 1
fi

log_info "Nginx 헬스 체크..."
if wait_for_service "http://localhost:8080/health" "Nginx" 20; then
    log_success "Nginx가 준비되었습니다"
else
    log_error "Nginx 헬스 체크 실패"
    log_info "Nginx 로그:"
    get_logs "blynk_nginx_local" 30
    exit 1
fi
echo ""

log_success "🎉 로컬 전체 스택 시작 완료!"
echo ""
log_info "서비스 접속 정보:"
echo "  - Backend API: http://localhost:3000"
echo "  - Frontend (Nginx): http://localhost:8080"
echo "  - Shop Operator: http://localhost:8080/shop/"
echo "  - Customer: http://localhost:8080/customer/"
echo "  - Administrator: http://localhost:8080/admin/"
echo ""
log_info "유용한 명령어:"
echo "  - 로그 확인: cd blynk_backend && $DOCKER_COMPOSE_CMD -f docker-compose.local.yml logs -f"
echo "  - 서비스 상태: cd blynk_backend && $DOCKER_COMPOSE_CMD -f docker-compose.local.yml ps"
echo "  - 서비스 중지: npm run docker:local:down"
echo "  - 전체 스택 테스트: npm run test:local"
echo "  - E2E 테스트: npm run test:e2e"
echo ""
