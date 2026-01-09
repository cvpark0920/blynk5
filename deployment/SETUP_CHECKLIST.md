# 배포 준비 체크리스트

이 문서는 GitHub CI/CD를 통해 DigitalOcean Droplet에 배포하기 전에 완료해야 할 작업들을 단계별로 안내합니다.

## ✅ 1단계: GitHub Secrets 설정

GitHub 저장소에서 다음 Secrets를 설정해야 합니다.

**경로**: GitHub 저장소 > Settings > Secrets and variables > Actions > New repository secret

### 필수 Secrets

#### 1. DOCKER_USERNAME
- **설명**: Docker Hub 사용자명
- **설정 방법**:
  1. Docker Hub 계정이 없으면 [Docker Hub](https://hub.docker.com)에서 가입
  2. 사용자명을 Secret 값으로 입력
- **예시**: `myusername`

#### 2. DOCKER_PASSWORD
- **설명**: Docker Hub 비밀번호 또는 Access Token (권장)
- **설정 방법**:
  1. Docker Hub 로그인
  2. Account Settings > Security > New Access Token 생성
  3. 생성된 토큰을 Secret 값으로 입력 (비밀번호보다 안전함)
- **예시**: `dckr_pat_xxxxxxxxxxxxx`

#### 3. DROPLET_HOST
- **설명**: DigitalOcean Droplet의 IP 주소 또는 도메인
- **설정 방법**:
  1. DigitalOcean Droplet 생성 후 IP 주소 확인
  2. 또는 도메인을 연결한 경우 도메인 입력
- **예시**: `123.456.789.0` 또는 `api.yourdomain.com`

#### 4. DROPLET_USER
- **설명**: SSH 접속 사용자명
- **설정 방법**: 보통 `root` 사용 (또는 생성한 사용자명)
- **예시**: `root`

#### 5. DROPLET_SSH_KEY
- **설명**: SSH 개인키 전체 내용
- **설정 방법**:
  ```bash
  # 로컬 컴퓨터에서 SSH 키 생성 (없는 경우)
  ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
  
  # 개인키 내용 확인
  cat ~/.ssh/id_rsa
  
  # 출력된 전체 내용을 복사하여 Secret에 붙여넣기
  # (-----BEGIN OPENSSH PRIVATE KEY----- 부터 -----END OPENSSH PRIVATE KEY----- 까지)
  ```
- **중요**: 공개키(`id_rsa.pub`)가 아닌 **개인키**(`id_rsa`)를 사용해야 합니다.

### 선택적 Secrets

#### 6. VITE_API_URL
- **설명**: 프론트엔드 빌드 시 사용할 API URL
- **설정 방법**: 도메인이 설정된 경우에만 필요
- **예시**: `https://api.yourdomain.com/api`
- **기본값**: `https://your-domain.com/api` (워크플로우에서 사용)

---

## ✅ 2단계: SSH 키를 Droplet에 추가

생성한 SSH 공개키를 Droplet에 추가해야 합니다.

### 방법 1: DigitalOcean Droplet 생성 시 추가 (권장)

1. DigitalOcean Droplet 생성 화면에서 "SSH keys" 섹션 찾기
2. "New SSH Key" 클릭
3. 로컬에서 공개키 내용 복사:
   ```bash
   cat ~/.ssh/id_rsa.pub
   ```
4. 복사한 내용을 붙여넣고 키 이름 입력
5. Droplet 생성

### 방법 2: 기존 Droplet에 추가

```bash
# 로컬에서 공개키 내용 확인
cat ~/.ssh/id_rsa.pub

# Droplet에 SSH 접속 (비밀번호 사용)
ssh root@your-droplet-ip

# 공개키를 authorized_keys에 추가
mkdir -p ~/.ssh
echo "여기에_공개키_내용_붙여넣기" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# SSH 접속 테스트
# 로컬에서: ssh root@your-droplet-ip
```

---

## ✅ 3단계: DigitalOcean Droplet 생성 및 초기 설정

### 3.1 Droplet 생성

1. [DigitalOcean 대시보드](https://cloud.digitalocean.com/droplets/new) 접속
2. 다음 설정으로 Droplet 생성:
   - **이미지**: Ubuntu 22.04 LTS
   - **플랜**: 
     - 개발/테스트: 2GB RAM, 1 vCPU ($12/월)
     - 프로덕션: 4GB RAM, 2 vCPU ($24/월) 이상 권장
   - **데이터센터**: 베트남 또는 가장 가까운 지역
   - **인증**: SSH 키 선택 (2단계에서 추가한 키)
   - **호스트명**: 원하는 이름 (예: `blynk-platform`)

### 3.2 서버 초기 설정

Droplet에 SSH 접속 후 다음 명령어 실행:

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

# 프론트엔드 디렉토리 생성
mkdir -p /var/www/blynk-platform
chown -R www-data:www-data /var/www/blynk-platform

# 백엔드 디렉토리 생성
mkdir -p /opt/blynk-backend

# 백업 디렉토리 생성
mkdir -p /opt/blynk-backups

# 방화벽 설정
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Docker 및 Nginx 자동 시작 설정
systemctl enable docker
systemctl enable nginx
```

---

## ✅ 4단계: 백엔드 초기 설정

### 4.1 프로젝트 클론

```bash
cd /opt/blynk-backend

# Git 저장소 클론
git clone <your-repo-url> .

# 또는 수동으로 파일 업로드
```

### 4.2 환경 변수 설정

```bash
# 환경 변수 파일 생성
nano .env.production
```

다음 내용을 입력 (실제 값으로 변경):

```env
NODE_ENV=production
PORT=3000

# 데이터베이스 (Docker Compose 내부 네트워크 사용)
DATABASE_URL=postgresql://blynk:your_secure_password@postgres:5432/blynk_db

# Redis (Docker Compose 내부 네트워크 사용)
REDIS_URL=redis://redis:6379

# JWT 시크릿 (강력한 랜덤 문자열 생성)
JWT_SECRET=your-very-strong-secret-key-change-this-in-production-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Google OAuth (Google Cloud Console에서 발급)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback

# CORS 설정 (프론트엔드 도메인)
CORS_ORIGIN=https://your-domain.com

# 로깅
LOG_LEVEL=info
```

**중요 설정 가이드**:

1. **JWT_SECRET 생성**:
   ```bash
   # 강력한 랜덤 문자열 생성
   openssl rand -base64 32
   ```

2. **Google OAuth 설정**:
   - [Google Cloud Console](https://console.cloud.google.com/) 접속
   - 프로젝트 생성 또는 선택
   - APIs & Services > Credentials > Create Credentials > OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://your-domain.com/api/auth/google/callback`

3. **데이터베이스 비밀번호 변경**:
   - `docker-compose.prod.yml`의 `POSTGRES_PASSWORD`와 `.env.production`의 `DATABASE_URL` 비밀번호를 동일하게 설정

### 4.3 Docker Compose 환경 변수 파일 생성

```bash
# docker-compose.prod.yml에서 사용할 .env 파일 생성
nano /opt/blynk-backend/.env
```

`.env.production`의 값들을 참고하여 다음 변수들 설정:

```env
JWT_SECRET=your-very-strong-secret-key-change-this-in-production-min-32-chars
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback
CORS_ORIGIN=https://your-domain.com
```

### 4.4 백엔드 서비스 시작

```bash
cd /opt/blynk-backend

# Docker Compose로 서비스 시작
docker-compose -f docker-compose.prod.yml up -d

# 서비스 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 데이터베이스 마이그레이션
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:migrate deploy

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## ✅ 5단계: Nginx 초기 설정 (도메인 없는 경우)

도메인이 없는 경우, IP 주소로 접속할 수 있도록 임시 설정:

```bash
# 기본 Nginx 설정 백업
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# 임시 설정 파일 생성
nano /etc/nginx/sites-available/blynk-platform
```

다음 내용 입력 (SSL 없이 HTTP만):

```nginx
server {
    listen 80;
    server_name _;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SSE support
    location /api/sse/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }

    # Frontend apps (배포 후 자동으로 설정됨)
    root /var/www/blynk-platform;
    index index.html;

    location /shop/ {
        alias /var/www/blynk-platform/shop/;
        try_files $uri $uri/ /shop/index.html;
    }

    location /customer/ {
        alias /var/www/blynk-platform/customer/;
        try_files $uri $uri/ /customer/index.html;
    }

    location /admin/ {
        alias /var/www/blynk-platform/admin/;
        try_files $uri $uri/ /admin/index.html;
    }

    location = / {
        return 301 /shop/;
    }
}
```

```bash
# 설정 활성화
ln -s /etc/nginx/sites-available/blynk-platform /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# 설정 테스트
nginx -t

# Nginx 재시작
systemctl restart nginx
```

---

## ✅ 6단계: 도메인 및 SSL 설정 (선택사항, 권장)

### 6.1 도메인 DNS 설정

1. 도메인 제공업체에서 A 레코드 추가:
   - **Type**: A
   - **Name**: @ (또는 원하는 서브도메인)
   - **Value**: Droplet IP 주소
   - **TTL**: 3600

2. DNS 전파 확인 (몇 분 소요):
   ```bash
   dig your-domain.com
   # 또는
   nslookup your-domain.com
   ```

### 6.2 SSL 인증서 설정

```bash
# Certbot 설치
apt install certbot python3-certbot-nginx -y

# SSL 인증서 발급 및 자동 설정
certbot --nginx -d your-domain.com

# 자동 갱신 테스트
certbot renew --dry-run
```

Certbot이 자동으로 Nginx 설정을 업데이트합니다.

---

## ✅ 7단계: 첫 배포 실행

### 방법 1: 자동 배포 (권장)

1. 코드를 `main` 브랜치에 푸시:
   ```bash
   git add .
   git commit -m "Initial deployment setup"
   git push origin main
   ```

2. GitHub Actions에서 워크플로우 실행 확인:
   - GitHub 저장소 > Actions 탭
   - "Deploy to DigitalOcean" 워크플로우 실행 확인
   - 각 단계가 성공적으로 완료되는지 확인

### 방법 2: 수동 배포

GitHub Actions에서 수동으로 실행:

1. GitHub 저장소 > Actions 탭
2. "Deploy to DigitalOcean" 워크플로우 선택
3. "Run workflow" 버튼 클릭
4. 브랜치 선택 (main)
5. "Run workflow" 클릭

---

## ✅ 8단계: 배포 확인

### 백엔드 확인

```bash
# Droplet에 SSH 접속
ssh root@your-droplet-ip

# 백엔드 헬스 체크
curl http://localhost:3000/health

# 또는 브라우저에서
# http://your-domain.com/api/health
```

### 프론트엔드 확인

브라우저에서 다음 URL 접속:

- Shop Operator: `http://your-domain.com/shop/` 또는 `http://your-droplet-ip/shop/`
- Customer: `http://your-domain.com/customer/` 또는 `http://your-droplet-ip/customer/`
- Administrator: `http://your-domain.com/admin/` 또는 `http://your-droplet-ip/admin/`

### 서비스 상태 확인

```bash
# Docker 컨테이너 상태
docker-compose -f /opt/blynk-backend/docker-compose.prod.yml ps

# Nginx 상태
systemctl status nginx

# 로그 확인
docker-compose -f /opt/blynk-backend/docker-compose.prod.yml logs -f
tail -f /var/log/nginx/blynk-access.log
```

---

## 🔧 문제 해결

### SSH 연결 실패

```bash
# SSH 키 권한 확인
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# SSH 연결 테스트
ssh -v root@your-droplet-ip
```

### Docker 이미지 풀 실패

```bash
# Docker Hub 로그인 확인
docker login

# 이미지 수동 풀
docker pull your-username/blynk-backend:latest
```

### Nginx 502 Bad Gateway

```bash
# 백엔드가 실행 중인지 확인
docker-compose -f /opt/blynk-backend/docker-compose.prod.yml ps

# 백엔드 로그 확인
docker-compose -f /opt/blynk-backend/docker-compose.prod.yml logs backend

# 포트 확인
netstat -tulpn | grep 3000
```

### 프론트엔드 404 오류

```bash
# 프론트엔드 파일 확인
ls -la /var/www/blynk-platform/shop/
ls -la /var/www/blynk-platform/customer/
ls -la /var/www/blynk-platform/admin/

# Nginx 설정 확인
nginx -t
cat /etc/nginx/sites-available/blynk-platform
```

---

## 📝 체크리스트 요약

배포 전 확인사항:

- [ ] GitHub Secrets 5개 모두 설정 완료
- [ ] SSH 키 생성 및 Droplet에 추가 완료
- [ ] DigitalOcean Droplet 생성 완료
- [ ] 서버 초기 설정 완료 (Docker, Nginx 설치)
- [ ] 백엔드 환경 변수 설정 완료
- [ ] 백엔드 서비스 시작 및 마이그레이션 완료
- [ ] Nginx 설정 완료
- [ ] 도메인 및 SSL 설정 완료 (선택사항)
- [ ] 첫 배포 실행 완료
- [ ] 모든 서비스 정상 작동 확인 완료

---

## 🚀 다음 단계

배포가 완료되면:

1. **모니터링 설정**: 로그 모니터링 및 알림 설정
2. **백업 자동화**: 데이터베이스 자동 백업 스크립트 설정
3. **성능 최적화**: Nginx 캐싱, CDN 설정 등
4. **보안 강화**: 방화벽 규칙 추가, 보안 헤더 설정 등

자세한 내용은 `DEPLOYMENT.md`를 참조하세요.
