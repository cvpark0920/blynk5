# Blynk Backend 배포 가이드

## DigitalOcean Droplet 배포

### 1. Droplet 생성

1. DigitalOcean 대시보드에서 Droplet 생성
2. 이미지: Ubuntu 22.04 LTS
3. 플랜: 최소 2GB RAM, 1 vCPU 권장
4. 지역: 베트남 또는 가장 가까운 지역 선택

### 2. 서버 초기 설정

```bash
# SSH 접속
ssh root@your-droplet-ip

# 시스템 업데이트
apt update && apt upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose 설치
apt install docker-compose-plugin -y

# 사용자 생성 (선택사항)
adduser blynk
usermod -aG docker blynk
```

### 3. 프로젝트 배포

```bash
# 프로젝트 디렉토리 생성
mkdir -p /opt/blynk-backend
cd /opt/blynk-backend

# Git 클론 (또는 파일 업로드)
git clone <your-repo-url> .

# 환경 변수 설정
cp blynk_backend/.env.example blynk_backend/.env.production
nano blynk_backend/.env.production  # 환경 변수 수정

# 프론트엔드 빌드 (프로젝트 루트에서 실행)
# VITE_API_URL은 백엔드 서버 URL로 설정 (예: https://api.yourdomain.com)
cd /opt/blynk-backend
VITE_API_URL=https://api.yourdomain.com npm run build

# Docker Compose로 서비스 시작 (blynk_backend 디렉토리에서 실행)
cd blynk_backend
docker-compose -f docker-compose.prod.yml up -d

# 데이터베이스 마이그레이션
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f
```

**참고**: 프론트엔드와 백엔드가 통합되어 하나의 서버에서 서빙됩니다.
- 프론트엔드: `http://your-domain.com/admin`, `/shop`, `/customer`
- 백엔드 API: `http://your-domain.com/api/*`

### 4. Nginx 리버스 프록시 설정 (선택사항)

```bash
# Nginx 설치
apt install nginx -y

# 설정 파일 생성
nano /etc/nginx/sites-available/blynk-backend
```

Nginx 설정 예시:

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

```bash
# 설정 활성화
ln -s /etc/nginx/sites-available/blynk-backend /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 5. SSL 인증서 설정 (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com
```

### 6. 방화벽 설정

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 7. 자동 재시작 설정

```bash
# systemd 서비스 파일 생성 (선택사항)
nano /etc/systemd/system/blynk-backend.service
```

```ini
[Unit]
Description=Blynk Backend Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/blynk-backend
ExecStart=/usr/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.prod.yml down
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable blynk-backend
systemctl start blynk-backend
```

## 환경 변수 설정

`.env.production` 파일에 다음 변수들을 설정하세요:

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://blynk:blynk@postgres:5432/blynk_db
REDIS_URL=redis://redis:6379

JWT_SECRET=your-strong-secret-key-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback

CORS_ORIGIN=https://your-frontend-domain.com

LOG_LEVEL=info
```

## 모니터링

```bash
# 컨테이너 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f backend

# 리소스 사용량 확인
docker stats

# 데이터베이스 백업
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U blynk blynk_db > backup.sql
```

## 업데이트

```bash
cd /opt/blynk-backend

# 코드 업데이트
git pull origin main

# 프론트엔드 빌드 (변경사항이 있는 경우)
VITE_API_URL=https://api.yourdomain.com npm run build

# Docker 이미지 재빌드 및 재시작
cd blynk_backend
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 데이터베이스 마이그레이션
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## 트러블슈팅

### 포트 충돌
```bash
# 포트 사용 확인
netstat -tulpn | grep :3000
```

### 데이터베이스 연결 오류
```bash
# PostgreSQL 로그 확인
docker-compose -f docker-compose.prod.yml logs postgres
```

### Redis 연결 오류
```bash
# Redis 로그 확인
docker-compose -f docker-compose.prod.yml logs redis
```
