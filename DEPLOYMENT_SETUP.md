# DigitalOcean Droplet 배포 설정 가이드

## Droplet 정보
- **IP 주소**: `165.232.172.98`
- **서버 위치**: DigitalOcean Droplet

---

## 1. GitHub Secrets 설정

GitHub 저장소의 Settings → Secrets and variables → Actions에서 다음 Secrets를 추가하세요:

### 필수 Secrets

| Secret 이름 | 값 | 설명 |
|-----------|-----|------|
| `DOCKER_USERNAME` | `your-docker-username` | Docker Hub 사용자명 |
| `DOCKER_PASSWORD` | `your-docker-password` | Docker Hub 비밀번호 또는 액세스 토큰 |
| `DROPLET_HOST` | `165.232.172.98` | DigitalOcean Droplet IP 주소 |
| `DROPLET_USER` | `root` (또는 설정한 사용자명) | SSH 사용자명 |
| `DROPLET_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | SSH 개인 키 (전체 내용) |

### 프론트엔드 빌드용 Secrets

| Secret 이름 | 값 예시 | 설명 |
|-----------|---------|------|
| `VITE_API_URL` | `https://165.232.172.98/api` 또는 `https://yourdomain.com/api` | 프론트엔드가 사용할 API URL |
| `VITE_FRONTEND_BASE_URL` | `https://165.232.172.98` 또는 `https://yourdomain.com` | 프론트엔드 Base URL (백엔드가 서빙하는 도메인) |

**참고**: 도메인이 없다면 IP 주소를 사용하거나, 나중에 도메인을 설정한 후 업데이트할 수 있습니다.

---

## 2. SSH 키 생성 및 설정

### 로컬에서 SSH 키 생성 (이미 있다면 생략)

```bash
# SSH 키 생성 (이미 있다면 생략)
ssh-keygen -t ed25519 -C "blynk-deployment" -f ~/.ssh/blynk_deploy

# 공개 키 확인
cat ~/.ssh/blynk_deploy.pub
```

### Droplet에 SSH 키 추가

```bash
# 방법 1: ssh-copy-id 사용
ssh-copy-id -i ~/.ssh/blynk_deploy.pub root@165.232.172.98

# 방법 2: 수동으로 추가
cat ~/.ssh/blynk_deploy.pub | ssh root@165.232.172.98 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### GitHub Secrets에 개인 키 추가

```bash
# 개인 키 내용 확인
cat ~/.ssh/blynk_deploy

# 전체 내용을 복사하여 GitHub Secrets의 DROPLET_SSH_KEY에 붙여넣기
```

---

## 3. Droplet 서버 초기 설정

SSH로 Droplet에 접속하여 다음 설정을 진행하세요:

```bash
# SSH 접속
ssh root@165.232.172.98

# 시스템 업데이트
apt update && apt upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose 설치
apt install docker-compose-plugin -y

# Docker 서비스 시작
systemctl enable docker
systemctl start docker

# 프로젝트 디렉토리 생성
mkdir -p /opt/blynk-backend
cd /opt/blynk-backend

# Git 클론
git clone https://github.com/cvpark0920/blynk5.git .

# 환경 변수 파일 생성
cd blynk_backend
cp .env.example .env.production
nano .env.production  # 환경 변수 수정 필요
```

---

## 4. 환경 변수 설정 (.env.production)

`/opt/blynk-backend/blynk_backend/.env.production` 파일을 다음과 같이 설정하세요:

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
GOOGLE_CALLBACK_URL=https://165.232.172.98/api/auth/google/callback
# 또는 도메인 사용 시: https://yourdomain.com/api/auth/google/callback

FRONTEND_BASE_URL=https://165.232.172.98
# 또는 도메인 사용 시: https://yourdomain.com

CORS_ORIGIN=https://165.232.172.98
# 또는 도메인 사용 시: https://yourdomain.com

VIETQR_CLIENT_ID=your-vietqr-client-id
VIETQR_API_KEY=your-vietqr-api-key

UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp
```

