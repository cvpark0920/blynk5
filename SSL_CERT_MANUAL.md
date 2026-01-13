# SSL 인증서 수동 발급 가이드

## 현재 상태

- ✅ Nginx: HTTP 프록시 설정 완료 및 정상 작동 중
- ✅ 서버 준비 완료
- ⏳ DNS 전파 대기 중

## DNS 전파 확인

DNS가 전파되었는지 확인하세요:

### 방법 1: 온라인 도구 (가장 정확)

다음 사이트에서 전 세계 DNS 전파 상태를 확인:
- **What's My DNS**: https://www.whatsmydns.net/#A/qoodle.top
- **DNS Checker**: https://dnschecker.org/#A/qoodle.top

대부분의 지역에서 `165.232.172.98`이 표시되면 전파 완료입니다.

### 방법 2: 명령어로 확인

```bash
# Google DNS로 확인
dig @8.8.8.8 qoodle.top +short
# 예상 출력: 165.232.172.98

# Cloudflare DNS로 확인
dig @1.1.1.1 qoodle.top +short
# 예상 출력: 165.232.172.98
```

## DNS 전파 후 SSL 인증서 발급

DNS가 전파되면 다음 중 하나의 방법으로 SSL 인증서를 발급하세요:

### 방법 1: 자동 스크립트 사용 (권장)

```bash
cd /Users/ilsoonim/Dev/BlynkV5QR/Apps
./WAIT_FOR_DNS.sh
```

이 스크립트는 DNS 전파를 확인하고 자동으로 SSL 인증서를 발급합니다.

### 방법 2: 수동 실행

```bash
# 1. DNS 확인
dig @8.8.8.8 qoodle.top +short
# 165.232.172.98이 나오면 진행

# 2. SSL 인증서 발급
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
certbot --nginx -d qoodle.top -d www.qoodle.top -d qr.qoodle.top \
  --non-interactive \
  --agree-tos \
  --email admin@qoodle.top \
  --redirect

# 3. 최종 Nginx 설정 적용
scp -i ~/.ssh/blynk_deploy_rsa nginx.conf root@165.232.172.98:/etc/nginx/sites-available/qoodle.top
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98 "nginx -t && systemctl reload nginx"

# 4. HTTPS 접속 테스트
curl https://qoodle.top/health
```

## DNS 전파 시간

- **일반적인 경우**: 5분 ~ 1시간
- **최대**: 48시간 (TTL에 따라 다름)
- **빠른 전파**: Cloudflare, Google DNS 등은 보통 빠름

## 문제 해결

### DNS가 전파되지 않을 때

1. **도메인 관리 페이지 확인**
   - A 레코드가 올바르게 설정되었는지 확인
   - 값이 정확히 `165.232.172.98`인지 확인

2. **TTL 확인**
   - TTL이 너무 길면 (예: 86400) 변경이 늦게 반영될 수 있음
   - TTL을 3600 정도로 설정하는 것을 권장

3. **DNS 캐시 클리어**
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

### SSL 인증서 발급 실패 시

1. **DNS 확인**: `dig @8.8.8.8 qoodle.top +short`가 `165.232.172.98`을 반환하는지 확인
2. **포트 80 확인**: 방화벽에서 포트 80이 열려있는지 확인
3. **Nginx 확인**: Nginx가 정상 실행 중인지 확인
4. **Certbot 로그 확인**: `/var/log/letsencrypt/letsencrypt.log` 확인

## 완료 후 확인

SSL 인증서 발급이 완료되면:

1. **HTTPS 접속 테스트**
   ```bash
   curl https://qoodle.top/health
   # 예상 출력: {"status":"ok","timestamp":"..."}
   ```

2. **브라우저에서 확인**
   - https://qoodle.top/health
   - https://qoodle.top/admin
   - https://qoodle.top/shop
   - https://qoodle.top/customer

3. **SSL Labs 등급 확인**
   - https://www.ssllabs.com/ssltest/analyze.html?d=qoodle.top

## 다음 단계

SSL 인증서 발급 완료 후:

1. GitHub Secrets 업데이트 (`GITHUB_SECRETS_UPDATE.md` 참고)
2. Google OAuth 콜백 URL 업데이트 (`GOOGLE_OAUTH_UPDATE.md` 참고)
3. 프론트엔드 재빌드 (GitHub Actions 실행)

## 현재 서버 상태

- ✅ Nginx: 정상 실행 중 (HTTP)
- ✅ 백엔드: 정상 실행 중
- ✅ 환경 변수: HTTPS 준비 완료
- ⏳ DNS 전파: 대기 중
- ⏳ SSL 인증서: DNS 전파 후 발급 예정

DNS 전파가 완료되면 위의 방법 중 하나로 SSL 인증서를 발급하세요!
