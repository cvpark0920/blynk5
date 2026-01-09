# Blynk Platform 배포 가이드

이 문서는 GitHub CI/CD를 통해 DigitalOcean Droplet에 Blynk Platform을 배포하는 방법을 설명합니다.

## 목차

1. [사전 요구사항](#사전-요구사항)
2. [GitHub Secrets 설정](#github-secrets-설정)
3. [DigitalOcean Droplet 초기 설정](#digitalocean-droplet-초기-설정)
4. [자동 배포 설정](#자동-배포-설정)
5. [수동 배포](#수동-배포)
6. [모니터링 및 트러블슈팅](#모니터링-및-트러블슈팅)

## 사전 요구사항

- GitHub 저장소
- DigitalOcean 계정 및 Droplet
- Docker Hub 계정 (또는 다른 Docker 레지스트리)
- 도메인 이름 (SSL 인증서용, 선택사항)

## GitHub Secrets 설정

GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 Secrets를 설정하세요:

### 필수 Secrets

1. **DOCKER_USERNAME**
   - Docker Hub 사용자명
   - 예: `your-dockerhub-username`

2. **DOCKER_PASSWORD**
   - Docker Hub 비밀번호 또는 Access Token
   - 예: `your-dockerhub-password`

3. **DROPLET_HOST**
   - DigitalOcean Droplet의 IP 주소 또는 도메인
   - 예: `123.456.789.0` 또는 `your-domain.com`

4. **DROPLET_USER**
   - SSH 접속 사용자명 (보통 `root` 또는 `blynk`)
   - 예: `root`

5. **DROPLET_SSH_KEY**
   - SSH 개인키 전체 내용
   - 생성 방법:
     ```bash
     ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
     cat ~/.ssh/id_rsa  # 이 내용을 복사하여 Secret에 추가
     ```

### 선택적 Secrets

6. **VITE_API_URL**
   - 프론트엔드 빌드 시 사용할 API URL
   - 기본값: `https://your-domain.com/api`
   - 예: `https://api.yourdomain.com`

## DigitalOcean Droplet 초기 설정

### 1. Droplet 생성

1. DigitalOcean 대시보드에서 Droplet 생성
2. 이미지: Ubuntu 22.04 LTS
3. 플랜: 최소 2GB RAM, 1 vCPU 권장 (프로덕션은 4GB+ 권장)
4. 지역: 베트남 또는 가장 가까운 지역 선택
5. SSH 키 추가 (선택사항, 또는 비밀번호 사용)

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

# Nginx 설치
apt install nginx -y

# 사용자 생성 (선택사항)
adduser blynk
usermod -aG docker blynk

# 프론트엔드 디렉토리 생성
mkdir -p /var/www/blynk-platform
chown -R www-data:www-data /var/www/blynk-platform

# 백엔드 디렉토리 생성
mkdir -p /opt/blynk-backend

# 배포 디렉토리 생성
mkdir -p /tmp/blynk-deploy
```

### 3. 백엔드 초기 설정

```bash
cd /opt/blynk-backend

# Git 클론 (또는 수동으로 파일 업로드)
git clone <your-repo-url> .

# 환경 변수 설정
cp .env.example .env.production
nano .env.production  # 환경 변수 수정 (아래 참조)

# Docker Compose로 서비스 시작
docker-compose -f docker-compose.prod.yml up -d

# 데이터베이스 마이그레이션
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:migrate deploy

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Nginx 초기 설정

```bash
# Nginx 설정 파일 복사
cp /tmp/blynk-deploy/deployment/nginx.conf /etc/nginx/sites-available/blynk-platform

# 도메인 이름으로 설정 파일 수정
nano /etc/nginx/sites-available/blynk-platform
# SSL 인증서 경로를 실제 도메인으로 변경

# 설정 활성화
ln -s /etc/nginx/sites-available/blynk-platform /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # 기본 설정 제거 (선택사항)

# Nginx 설정 테스트
nginx -t

# Nginx 시작
systemctl restart nginx
systemctl enable nginx
```

### 5. SSL 인증서 설정 (Let's Encrypt)

```bash
# Certbot 설치
apt install certbot python3-certbot-nginx -y

# SSL 인증서 발급 및 자동 설정
certbot --nginx -d your-domain.com

# 자동 갱신 테스트
certbot renew --dry-run
```

### 6. 방화벽 설정

```bash
# UFW 방화벽 설정
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 상태 확인
ufw status
```

## 자동 배포 설정

### GitHub Actions 워크플로우

프로젝트의 `.github/workflows/deploy.yml` 파일이 자동으로 다음을 수행합니다:

1. **백엔드 빌드**: Docker 이미지 빌드 및 Docker Hub에 푸시
2. **프론트엔드 빌드**: ShopOperator, Customer, Administrator 앱 빌드
3. **배포**: SSH를 통해 Droplet에 배포
   - Docker 이미지 풀 및 컨테이너 재시작
   - 프론트엔드 정적 파일 배포
   - Nginx 설정 업데이트 및 리로드
   - Prisma 마이그레이션 실행

### 배포 트리거

- `main` 또는 `master` 브랜치에 푸시 시 자동 배포
- GitHub Actions에서 수동 실행 (`workflow_dispatch`)

### 배포 프로세스

1. 코드를 `main` 브랜치에 푸시
2. GitHub Actions가 자동으로 워크플로우 실행
3. 백엔드 Docker 이미지 빌드 및 푸시
4. 프론트엔드 앱들 빌드
5. 빌드된 파일들을 Droplet에 전송
6. 배포 스크립트 실행:
   - 백엔드 컨테이너 업데이트
   - 프론트엔드 파일 배포
   - Nginx 설정 업데이트
   - 데이터베이스 마이그레이션

## 수동 배포

자동 배포가 작동하지 않을 경우 수동으로 배포할 수 있습니다:

```bash
# Droplet에 SSH 접속
ssh root@your-droplet-ip

# 백엔드 업데이트
cd /opt/blynk-backend
git pull origin main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --no-deps backend
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:migrate deploy

# 프론트엔드 업데이트 (로컬에서 빌드 후)
# 각 앱 디렉토리에서:
cd blynkV5QR_ShopOperator && npm run build
cd blynkV5QR_Customer && npm run build
cd blynkV5QR_Administrator && npm run build

# 빌드된 파일을 Droplet에 업로드
scp -r blynkV5QR_ShopOperator/dist/* root@your-droplet-ip:/var/www/blynk-platform/shop/
scp -r blynkV5QR_Customer/dist/* root@your-droplet-ip:/var/www/blynk-platform/customer/
scp -r blynkV5QR_Administrator/dist/* root@your-droplet-ip:/var/www/blynk-platform/admin/

# Droplet에서 권한 설정
ssh root@your-droplet-ip
chown -R www-data:www-data /var/www/blynk-platform
systemctl reload nginx
```

## 환경 변수 설정

### 백엔드 환경 변수

`/opt/blynk-backend/.env.production` 파일에 다음 변수들을 설정하세요:

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://blynk:your_password@postgres:5432/blynk_db
REDIS_URL=redis://redis:6379

JWT_SECRET=your-very-strong-secret-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback

CORS_ORIGIN=https://your-domain.com

LOG_LEVEL=info
```

### 프론트엔드 환경 변수

프론트엔드 빌드 시 다음 환경 변수를 설정할 수 있습니다:

```env
VITE_API_URL=https://your-domain.com/api
```

이 변수는 GitHub Secrets의 `VITE_API_URL`로 설정하거나, 빌드 시 직접 지정할 수 있습니다.

## 모니터링 및 트러블슈팅

### 서비스 상태 확인

```bash
# 백엔드 컨테이너 상태 확인
cd /opt/blynk-backend
docker-compose -f docker-compose.prod.yml ps

# 백엔드 로그 확인
docker-compose -f docker-compose.prod.yml logs -f backend

# Nginx 상태 확인
systemctl status nginx

# Nginx 로그 확인
tail -f /var/log/nginx/blynk-access.log
tail -f /var/log/nginx/blynk-error.log

# 리소스 사용량 확인
docker stats
htop
```

### 헬스 체크

```bash
# 백엔드 헬스 체크
curl http://localhost:3000/health

# Nginx 헬스 체크
curl http://localhost/health
```

### 데이터베이스 백업

```bash
# 백업 생성
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U blynk blynk_db > backup-$(date +%Y%m%d-%H%M%S).sql

# 백업 복원
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U blynk blynk_db < backup.sql
```

### 롤백

배포 스크립트는 자동으로 백업을 생성합니다. 롤백이 필요한 경우:

```bash
# 프론트엔드 롤백
cd /opt/blynk-backups
tar -xzf frontend-YYYYMMDD-HHMMSS.tar.gz -C /var/www/blynk-platform

# 백엔드 롤백 (이전 Docker 이미지 사용)
cd /opt/blynk-backend
docker-compose -f docker-compose.prod.yml pull blynk-backend:previous-tag
docker-compose -f docker-compose.prod.yml up -d --no-deps backend
```

### 일반적인 문제 해결

#### 포트 충돌

```bash
# 포트 사용 확인
netstat -tulpn | grep :3000
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```

#### 데이터베이스 연결 오류

```bash
# PostgreSQL 로그 확인
docker-compose -f docker-compose.prod.yml logs postgres

# 데이터베이스 연결 테스트
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:studio
```

#### Redis 연결 오류

```bash
# Redis 로그 확인
docker-compose -f docker-compose.prod.yml logs redis

# Redis 연결 테스트
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

#### Nginx 설정 오류

```bash
# 설정 파일 문법 검사
nginx -t

# 설정 파일 재로드
systemctl reload nginx

# Nginx 재시작
systemctl restart nginx
```

#### 프론트엔드 라우팅 문제

경로 기반 라우팅을 사용하므로, 각 앱의 `vite.config.ts`에서 `base` 설정이 올바른지 확인하세요:

- ShopOperator: `base: '/shop/'`
- Customer: `base: '/customer/'`
- Administrator: `base: '/admin/'`

#### Docker 이미지 풀 실패

```bash
# Docker Hub 로그인 확인
docker login

# 이미지 수동 풀
docker pull your-username/blynk-backend:latest
```

## 배포 아키텍처

```
┌─────────────────────────────────────────┐
│  GitHub Actions (CI/CD)                 │
│  ┌─────────────┐  ┌─────────────┐     │
│  │ Backend     │  │ Frontend     │     │
│  │ Build &     │  │ Build        │     │
│  │ Push Image  │  │ Static Files │     │
│  └──────┬──────┘  └──────┬───────┘     │
└─────────┼────────────────┼─────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────┐
│  DigitalOcean Droplet                   │
│  ┌───────────────────────────────────┐ │
│  │ Nginx (Reverse Proxy)             │ │
│  │ /api/* → Backend:3000             │ │
│  │ /shop → ShopOperator (static)    │ │
│  │ /customer → Customer (static)    │ │
│  │ /admin → Administrator (static)  │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ Docker Compose                     │ │
│  │ - Backend (Node.js)               │ │
│  │ - PostgreSQL                      │ │
│  │ - Redis                           │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 추가 리소스

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [DigitalOcean 문서](https://docs.digitalocean.com/)
- [Docker 문서](https://docs.docker.com/)
- [Nginx 문서](https://nginx.org/en/docs/)
