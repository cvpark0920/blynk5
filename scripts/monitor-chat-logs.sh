#!/bin/bash

# 실시간 채팅 로그 모니터링 스크립트
# 러시아어/중국어 메시지 전송 시 백엔드 로그를 실시간으로 캡처합니다

LOG_DIR="./logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MONITOR_LOG="${LOG_DIR}/monitor_${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

echo "🔍 실시간 채팅 로그 모니터링 시작..."
echo "로그 파일: $MONITOR_LOG"
echo "러시아어/중국어 메시지를 보내면 로그가 캡처됩니다."
echo "종료하려면 Ctrl+C를 누르세요."
echo ""

# 실시간 로그 모니터링
docker logs -f blynk_backend_dev 2>&1 | tee "$MONITOR_LOG" | grep --line-buffered -E "ChatService.*createMessage|ChatService.*getChatHistory|ChatController.*getChatHistory|저장된 메시지|조회된 메시지|Response message|textRu|textRu|textZh|textZH" | while read line; do
    echo "[$(date '+%H:%M:%S')] $line"
done
