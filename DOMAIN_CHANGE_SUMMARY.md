# 도메인 변경 완료 요약

## 변경 사항

- **메인 도메인**: `blynk.be` → `qoodle.top`
- **서브도메인**: `qr.qoodle.top` 추가 (QR 코드용)
- **이메일**: `admin@blynk.be` → `admin@qoodle.top`
- **IP 주소**: `165.232.172.98` (변경 없음)

## 업데이트된 파일

### 설정 파일
- ✅ `nginx.conf` - Nginx 설정 (도메인 및 SSL 인증서 경로)
- ✅ `.env.example` - 프론트엔드 환경 변수 예시
- ✅ `blynk_backend/.env.example` - 백엔드 환경 변수 예시

### 스크립트 파일
- ✅ `SSL_CERT_SCRIPT.sh` - SSL 인증서 발급 스크립트
- ✅ `WAIT_FOR_DNS.sh` - DNS 전파 대기 및 SSL 발급 스크립트

### 문서 파일 (약 15개)
- ✅ `DNS_SETUP_GUIDE.md`
- ✅ `SSL_SETUP.md`
- ✅ `SSL_SETUP_COMPLETE.md`
- ✅ `SSL_SETUP_SUCCESS.md`
- ✅ `SSL_CERT_MANUAL.md`
- ✅ `SSL_COMPLETE_SETUP.md`
- ✅ `DNS_PROPAGATION_WAIT.md`
- ✅ `REMAINING_TASKS.md`
- ✅ `GITHUB_SECRETS_UPDATE.md`
- ✅ `GOOGLE_OAUTH_UPDATE.md`
- ✅ 기타 관련 문서들

## 다음 단계 (사용자 작업 필요)

### 1. 서버 환경 변수 업데이트

SSH로 서버에 접속하여 환경 변수를 업데이트하세요:

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
cd /opt/blynk-backend/blynk_backend

# 환경 변수 업데이트
sed -i 's|FRONTEND_BASE_URL=.*|FRONTEND_BASE_URL=https://qoodle.top|' .env.production
sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=https://qoodle.top|' .env.production
sed -i 's|GOOGLE_CALLBACK_URL=.*|GOOGLE_CALLBACK_URL=https://qoodle.top/api/auth/google/callback|' .env.production

# .env 파일도 업데이트
cp .env.production .env

# 백엔드 컨테이너 재시작
docker compose -f docker-compose.prod.yml restart backend
```

### 2. 서버 Nginx 설정 업데이트

서버의 Nginx 설정 파일을 새 도메인으로 교체:

```bash
# 로컬에서 실행
scp -i ~/.ssh/blynk_deploy_rsa nginx.conf root@165.232.172.98:/etc/nginx/sites-available/qoodle.top

# 서버에서 실행
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
ln -sf /etc/nginx/sites-available/qoodle.top /etc/nginx/sites-enabled/qoodle.top
rm -f /etc/nginx/sites-enabled/blynk.be  # 기존 설정 비활성화
nginx -t
systemctl reload nginx
```

### 3. DNS 설정

도메인 관리 페이지에서 다음 DNS 레코드를 추가하세요:

- **qoodle.top** A 레코드 → `165.232.172.98`
- **www.qoodle.top** A 레코드 → `165.232.172.98` (선택사항)
- **qr.qoodle.top** A 레코드 → `165.232.172.98` (QR 코드용)

### 4. SSL 인증서 발급

DNS 전파 후 SSL 인증서를 발급:

```bash
# 자동 스크립트 사용
cd /Users/ilsoonim/Dev/BlynkV5QR/Apps
./WAIT_FOR_DNS.sh

# 또는 수동 실행
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
certbot --nginx -d qoodle.top -d www.qoodle.top -d qr.qoodle.top \
  --non-interactive \
  --agree-tos \
  --email admin@qoodle.top \
  --redirect
```

### 5. GitHub Secrets 업데이트

GitHub 저장소 설정에서 다음 Secrets를 업데이트:

- `VITE_API_URL`: `https://qoodle.top/api`
- `VITE_FRONTEND_BASE_URL`: `https://qoodle.top`

### 6. Google OAuth 콜백 URL 업데이트

Google Cloud Console에서:
- Authorized redirect URIs에 `https://qoodle.top/api/auth/google/callback` 추가

### 7. 프론트엔드 재빌드

GitHub Actions를 실행하여 새 도메인으로 프론트엔드를 재빌드하세요.

## 확인

모든 작업이 완료되면 다음 URL로 접속하여 테스트:

- https://qoodle.top/health
- https://qoodle.top/admin
- https://qoodle.top/shop
- https://qoodle.top/customer
- https://qr.qoodle.top (QR 코드용)

## 참고

- 모든 로컬 파일 업데이트 완료
- Git 커밋 및 푸시 필요
- 서버 설정은 SSH로 직접 수정 필요
- DNS 설정은 도메인 관리 페이지에서 수정 필요
