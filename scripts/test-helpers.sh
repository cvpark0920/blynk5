#!/bin/bash

# 공통 테스트 헬퍼 함수
# 다른 테스트 스크립트에서 source로 사용

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 서비스가 준비될 때까지 대기
wait_for_service() {
    local url=$1
    local service_name=${2:-"Service"}
    local max_attempts=${3:-30}
    local attempt=1

    log_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_success "$service_name is ready!"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "$service_name failed to start after $max_attempts attempts"
            return 1
        fi
        
        echo "  Attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
}

# 헬스 체크
check_health() {
    local url=$1
    local service_name=${2:-"Service"}
    
    log_info "Checking $service_name health..."
    
    if curl -f -s "$url" > /dev/null 2>&1; then
        log_success "$service_name health check passed"
        return 0
    else
        log_error "$service_name health check failed"
        return 1
    fi
}

# API 요청 헬퍼
api_request() {
    local method=${1:-GET}
    local url=$2
    local data=${3:-""}
    local headers=${4:-""}
    
    if [ -n "$data" ]; then
        curl -X "$method" "$url" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data" \
            -s -w "\nHTTP_CODE:%{http_code}"
    else
        curl -X "$method" "$url" \
            $headers \
            -s -w "\nHTTP_CODE:%{http_code}"
    fi
}

# HTTP 상태 코드 확인
check_status_code() {
    local response=$1
    local expected_code=${2:-200}
    local actual_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    
    if [ "$actual_code" = "$expected_code" ]; then
        return 0
    else
        log_error "Expected HTTP $expected_code, got $actual_code"
        return 1
    fi
}

# Docker 컨테이너 상태 확인
check_container_status() {
    local container_name=$1
    local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null)
    
    if [ "$status" = "running" ]; then
        log_success "Container $container_name is running"
        return 0
    else
        log_error "Container $container_name is not running (status: $status)"
        return 1
    fi
}

# 모든 컨테이너가 실행 중인지 확인
check_all_containers() {
    local containers=("$@")
    local all_running=true
    
    for container in "${containers[@]}"; do
        if ! check_container_status "$container"; then
            all_running=false
        fi
    done
    
    if [ "$all_running" = true ]; then
        return 0
    else
        return 1
    fi
}

# 로그 추출
get_logs() {
    local container_name=$1
    local lines=${2:-50}
    
    docker logs --tail="$lines" "$container_name" 2>&1
}

# 에러 로그 확인
check_error_logs() {
    local container_name=$1
    local logs=$(get_logs "$container_name" 100)
    
    if echo "$logs" | grep -i "error\|fatal\|exception" > /dev/null; then
        log_warning "Found errors in $container_name logs:"
        echo "$logs" | grep -i "error\|fatal\|exception" | tail -5
        return 1
    else
        return 0
    fi
}

# 포트가 열려있는지 확인
check_port() {
    local port=$1
    local host=${2:-localhost}
    
    if nc -z "$host" "$port" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# 디렉토리 존재 확인
check_directory() {
    local dir=$1
    
    if [ -d "$dir" ]; then
        return 0
    else
        log_error "Directory not found: $dir"
        return 1
    fi
}

# 파일 존재 확인
check_file() {
    local file=$1
    
    if [ -f "$file" ]; then
        return 0
    else
        log_error "File not found: $file"
        return 1
    fi
}
