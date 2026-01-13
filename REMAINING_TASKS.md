# 남은 작업 완료 가이드

## 현재 상태

✅ 서버 설정 완료
✅ Nginx 설치 및 HTTP 설정 완료
✅ 환경 변수 업데이트 완료 (HTTPS 준비)
✅ 백엔드 컨테이너 정상 실행 중
⏳ DNS 설정 필요 (SSL 인증서 발급 전)
⏳ SSL 인증서 발급 (DNS 설정 후)
⏳ GitHub Secrets 업데이트
⏳ Google OAuth 콜백 URL 업데이트
⏳ 프론트엔드 재빌드

## 작업 순서

### 1단계: DNS 설정 (필수)

도메인 관리 페이지에서 DNS A 레코드를 설정하세요:

- **Type**: `A`
- **Name**: `@` 또는 `qoodle.top`
- **Value**: `165.232.172.98`
- **TTL**: `3600`

**확인 방법:**
```bash
dig qoodle.top +short
# 예상 출력: 165.232.172.98
```

### 2단계: SSL 인증서 발급 (DNS 설정 후)

DNS 전파 후 (보통 몇 분~1시간), 다음 중 하나를 실행:

**방법 1: 자동 스크립트 사용**
```bash
cd /Users/ilsoonim/Dev/BlynkV5QR/Apps
./SSL_CERT_SCRIPT.sh
```

**방법 2: 수동 실행**
```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
certbot --nginx -d qoodle.top -d www.qoodle.top \
  --non-interactive \
  --agree-tos \
  --email your-email@example.com \
  --redirect
```

SSL 인증서 발급 후 최종 Nginx 설정 적용:
```bash
scp -i ~/.ssh/blynk_deploy_rsa nginx.conf root@165.232.172.98:/etc/nginx/sites-available/qoodle.top
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98 "nginx -t && systemctl reload nginx"
```

### 3단계: GitHub Secrets 업데이트 (필수)

프론트엔드 빌드를 위해 GitHub Secrets를 업데이트하세요:

1. https://github.com/cvpark0920/blynk5/settings/secrets/actions 접속
2. 다음 Secrets 업데이트:
   - `VITE_API_URL`: `https://qoodle.top/api`
   - `VITE_FRONTEND_BASE_URL`: `https://qoodle.top`

자세한 내용: `GITHUB_SECRETS_UPDATE.md` 참고

### 4단계: Google OAuth 콜백 URL 업데이트 (필수)

Google Cloud Console에서 OAuth 콜백 URL을 업데이트하세요:

1. https://console.cloud.google.com/ 접속
2. APIs & Services → Credentials
3. OAuth 2.0 클라이언트 ID 선택
4. Authorized redirect URIs에 추가:
   - `https://qoodle.top/api/auth/google/callback`

자세한 내용: `GOOGLE_OAUTH_UPDATE.md` 참고

### 5단계: 프론트엔드 재빌드 (필수)

GitHub Secrets 업데이트 후:

1. https://github.com/cvpark0920/blynk5/actions 접속
2. **Deploy to DigitalOcean** 워크플로우 선택
3. **Run workflow** 클릭
4. `main` 브랜치 선택 후 실행

## 빠른 체크리스트

- [ ] DNS A 레코드 설정 (`qoodle.top` → `165.232.172.98`)
- [ ] DNS 전파 확인 (`dig qoodle.top +short`)
- [ ] SSL 인증서 발급 (`SSL_CERT_SCRIPT.sh` 실행)
- [ ] 최종 Nginx 설정 적용
- [ ] GitHub Secrets 업데이트
- [ ] Google OAuth 콜백 URL 업데이트
- [ ] 프론트엔드 재빌드 (GitHub Actions 실행)
- [ ] HTTPS 접속 테스트

## 확인 명령어

### DNS 확인
```bash
dig qoodle.top +short
```

### SSL 인증서 확인
```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
ls -la /etc/letsencrypt/live/qoodle.top/
```

### HTTPS 접속 테스트
```bash
curl https://qoodle.top/health
```

### 컨테이너 상태 확인
```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
cd /opt/blynk-backend/blynk_backend
docker compose -f docker-compose.prod.yml ps
```

## 완료 후 확인

모든 작업이 완료되면 다음 URL로 접속하여 테스트:

- ✅ https://qoodle.top/health
- ✅ https://qoodle.top/admin
- ✅ https://qoodle.top/shop
- ✅ https://qoodle.top/customer

## 문제 해결

### DNS가 전파되지 않을 때

1. DNS 레코드 설정 확인
2. TTL 값 확인 (너무 길면 변경 지연)
3. 다른 DNS 서버로 확인 (8.8.8.8, 1.1.1.1)
4. 온라인 도구 사용: https://www.whatsmydns.net/#A/qoodle.top

### SSL 인증서 발급 실패 시

1. DNS 전파 확인 (`dig qoodle.top +short`)
2. 포트 80 열림 확인 (`ufw status`)
3. Nginx 실행 확인 (`systemctl status nginx`)
4. Certbot 로그 확인 (`tail -f /var/log/letsencrypt/letsencrypt.log`)

## 참고 문서

- `DNS_SETUP_GUIDE.md`: DNS 설정 상세 가이드
- `SSL_SETUP.md`: SSL 설정 전체 가이드
- `GITHUB_SECRETS_UPDATE.md`: GitHub Secrets 업데이트 가이드
- `GOOGLE_OAUTH_UPDATE.md`: Google OAuth 업데이트 가이드
- `SSL_CERT_SCRIPT.sh`: SSL 인증서 자동 발급 스크립트
