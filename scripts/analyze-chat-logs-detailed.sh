#!/bin/bash

# 상세 채팅 로그 분석 스크립트
# Docker 컨테이너의 채팅 관련 로그를 상세히 분석합니다

LOG_DIR="./logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DETAILED_LOG="${LOG_DIR}/detailed_chat_${TIMESTAMP}.log"
ANALYSIS_FILE="${LOG_DIR}/detailed_analysis_${TIMESTAMP}.txt"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

echo "📋 상세 채팅 로그 분석 시작..."
echo "로그 파일: $DETAILED_LOG"
echo "분석 파일: $ANALYSIS_FILE"
echo ""

# Docker 컨테이너 로그 수집 (최근 5000줄)
echo "🔍 Docker 컨테이너 로그 수집 중..."
docker logs --tail 5000 blynk_backend_dev 2>&1 > "$DETAILED_LOG"

# 채팅 관련 로그만 추출
CHAT_LOG="${LOG_DIR}/chat_only_${TIMESTAMP}.log"
grep -E "ChatService|ChatController|createMessage|getChatHistory|textZh|textRu|textZH|textRU|저장된|조회된|Response message" "$DETAILED_LOG" > "$CHAT_LOG"

echo "✅ 로그 수집 완료"
echo ""

# 분석 시작
{
    echo "=== 상세 채팅 로그 분석 리포트 ==="
    echo "생성 시간: $(date)"
    echo "전체 로그: $DETAILED_LOG"
    echo "채팅 로그: $CHAT_LOG"
    echo ""
    
    echo "=== 1. 최근 createMessage 로그 (메시지 저장) ==="
    echo ""
    grep -A 15 "ChatService.*createMessage.*저장된 메시지" "$CHAT_LOG" | tail -100
    
    echo ""
    echo "=== 2. 최근 getChatHistory 로그 (메시지 조회) ==="
    echo ""
    grep -A 15 "ChatService.*getChatHistory.*조회된 메시지" "$CHAT_LOG" | tail -100
    
    echo ""
    echo "=== 3. 최근 ChatController 응답 로그 ==="
    echo ""
    grep -A 15 "ChatController.*getChatHistory.*Response message" "$CHAT_LOG" | tail -100
    
    echo ""
    echo "=== 4. 러시아어/중국어 관련 로그 ==="
    echo ""
    grep -E "textRu|textRU|textZh|textZH|ru|zh|러시아어|중국어" "$CHAT_LOG" | tail -50
    
    echo ""
    echo "=== 5. 통계 ==="
    echo ""
    echo "총 로그 라인: $(wc -l < "$DETAILED_LOG")"
    echo "채팅 관련 로그: $(wc -l < "$CHAT_LOG")"
    echo "createMessage 로그: $(grep -c "createMessage.*저장된" "$CHAT_LOG" || echo 0)"
    echo "getChatHistory 로그: $(grep -c "getChatHistory.*조회된" "$CHAT_LOG" || echo 0)"
    echo "textRu 관련: $(grep -c "textRu\|textRU" "$CHAT_LOG" || echo 0)"
    echo "textZh 관련: $(grep -c "textZh\|textZH" "$CHAT_LOG" || echo 0)"
    
} > "$ANALYSIS_FILE"

echo "✅ 분석 완료"
echo ""
echo "📄 상세 분석 결과: $ANALYSIS_FILE"
echo "📄 채팅 로그만: $CHAT_LOG"
echo "📄 전체 로그: $DETAILED_LOG"
echo ""
echo "분석 결과 미리보기 (최근 createMessage):"
echo "---"
grep -A 15 "ChatService.*createMessage.*저장된 메시지" "$CHAT_LOG" | tail -30
