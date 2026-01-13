# DNS 전파 대기 및 SSL 인증서 발급

## 현재 상황

DNS 설정은 완료되었지만, 아직 전파되지 않은 것으로 보입니다. DNS 전파는 보통 몇 분에서 최대 48시간이 걸릴 수 있습니다.

## DNS 전파 확인 방법

### 방법 1: 온라인 도구 사용 (권장)

다음 온라인 도구로 전 세계 DNS 전파 상태를 확인할 수 있습니다:

- **What's My DNS**: https://www.whatsmydns.net/#A/qoodle.top
- **DNS Checker**: https://dnschecker.org/#A/qoodle.top

### 방법 2: 명령어로 확인

```bash
# Google DNS로 확인
dig @8.8.8.8 qoodle.top +short

# Cloudflare DNS로 확인
dig @1.1.1.1 qoodle.top +short

# 예상 출력: 165.232.172.98
```

### 방법 3: 서버에서 확인

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
dig @8.8.8.8 qoodle.top +short
```

## DNS 전파 후 SSL 인증서 발급

DNS가 전파되면 (대부분의 DNS 서버에서 `165.232.172.98`을 반환하면), 다음 명령어로 SSL 인증서를 발급하세요:

### 자동 스크립트 사용 (권장)

```bash
cd /Users/ilsoonim/Dev/BlynkV5QR/Apps
./SSL_CERT_SCRIPT.sh
```

### 수동 실행

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98

# SSL 인증서 발급
certbot --nginx -d qoodle.top -d www.qoodle.top \
  --non-interactive \
  --agree-tos \
  --email admin@qoodle.top \
  --redirect

# 최종 Nginx 설정 적용
scp -i ~/.ssh/blynk_deploy_rsa nginx.conf root@165.232.172.98:/etc/nginx/sites-available/qoodle.top
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98 "nginx -t && systemctl reload nginx"
```

## DNS 전파 시간

- **일반적인 경우**: 5분 ~ 1시간
- **최대**: 48시간 (TTL에 따라 다름)
- **빠른 전파**: Cloudflare, Google DNS 등은 보통 빠름

## DNS 전파 확인 체크리스트

- [ ] 온라인 도구에서 확인 (https://www.whatsmydns.net/#A/qoodle.top)
- [ ] 여러 DNS 서버에서 확인 (8.8.8.8, 1.1.1.1)
- [ ] 서버에서 직접 확인
- [ ] HTTP 접속 테스트 (`curl http://qoodle.top/health`)

## DNS 전파 후 자동 확인 스크립트

다음 스크립트를 실행하면 DNS 전파를 확인하고 자동으로 SSL 인증서를 발급합니다:

```bash
#!/bin/bash
echo "🔍 DNS 전파 확인 중..."

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    DNS_RESULT=$(dig @8.8.8.8 qoodle.top +short)
    
    if [ "$DNS_RESULT" = "165.232.172.98" ]; then
        echo "✅ DNS 전파 확인됨!"
        echo ""
        echo "🔐 SSL 인증서 발급 중..."
        
        ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98 \
          "certbot --nginx -d qoodle.top -d www.qoodle.top \
          --non-interactive --agree-tos --email admin@qoodle.top --redirect"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ SSL 인증서 발급 완료!"
            echo ""
            echo "📝 최종 Nginx 설정 적용 중..."
            scp -i ~/.ssh/blynk_deploy_rsa nginx.conf root@165.232.172.98:/etc/nginx/sites-available/qoodle.top
            ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98 "nginx -t && systemctl reload nginx"
            echo ""
            echo "🎉 모든 설정 완료!"
            exit 0
        fi
    else
        ATTEMPT=$((ATTEMPT + 1))
        echo "⏳ DNS 전파 대기 중... ($ATTEMPT/$MAX_ATTEMPTS)"
        sleep 30
    fi
done

echo "❌ DNS 전파 확인 실패. 수동으로 확인해주세요."
exit 1
```

## 현재 서버 상태

- ✅ Nginx: HTTP 프록시 설정 완료
- ✅ 포트 80, 443: 방화벽 개방 완료
- ✅ 환경 변수: HTTPS 준비 완료
- ⏳ DNS 전파: 대기 중
- ⏳ SSL 인증서: DNS 전파 후 발급 예정

## 다음 단계

1. **DNS 전파 확인** (온라인 도구 또는 명령어)
2. **SSL 인증서 발급** (DNS 전파 후)
3. **최종 Nginx 설정 적용**
4. **HTTPS 접속 테스트**

DNS 전파가 완료되면 알려주시면 SSL 인증서 발급을 진행하겠습니다!