**중요**: 
- `JWT_SECRET`은 강력한 랜덤 문자열로 변경하세요 (최소 32자)
- Google OAuth 설정은 실제 값으로 변경하세요
- VietQR 설정은 실제 값으로 변경하세요

---

## 5. docker-compose.prod.yml 환경 변수 설정

`/opt/blynk-backend/blynk_backend/.env.production` 파일이 있으면, docker-compose.prod.yml이 자동으로 읽습니다.

또는 docker-compose.prod.yml과 같은 디렉토리에 `.env` 파일을 생성할 수도 있습니다:

```bash
cd /opt/blynk-backend/blynk_backend
cp .env.production .env
```

---

## 6. 첫 배포 (수동 또는 GitHub Actions)

### 방법 A: GitHub Actions를 통한 자동 배포

1. GitHub Secrets 설정 완료 확인
2. `main` 브랜치에 푸시하면 자동으로 배포 시작
3. GitHub Actions 탭에서 진행 상황 확인

### 방법 B: 수동 배포 (테스트용)

```bash
# Droplet 서버에 SSH 접속
ssh root@165.232.172.98

cd /opt/blynk-backend/blynk_backend

# Docker Compose로 서비스 시작
export DOCKER_USERNAME=your-docker-username
docker-compose -f docker-compose.prod.yml up -d

# 데이터베이스 마이그레이션
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## 7. 방화벽 설정

```bash
# SSH 접속
ssh root@165.232.172.98

# UFW 방화벽 설정
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# 또는 DigitalOcean 방화벽 설정 사용 (권장)
```

---

## 8. Nginx 리버스 프록시 설정 (선택사항)

도메인을 사용하거나 HTTPS를 설정하려면 Nginx를 사용하세요:

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

```bash
# 설정 활성화
ln -s /etc/nginx/sites-available/blynk-backend /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 9. SSL 인증서 설정 (Let's Encrypt)

도메인이 있다면 SSL 인증서를 설정하세요:

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com
```

---

## 10. 배포 확인

배포가 완료되면 다음 URL로 접속하여 확인하세요:

- **Admin 앱**: `http://165.232.172.98/admin` (또는 `https://yourdomain.com/admin`)
- **Shop 앱**: `http://165.232.172.98/shop` (또는 `https://yourdomain.com/shop`)
- **Customer 앱**: `http://165.232.172.98/customer` (또는 `https://yourdomain.com/customer`)
- **API Health Check**: `http://165.232.172.98/health`
- **API**: `http://165.232.172.98/api/*`

---

## 11. 문제 해결

### 컨테이너 로그 확인

```bash
cd /opt/blynk-backend/blynk_backend
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 컨테이너 상태 확인

```bash
docker-compose -f docker-compose.prod.yml ps
```

### 컨테이너 재시작

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

### 데이터베이스 연결 확인

```bash
docker-compose -f docker-compose.prod.yml exec postgres psql -U blynk -d blynk_db -c "\dt"
```

---

## 체크리스트

- [ ] GitHub Secrets 설정 완료
- [ ] SSH 키 생성 및 Droplet에 추가
- [ ] Droplet 서버에 Docker 및 Docker Compose 설치
- [ ] 프로젝트 Git 클론 완료
- [ ] `.env.production` 파일 생성 및 환경 변수 설정
- [ ] 첫 배포 실행 (수동 또는 GitHub Actions)
- [ ] 방화벽 설정 완료
- [ ] (선택) Nginx 리버스 프록시 설정
- [ ] (선택) SSL 인증서 설정
- [ ] 배포 확인 및 테스트

---

## 참고

- GitHub Actions 워크플로우: `.github/workflows/deploy.yml`
- Docker Compose 프로덕션 설정: `blynk_backend/docker-compose.prod.yml`
- 배포 상태 점검 보고서: `DEPLOYMENT_STATUS.md`
