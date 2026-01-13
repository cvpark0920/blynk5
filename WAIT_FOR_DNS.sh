#!/bin/bash
# DNS 전파 대기 및 SSL 인증서 자동 발급 스크립트

echo "🔍 DNS 전파 확인 중..."
echo ""

MAX_ATTEMPTS=60
ATTEMPT=0
CHECK_INTERVAL=30

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    # 여러 DNS 서버로 확인
    DNS_GOOGLE=$(dig @8.8.8.8 qoodle.top +short 2>/dev/null | head -1)
    DNS_CLOUDFLARE=$(dig @1.1.1.1 qoodle.top +short 2>/dev/null | head -1)
    
    if [ "$DNS_GOOGLE" = "165.232.172.98" ] || [ "$DNS_CLOUDFLARE" = "165.232.172.98" ]; then
        echo "✅ DNS 전파 확인됨!"
        echo "   Google DNS: $DNS_GOOGLE"
        echo "   Cloudflare DNS: $DNS_CLOUDFLARE"
        echo ""
        echo "🔐 SSL 인증서 발급 중..."
        
        ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98 \
          "certbot --nginx -d qoodle.top -d www.qoodle.top -d qr.qoodle.top \
          --non-interactive --agree-tos --email admin@qoodle.top --redirect" 2>&1
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ SSL 인증서 발급 완료!"
            echo ""
            echo "📝 최종 Nginx 설정 적용 중..."
            
            scp -i ~/.ssh/blynk_deploy_rsa /Users/ilsoonim/Dev/BlynkV5QR/Apps/nginx.conf \
              root@165.232.172.98:/etc/nginx/sites-available/qoodle.top 2>&1
            
            ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98 \
              "nginx -t && systemctl reload nginx" 2>&1
            
            if [ $? -eq 0 ]; then
                echo ""
                echo "🎉 모든 설정 완료!"
                echo ""
                echo "🌐 다음 URL로 접속하세요:"
                echo "   - https://qoodle.top/health"
                echo "   - https://qoodle.top/admin"
                echo "   - https://qoodle.top/shop"
                echo "   - https://qoodle.top/customer"
                echo "   - https://qr.qoodle.top (QR 코드용)"
                echo ""
                echo "✅ HTTPS 접속 테스트:"
                curl -s https://qoodle.top/health
                echo ""
                exit 0
            else
                echo "❌ Nginx 설정 적용 실패"
                exit 1
            fi
        else
            echo "❌ SSL 인증서 발급 실패"
            exit 1
        fi
    else
        ATTEMPT=$((ATTEMPT + 1))
        REMAINING=$((MAX_ATTEMPTS - ATTEMPT))
        echo "⏳ DNS 전파 대기 중... ($ATTEMPT/$MAX_ATTEMPTS) - 약 $((REMAINING * CHECK_INTERVAL / 60))분 남음"
        echo "   Google DNS: $DNS_GOOGLE"
        echo "   Cloudflare DNS: $DNS_CLOUDFLARE"
        echo ""
        sleep $CHECK_INTERVAL
    fi
done

echo ""
echo "❌ DNS 전파 확인 실패 (최대 $((MAX_ATTEMPTS * CHECK_INTERVAL / 60))분 대기)"
echo ""
echo "다음 방법으로 확인해주세요:"
echo "1. 온라인 도구: https://www.whatsmydns.net/#A/qoodle.top"
echo "2. DNS 설정 확인: 도메인 관리 페이지에서 A 레코드가 올바르게 설정되었는지 확인"
echo "3. 수동 확인: dig @8.8.8.8 qoodle.top +short"
echo ""
exit 1
