# 배포 후 다음 단계 가이드

## ✅ 완료된 작업

- GitHub Actions 배포 성공
- Docker 이미지 빌드 및 푸시 완료
- Droplet에 배포 완료

---

## 1단계: 애플리케이션 상태 확인

### 컨테이너 상태 확인

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
cd /opt/blynk-backend/blynk_backend
docker-compose -f docker-compose.prod.yml ps
```

모든 컨테이너가 `Up` 상태여야 합니다:
- `blynk_backend_prod` - 백엔드 서버
- `blynk_postgres_prod` - PostgreSQL 데이터베이스
- `blynk_redis_prod` - Redis 캐시

### Health Check 확인

```bash
curl http://165.232.172.98/health
```

예상 응답:
```json
{"status":"ok","timestamp":"2026-01-12T..."}
```

### 애플리케이션 접속 테스트

브라우저에서 다음 URL로 접속:

- **Admin 앱**: http://165.232.172.98/admin
- **Shop 앱**: http://165.232.172.98/shop
- **Customer 앱**: http://165.232.172.98/customer
- **API Health**: http://165.232.172.98/health

---

## 2단계: 환경 변수 설정

### 환경 변수 파일 확인 및 수정

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
cd /opt/blynk-backend/blynk_backend
cat .env.production
```

### 필수 환경 변수 설정

`.env.production` 파일을 수정하여 다음 변수들을 설정하세요:

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://blynk:blynk@postgres:5432/blynk_db
REDIS_URL=redis://redis:6379

JWT_SECRET=your-strong-secret-key-change-in-production-min-32-characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://165.232.172.98/api/auth/google/callback
# 또는 도메인 사용 시: https://yourdomain.com/api/auth/google/callback

FRONTEND_BASE_URL=http://165.232.172.98
# 또는 도메인 사용 시: https://yourdomain.com

CORS_ORIGIN=http://165.232.172.98
# 또는 도메인 사용 시: https://yourdomain.com

VIETQR_CLIENT_ID=your-vietqr-client-id
VIETQR_API_KEY=your-vietqr-api-key

UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp
```

### 환경 변수 적용

환경 변수 수정 후 컨테이너 재시작:

```bash
cd /opt/blynk-backend/blynk_backend
docker-compose -f docker-compose.prod.yml restart backend
```

---

## 3단계: 데이터베이스 마이그레이션 확인

### 마이그레이션 상태 확인

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
cd /opt/blynk-backend/blynk_backend
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate status
```

### 마이그레이션 실행 (필요한 경우)

```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

---

## 4단계: 로그 확인

### 백엔드 로그 확인

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
cd /opt/blynk-backend/blynk_backend
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 모든 서비스 로그 확인

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 5단계: 방화벽 설정

### UFW 방화벽 설정

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98

# 방화벽 설정
ufw allow 22/tcp    # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw enable

# 상태 확인
ufw status
```

---

## 6단계: Nginx 리버스 프록시 설정 (선택사항)

도메인을 사용하거나 HTTPS를 설정하려면 Nginx를 사용하세요:

### Nginx 설치

```bash
apt install nginx -y
```

### 설정 파일 생성

```bash
nano /etc/nginx/sites-available/blynk-backend
```

Nginx 설정 예시:

```nginx
server {
    listen 80;
    server_name 165.232.172.98;  # 또는 yourdomain.com

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE 지원
    location /api/sse {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
```

### 설정 활성화

```bash
ln -s /etc/nginx/sites-available/blynk-backend /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 7단계: SSL 인증서 설정 (도메인 사용 시)

도메인이 있다면 Let's Encrypt로 SSL 인증서를 설정하세요:

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com
```

---

## 8단계: 모니터링 및 유지보수

### 컨테이너 상태 모니터링

```bash
# 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 리소스 사용량 확인
docker stats

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f
```

### 데이터베이스 백업

```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U blynk blynk_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 업데이트 배포

코드 변경 후 GitHub에 푸시하면 자동으로 배포됩니다:
- `main` 브랜치에 푸시 → 자동 배포
- 또는 GitHub Actions에서 수동 실행

---

## 체크리스트

- [ ] 컨테이너 상태 확인 (모두 Up 상태)
- [ ] Health check 확인 (`/health` 엔드포인트)
- [ ] Admin 앱 접속 테스트
- [ ] Shop 앱 접속 테스트
- [ ] Customer 앱 접속 테스트
- [ ] 환경 변수 설정 확인 및 수정
- [ ] 데이터베이스 마이그레이션 확인
- [ ] 방화벽 설정
- [ ] (선택) Nginx 리버스 프록시 설정
- [ ] (선택) SSL 인증서 설정

---

## 문제 해결

### 컨테이너가 시작되지 않을 때

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs backend

# 컨테이너 재시작
docker-compose -f docker-compose.prod.yml restart backend
```

### 데이터베이스 연결 오류

```bash
# PostgreSQL 로그 확인
docker-compose -f docker-compose.prod.yml logs postgres

# 데이터베이스 연결 테스트
docker-compose -f docker-compose.prod.yml exec backend npx prisma db pull
```

### 애플리케이션 접속 불가

```bash
# 포트 확인
netstat -tulpn | grep 3000

# 방화벽 확인
ufw status

# 백엔드 로그 확인
docker-compose -f docker-compose.prod.yml logs backend
```

---

## 다음 단계

1. ✅ 애플리케이션 상태 확인
2. ✅ 환경 변수 설정
3. ✅ 데이터베이스 마이그레이션 확인
4. ✅ 각 앱 접속 테스트
5. ✅ 방화벽 설정
6. (선택) 도메인 및 SSL 설정
