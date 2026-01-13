# SSL 인증서 설정 가이드 (qoodle.top)

## 사전 준비사항

### 1. DNS 설정 확인

도메인 `qoodle.top`의 DNS 레코드가 다음 IP로 설정되어 있어야 합니다:
- **A 레코드**: `qoodle.top` → `165.232.172.98`
- **A 레코드**: `www.qoodle.top` → `165.232.172.98` (선택사항)
- **A 레코드**: `qr.qoodle.top` → `165.232.172.98` (QR 코드용)

DNS 설정 확인:
```bash
dig qoodle.top +short
# 예상 출력: 165.232.172.98
```

### 2. 포트 확인

다음 포트가 열려있어야 합니다:
- 포트 80 (HTTP)
- 포트 443 (HTTPS)
- 포트 22 (SSH)

## 설치 및 설정 단계

### 1단계: Nginx 설치

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98

# Nginx 설치
apt update
apt install -y nginx

# Nginx 상태 확인
systemctl status nginx
```

### 2단계: Certbot 설치

```bash
# Certbot 및 Nginx 플러그인 설치
apt install -y certbot python3-certbot-nginx

# Certbot 버전 확인
certbot --version
```

### 3단계: 초기 Nginx 설정

```bash
# Let's Encrypt 인증을 위한 디렉토리 생성
mkdir -p /var/www/certbot

# 임시 Nginx 설정 파일 생성
cat > /etc/nginx/sites-available/qoodle.top << 'EOF'
server {
    listen 80;
    server_name qoodle.top www.qoodle.top qr.qoodle.top;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 심볼릭 링크 생성
ln -sf /etc/nginx/sites-available/qoodle.top /etc/nginx/sites-enabled/

# 기본 설정 비활성화
rm -f /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
nginx -t

# Nginx 재시작
systemctl restart nginx
```

### 4단계: SSL 인증서 발급

```bash
# SSL 인증서 발급 (대화형)
certbot --nginx -d qoodle.top -d www.qoodle.top

# 또는 자동 모드 (이메일 입력 필요)
certbot --nginx -d qoodle.top -d www.qoodle.top --non-interactive --agree-tos --email your-email@example.com
```

### 5단계: Nginx 설정 업데이트

프로젝트의 `nginx.conf` 파일을 서버에 복사:

```bash
# 로컬에서 실행
scp -i ~/.ssh/blynk_deploy_rsa nginx.conf root@165.232.172.98:/etc/nginx/sites-available/qoodle.top

# 서버에서 실행
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
nginx -t
systemctl reload nginx
```

### 6단계: 자동 갱신 설정

```bash
# 인증서 자동 갱신 테스트
certbot renew --dry-run

# Cron 작업 확인 (자동 설정됨)
systemctl status certbot.timer
```

### 7단계: 환경 변수 업데이트

`.env.production` 파일 업데이트:

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

### 8단계: 프론트엔드 환경 변수 업데이트

GitHub Secrets 업데이트:
- `VITE_API_URL`: `https://qoodle.top/api`
- `VITE_FRONTEND_BASE_URL`: `https://qoodle.top`

## 확인

### SSL 인증서 확인

```bash
# 인증서 정보 확인
openssl s_client -connect qoodle.top:443 -servername qoodle.top < /dev/null

# 또는 브라우저에서 확인
# https://www.ssllabs.com/ssltest/analyze.html?d=qoodle.top
```

### 애플리케이션 접속 테스트

브라우저에서 다음 URL로 접속:
- https://qoodle.top/health
- https://qoodle.top/admin
- https://qoodle.top/shop
- https://qoodle.top/customer

## 문제 해결

### 인증서 발급 실패

1. DNS 설정 확인:
   ```bash
   dig qoodle.top +short
   ```

2. 포트 80이 열려있는지 확인:
   ```bash
   ufw status
   netstat -tulpn | grep :80
   ```

3. Nginx가 실행 중인지 확인:
   ```bash
   systemctl status nginx
   ```

### 인증서 갱신 실패

```bash
# 수동 갱신 시도
certbot renew --force-renewal

# 로그 확인
tail -f /var/log/letsencrypt/letsencrypt.log
```

## 보안 권장사항

1. **방화벽 설정**
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

2. **포트 3000 직접 노출 차단**
   - Nginx를 통해서만 접근 가능하도록 설정
   - 방화벽에서 포트 3000은 localhost에서만 접근 가능

3. **정기적인 보안 업데이트**
   ```bash
   apt update && apt upgrade -y
   ```

## 참고

- Let's Encrypt 인증서는 90일마다 갱신 필요 (자동 설정됨)
- 인증서 갱신 후 Nginx 자동 재로드 설정됨
- SSL Labs에서 SSL 등급 확인 가능: https://www.ssllabs.com/ssltest/
