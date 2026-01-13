#!/bin/bash
# SSL 인증서 발급 스크립트
# DNS 설정이 완료된 후 실행하세요

echo "🔍 DNS 설정 확인 중..."
if dig qoodle.top +short | grep -q "165.232.172.98"; then
    echo "✅ DNS 설정 확인됨"
else
    echo "❌ DNS가 아직 설정되지 않았습니다."
    echo "   qoodle.top의 A 레코드를 165.232.172.98로 설정해주세요."
    exit 1
fi

echo ""
echo "🔐 SSL 인증서 발급 중..."
certbot --nginx -d qoodle.top -d www.qoodle.top -d qr.qoodle.top \
  --non-interactive \
  --agree-tos \
  --email admin@qoodle.top \
  --redirect

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL 인증서 발급 완료!"
    echo ""
    echo "📝 최종 Nginx 설정 적용 중..."
    
    # 최종 Nginx 설정 적용
    scp -i ~/.ssh/blynk_deploy_rsa nginx.conf root@165.232.172.98:/etc/nginx/sites-available/qoodle.top
    
    ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98 "nginx -t && systemctl reload nginx"
    
    echo ""
    echo "✅ 모든 설정 완료!"
    echo ""
    echo "🌐 다음 URL로 접속하세요:"
    echo "   - https://qoodle.top/health"
    echo "   - https://qoodle.top/admin"
    echo "   - https://qoodle.top/shop"
    echo "   - https://qoodle.top/customer"
    echo "   - https://qr.qoodle.top (QR 코드용)"
else
    echo ""
    echo "❌ SSL 인증서 발급 실패"
    echo "   DNS 설정을 확인해주세요."
    exit 1
fi
