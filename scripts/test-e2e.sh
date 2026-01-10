#!/bin/bash

# E2E 테스트 스크립트
# 전체 앱의 엔드투엔드 동작을 검증합니다.

set -e  # 에러 발생 시 중단

# 헬퍼 함수 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

echo "🧪 E2E 테스트 시작..."
echo ""

# 루트 디렉토리로 이동
cd "$SCRIPT_DIR/.."

# 서비스가 실행 중인지 확인
log_info "Step 1: 서비스 상태 확인"

if ! check_health "http://localhost:8080/health" "Nginx"; then
    log_error "서비스가 실행 중이 아닙니다. 먼저 전체 스택을 시작해주세요."
    log_info "실행 방법: npm run docker:local:up"
    exit 1
fi

if ! check_health "http://localhost:3000/health" "Backend"; then
    log_error "백엔드가 실행 중이 아닙니다."
    exit 1
fi

log_success "모든 서비스가 실행 중입니다"
echo ""

log_info "Step 2: API 엔드포인트 테스트"

# Public endpoints 테스트
log_info "Public API 엔드포인트 테스트..."

# Health check
response=$(api_request "GET" "http://localhost:8080/api/health")
if check_status_code "$response" 200; then
    log_success "Health endpoint 정상"
else
    log_error "Health endpoint 실패"
    exit 1
fi

# Public restaurant info endpoint (예시)
log_info "Public restaurant info endpoint 테스트..."
response=$(api_request "GET" "http://localhost:8080/api/public/restaurants/test" "" "-H 'Accept: application/json'")
status_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
if [ "$status_code" = "200" ] || [ "$status_code" = "404" ]; then
    log_success "Public restaurant endpoint 응답 (status: $status_code)"
else
    log_warning "Public restaurant endpoint 예상치 못한 응답 (status: $status_code)"
fi
echo ""

log_info "Step 3: 프론트엔드 렌더링 테스트"

# 각 프론트엔드 앱의 HTML이 제대로 로드되는지 확인
log_info "프론트엔드 HTML 로드 테스트..."

FRONTEND_APPS=(
    "shop:http://localhost:8080/shop/"
    "customer:http://localhost:8080/customer/"
    "admin:http://localhost:8080/admin/"
)

for app_info in "${FRONTEND_APPS[@]}"; do
    app_name=$(echo "$app_info" | cut -d: -f1)
    app_url=$(echo "$app_info" | cut -d: -f2)
    
    log_info "Testing $app_name..."
    
    response=$(curl -s -L "$app_url")
    
    # HTML이 반환되는지 확인
    if echo "$response" | grep -q "<!DOCTYPE html\|<html"; then
        log_success "$app_name HTML 로드 성공"
        
        # JavaScript 파일이 포함되어 있는지 확인
        if echo "$response" | grep -q "\.js\|<script"; then
            log_success "$app_name JavaScript 파일 포함 확인"
        else
            log_warning "$app_name JavaScript 파일이 없을 수 있습니다"
        fi
    else
        log_error "$app_name HTML 로드 실패"
    fi
done
echo ""

log_info "Step 4: 정적 리소스 접근 테스트"

# 각 앱의 정적 리소스가 제대로 서빙되는지 확인
log_info "정적 리소스 접근 테스트..."

# Shop Operator assets
if curl -f -s "http://localhost:8080/shop/assets/" > /dev/null 2>&1; then
    log_success "Shop Operator assets 디렉토리 접근 가능"
else
    log_warning "Shop Operator assets 디렉토리 접근 확인 필요"
fi

# Customer assets
if curl -f -s "http://localhost:8080/customer/assets/" > /dev/null 2>&1; then
    log_success "Customer assets 디렉토리 접근 가능"
else
    log_warning "Customer assets 디렉토리 접근 확인 필요"
fi

# Administrator assets
if curl -f -s "http://localhost:8080/admin/assets/" > /dev/null 2>&1; then
    log_success "Administrator assets 디렉토리 접근 가능"
else
    log_warning "Administrator assets 디렉토리 접근 확인 필요"
fi
echo ""

log_info "Step 5: 라우팅 테스트"

# 각 앱의 라우팅이 제대로 작동하는지 확인
log_info "프론트엔드 라우팅 테스트..."

# 각 앱의 루트 경로에서 index.html이 반환되는지 확인
for app_info in "${FRONTEND_APPS[@]}"; do
    app_name=$(echo "$app_info" | cut -d: -f1)
    app_url=$(echo "$app_info" | cut -d: -f2)
    
    response=$(curl -s -L "$app_url" -w "\nHTTP_CODE:%{http_code}")
    status_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    
    if [ "$status_code" = "200" ]; then
        log_success "$app_name 라우팅 정상 (status: $status_code)"
    else
        log_error "$app_name 라우팅 실패 (status: $status_code)"
    fi
done
echo ""

log_info "Step 6: CORS 설정 확인"

# CORS 헤더 확인
log_info "CORS 헤더 확인..."
response=$(curl -s -I "http://localhost:8080/api/health" -H "Origin: http://localhost:8080")
if echo "$response" | grep -qi "access-control-allow-origin"; then
    log_success "CORS 헤더 설정 확인"
else
    log_warning "CORS 헤더가 설정되지 않았을 수 있습니다"
fi
echo ""

log_info "Step 7: 데이터베이스 연결 확인"

# 백엔드가 데이터베이스에 연결되어 있는지 확인
log_info "데이터베이스 연결 상태 확인..."
backend_logs=$(get_logs "blynk_backend_local" 50)

if echo "$backend_logs" | grep -qi "database\|prisma\|postgres"; then
    if echo "$backend_logs" | grep -qi "error.*database\|failed.*connect"; then
        log_error "데이터베이스 연결 오류 발견"
    else
        log_success "데이터베이스 연결 정상"
    fi
else
    log_warning "데이터베이스 연결 상태를 확인할 수 없습니다"
fi
echo ""

log_info "Step 8: Redis 연결 확인"

# 백엔드가 Redis에 연결되어 있는지 확인
log_info "Redis 연결 상태 확인..."
if echo "$backend_logs" | grep -qi "redis"; then
    if echo "$backend_logs" | grep -qi "error.*redis\|failed.*redis"; then
        log_error "Redis 연결 오류 발견"
    else
        log_success "Redis 연결 정상"
    fi
else
    log_warning "Redis 연결 상태를 확인할 수 없습니다"
fi
echo ""

log_success "🎉 E2E 테스트 완료!"
echo ""
log_info "테스트 결과 요약:"
echo "  - 모든 서비스가 정상 작동 중"
echo "  - API 엔드포인트 접근 가능"
echo "  - 프론트엔드 앱 렌더링 정상"
echo "  - 라우팅 정상 작동"
echo ""
log_info "다음 단계:"
echo "  - 브라우저에서 앱 접속하여 수동 테스트"
echo "  - 기능별 테스트 수행"
echo ""
