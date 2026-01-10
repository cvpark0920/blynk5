#!/bin/bash

# 로컬 전체 스택 테스트 스크립트
# 전체 스택을 빌드하고 실행하여 기본 동작을 검증합니다.

set -e  # 에러 발생 시 중단

# 헬퍼 함수 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

echo "🚀 로컬 전체 스택 테스트 시작..."
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
    log_warning ".env 파일이 없습니다. .env.local.example을 참고하여 생성해주세요."
    if [ -f ".env.local.example" ]; then
        log_info "예: cp .env.local.example .env.local"
    fi
    exit 1
fi
log_success "환경 변수 파일 확인 완료"
echo ""

log_info "Step 2: 프론트엔드 빌드 확인"
cd ..

# 각 프론트엔드 앱의 dist 디렉토리 확인
for app in blynkV5QR_ShopOperator blynkV5QR_Customer blynkV5QR_Administrator; do
    if [ -d "$app/dist" ]; then
        log_success "$app 빌드 결과 존재"
    else
        log_warning "$app 빌드 결과가 없습니다. 빌드가 필요할 수 있습니다."
    fi
done

echo ""
cd blynk_backend

log_info "Step 3: Docker 이미지 빌드"
log_info "백엔드 및 프론트엔드 Docker 이미지 빌드 중..."
$DOCKER_COMPOSE_CMD -f docker-compose.local.yml build || {
    log_error "Docker 이미지 빌드 실패"
    exit 1
}
log_success "Docker 이미지 빌드 완료"
echo ""

log_info "Step 4: 서비스 시작"
log_info "기존 컨테이너 정리 중..."
$DOCKER_COMPOSE_CMD -f docker-compose.local.yml down 2>/dev/null || true

log_info "서비스 시작 중..."
$DOCKER_COMPOSE_CMD -f docker-compose.local.yml up -d || {
    log_error "서비스 시작 실패"
    exit 1
}
log_success "서비스 시작 완료"
echo ""

log_info "Step 5: 서비스 준비 대기"
sleep 10

# 컨테이너 상태 확인
log_info "컨테이너 상태 확인..."
CONTAINERS=(
    "blynk_backend_local"
    "blynk_shop_local"
    "blynk_customer_local"
    "blynk_admin_local"
    "blynk_nginx_local"
    "blynk_postgres_local"
    "blynk_redis_local"
)

check_all_containers "${CONTAINERS[@]}" || {
    log_error "일부 컨테이너가 실행되지 않았습니다"
    $DOCKER_COMPOSE_CMD -f docker-compose.local.yml ps
    exit 1
}
echo ""

log_info "Step 6: 헬스 체크"
log_info "백엔드 헬스 체크 대기 중..."
if wait_for_service "http://localhost:3000/health" "Backend" 30; then
    log_success "백엔드가 준비되었습니다"
else
    log_error "백엔드 헬스 체크 실패"
    log_info "백엔드 로그:"
    get_logs "blynk_backend_local" 30
    exit 1
fi

log_info "Nginx 헬스 체크..."
if wait_for_service "http://localhost:8080/health" "Nginx" 10; then
    log_success "Nginx가 준비되었습니다"
else
    log_error "Nginx 헬스 체크 실패"
    exit 1
fi
echo ""

log_info "Step 7: API 엔드포인트 테스트"
log_info "백엔드 API 테스트..."

# Health endpoint
if check_health "http://localhost:3000/health" "Backend API"; then
    log_success "Backend API health endpoint 정상"
else
    log_error "Backend API health endpoint 실패"
    exit 1
fi

# Nginx를 통한 API 접근
if check_health "http://localhost:8080/api/health" "Nginx API Proxy"; then
    log_success "Nginx API 프록시 정상"
else
    log_error "Nginx API 프록시 실패"
    exit 1
fi
echo ""

log_info "Step 8: 프론트엔드 접근성 테스트"
log_info "프론트엔드 앱 접근 테스트..."

# Shop Operator
if curl -f -s "http://localhost:8080/shop/" > /dev/null 2>&1; then
    log_success "Shop Operator 접근 가능"
else
    log_error "Shop Operator 접근 실패"
fi

# Customer
if curl -f -s "http://localhost:8080/customer/" > /dev/null 2>&1; then
    log_success "Customer 접근 가능"
else
    log_error "Customer 접근 실패"
fi

# Administrator
if curl -f -s "http://localhost:8080/admin/" > /dev/null 2>&1; then
    log_success "Administrator 접근 가능"
else
    log_error "Administrator 접근 실패"
fi
echo ""

log_info "Step 9: 포트 확인"
PORTS=(3000 8080 5432 6379)
for port in "${PORTS[@]}"; do
    if check_port "$port"; then
        log_success "Port $port is open"
    else
        log_error "Port $port is not accessible"
    fi
done
echo ""

log_info "Step 10: 에러 로그 확인"
ERROR_FOUND=false
for container in "${CONTAINERS[@]}"; do
    if ! check_error_logs "$container"; then
        ERROR_FOUND=true
    fi
done

if [ "$ERROR_FOUND" = true ]; then
    log_warning "일부 컨테이너에서 에러가 발견되었습니다. 로그를 확인해주세요."
else
    log_success "에러 로그 확인 완료"
fi
echo ""

log_success "🎉 로컬 전체 스택 테스트 완료!"
echo ""
log_info "서비스 접속 정보:"
echo "  - Backend API: http://localhost:3000"
echo "  - Frontend (Nginx): http://localhost:8080"
echo "  - Shop Operator: http://localhost:8080/shop/"
echo "  - Customer: http://localhost:8080/customer/"
echo "  - Administrator: http://localhost:8080/admin/"
echo ""
log_info "다음 명령어:"
echo "  - 로그 확인: cd blynk_backend && $DOCKER_COMPOSE_CMD -f docker-compose.local.yml logs -f"
echo "  - 서비스 중지: cd blynk_backend && $DOCKER_COMPOSE_CMD -f docker-compose.local.yml down"
echo ""
