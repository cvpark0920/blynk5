# SSL 설정 완료 가이드 (qoodle.top)

## 완료된 작업

✅ Nginx 설치 및 설정
✅ 초기 HTTP 프록시 설정
✅ 방화벽 포트 80, 443 개방
✅ 환경 변수 업데이트 (FRONTEND_BASE_URL, CORS_ORIGIN, GOOGLE_CALLBACK_URL)
✅ 백엔드 컨테이너 재시작

## 남은 작업

### 1단계: DNS 설정 (필수)

도메인 `qoodle.top`의 DNS A 레코드를 `165.232.172.98`로 설정하세요.

**설정 예시:**
- Type: `A`
- Name: `@` 또는 `qoodle.top`
- Value: `165.232.172.98`
- TTL: `3600` (또는 기본값)

**확인 방법:**
```bash
dig qoodle.top +short
# 예상 출력: 165.232.172.98
```

### 2단계: SSL 인증서 발급

DNS 전파 후 (보통 몇 분~1시간), 다음 명령어로 SSL 인증서를 발급:

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98

# SSL 인증서 발급 (이메일 주소를 실제 이메일로 변경)
certbot --nginx -d qoodle.top -d www.qoodle.top -d qr.qoodle.top \
  --non-interactive \
  --agree-tos \
  --email admin@qoodle.top \
  --redirect
```

### 3단계: 최종 Nginx 설정 적용

SSL 인증서 발급 후, 최종 Nginx 설정을 적용:

```bash
# 로컬에서 실행
scp -i ~/.ssh/blynk_deploy_rsa nginx.conf root@165.232.172.98:/etc/nginx/sites-available/qoodle.top

# 서버에서 실행
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
nginx -t
systemctl reload nginx
```

### 4단계: Google OAuth 설정 업데이트

Google Cloud Console에서 OAuth 콜백 URL 업데이트:

1. https://console.cloud.google.com/ 접속
2. 프로젝트 선택
3. **APIs & Services** → **Credentials**
4. OAuth 2.0 클라이언트 ID 선택
5. **Authorized redirect URIs**에 추가:
   - `https://qoodle.top/api/auth/google/callback`
6. **Save** 클릭

### 5단계: GitHub Secrets 업데이트

프론트엔드 빌드를 위해 GitHub Secrets 업데이트:

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. 다음 Secrets 업데이트:
   - `VITE_API_URL`: `https://qoodle.top/api`
   - `VITE_FRONTEND_BASE_URL`: `https://qoodle.top`

### 6단계: 프론트엔드 재빌드

GitHub Actions를 실행하여 새로운 환경 변수로 프론트엔드를 재빌드:

1. GitHub 저장소 → **Actions** 탭
2. **Deploy to DigitalOcean** 워크플로우 선택
3. **Run workflow** 클릭
4. `main` 브랜치 선택 후 실행

## 확인

### HTTP 접속 확인

DNS 설정 후:
```bash
curl http://qoodle.top/health
# 예상 응답: {"status":"ok","timestamp":"..."}
```

### HTTPS 접속 확인

SSL 인증서 발급 후:
```bash
curl https://qoodle.top/health
# 예상 응답: {"status":"ok","timestamp":"..."}
```

### 브라우저 접속 테스트

- https://qoodle.top/health
- https://qoodle.top/admin
- https://qoodle.top/shop
- https://qoodle.top/customer

## 자동 갱신 설정

Let's Encrypt 인증서는 90일마다 자동 갱신됩니다. 수동 테스트:

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
certbot renew --dry-run
```

## 현재 서버 상태

- ✅ Nginx: 실행 중
- ✅ 백엔드 컨테이너: 실행 중 (포트 3000)
- ✅ 환경 변수: HTTPS로 업데이트됨
- ⏳ DNS 설정: 대기 중
- ⏳ SSL 인증서: DNS 설정 후 발급 예정

## 참고 문서

- `DNS_SETUP_GUIDE.md`: DNS 설정 상세 가이드
- `SSL_SETUP.md`: SSL 설정 전체 가이드
- `nginx.conf`: 최종 Nginx 설정 파일
