#!/bin/bash

# 백엔드 로그 분석 스크립트
# Docker 컨테이너의 로그를 파일로 저장하고 분석합니다

LOG_DIR="./logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/backend_${TIMESTAMP}.log"
ANALYSIS_FILE="${LOG_DIR}/analysis_${TIMESTAMP}.txt"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

echo "📋 백엔드 로그 수집 시작..."
echo "로그 파일: $LOG_FILE"
echo "분석 파일: $ANALYSIS_FILE"
echo ""

# Docker 컨테이너 로그 수집 (최근 1000줄)
echo "🔍 Docker 컨테이너 로그 수집 중..."
docker logs --tail 1000 blynk_backend_dev > "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 로그 수집 완료"
else
    echo "❌ 로그 수집 실패"
    exit 1
fi

# 로그 분석
echo ""
echo "📊 로그 분석 중..."

# 분석 결과를 파일로 저장
{
    echo "=== 백엔드 로그 분석 리포트 ==="
    echo "생성 시간: $(date)"
    echo "로그 파일: $LOG_FILE"
    echo ""
    
    echo "=== 1. 중국어/러시아어 메시지 관련 로그 ==="
    echo ""
    grep -E "ChatService.*createMessage|ChatService.*getChatHistory|ChatController.*getChatHistory" "$LOG_FILE" | grep -E "textZh|textRu|textZH|textRU|중국어|러시아어|zh|ru" | tail -50
    
    echo ""
    echo "=== 2. 메시지 저장 로그 (최근 20개) ==="
    echo ""
    grep "ChatService.*createMessage.*저장된 메시지" "$LOG_FILE" | tail -20
    
    echo ""
    echo "=== 3. 메시지 조회 로그 (최근 20개) ==="
    echo ""
    grep "ChatService.*getChatHistory.*조회된 메시지" "$LOG_FILE" | tail -20
    
    echo ""
    echo "=== 4. API 응답 로그 (최근 20개) ==="
    echo ""
    grep "ChatController.*getChatHistory.*Response message" "$LOG_FILE" | tail -20
    
    echo ""
    echo "=== 5. 전체 로그 통계 ==="
    echo ""
    echo "총 로그 라인 수: $(wc -l < "$LOG_FILE")"
    echo "createMessage 로그 수: $(grep -c "ChatService.*createMessage" "$LOG_FILE" || echo 0)"
    echo "getChatHistory 로그 수: $(grep -c "ChatService.*getChatHistory" "$LOG_FILE" || echo 0)"
    echo "textZh 관련 로그 수: $(grep -c "textZh\|textZH" "$LOG_FILE" || echo 0)"
    echo "textRu 관련 로그 수: $(grep -c "textRu\|textRU" "$LOG_FILE" || echo 0)"
    
    echo ""
    echo "=== 6. 최근 에러 로그 ==="
    echo ""
    grep -i "error\|fail\|exception" "$LOG_FILE" | tail -20
    
} > "$ANALYSIS_FILE"

echo "✅ 분석 완료"
echo ""
echo "📄 분석 결과: $ANALYSIS_FILE"
echo "📄 전체 로그: $LOG_FILE"
echo ""
echo "분석 결과 미리보기:"
echo "---"
head -50 "$ANALYSIS_FILE"
