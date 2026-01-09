# 빠른 시작 가이드

이 가이드는 배포를 가장 빠르게 시작할 수 있도록 단계별로 안내합니다.

## 🚀 시작하기 전 확인사항

배포에 필요한 모든 파일이 준비되었는지 확인하세요:

- [x] CI/CD 워크플로우 파일 (`.github/workflows/deploy.yml`)
- [x] 배포 스크립트 (`deployment/deploy.sh`)
- [x] Nginx 설정 (`deployment/nginx.conf`)
- [x] Docker 설정 (`blynk_backend/Dockerfile`, `docker-compose.prod.yml`)
- [x] 프론트엔드 빌드 설정 (각 앱의 `vite.config.ts`)

## 📝 단계별 실행 가이드

### Step 1: 코드를 GitHub에 푸시 (필수, 먼저!)

```bash
# 현재 디렉토리에서 실행
cd /Users/ilsoonim/Dev/BlynkV5QR/Apps

# 변경사항 확인
git status

# 모든 파일 추가
git add .

# 커밋
git commit -m "Add CI/CD deployment configuration"

# GitHub에 푸시
git push origin main
```

**확인 방법:**
- GitHub 저장소 웹사이트 접속
- `.github/workflows/deploy.yml` 파일이 있는지 확인
- Actions 탭에서 워크플로우가 보이는지 확인

---

### Step 2: GitHub Secrets 설정 (5분)

1. GitHub 저장소 접속
   ```
   https://github.com/your-username/your-repo
   ```

2. Settings > Secrets and variables > Actions

3. 다음 5개 Secrets 추가:

   **DOCKER_USERNAME**
   - 값: Docker Hub 사용자명
   - 예: `myusername`

   **DOCKER_PASSWORD**
   - 값: Docker Hub 비밀번호 또는 Access Token
   - 생성 방법: Docker Hub > Account Settings > Security > New Access Token
   - 예: `dckr_pat_xxxxxxxxxxxxx`

   **DROPLET_HOST**
   - 값: DigitalOcean Droplet IP 주소
   - 예: `123.456.789.0`

   **DROPLET_USER**
   - 값: SSH 사용자명
   - 예: `root`

   **DROPLET_SSH_KEY**
   - 값: SSH 개인키 전체 내용
   - 생성 방법:
     ```bash
     ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
     cat ~/.ssh/id_rsa
     # 출력된 전체 내용 복사 (-----BEGIN 부터 -----END 까지)
     ```

---

### Step 3: Docker Hub 계정 준비 (2분)

1. [Docker Hub](https://hub.docker.com) 접속
2. 계정 생성 또는 로그인
3. (권장) Access Token 생성:
   - Account Settings > Security > New Access Token
   - 권한: Read & Write
   - 생성된 토큰을 `DOCKER_PASSWORD` Secret에 사용

---

### Step 4: SSH 키 생성 (2분)

```bash
# SSH 키 생성 (이미 있다면 생략)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
# Enter 키를 여러 번 눌러 기본값 사용

# 개인키 확인 (GitHub Secret에 사용)
cat ~/.ssh/id_rsa

# 공개키 확인 (Droplet에 추가할 것)
cat ~/.ssh/id_rsa.pub
```

---

### Step 5: DigitalOcean Droplet 생성 (5분)

1. [DigitalOcean 대시보드](https://cloud.digitalocean.com/droplets/new) 접속

2. Droplet 생성:
   - **이미지**: Ubuntu 22.04 LTS
   - **플랜**: 2GB RAM, 1 vCPU (최소) 또는 4GB+ (권장)
   - **인증**: SSH 키 선택 (Step 4에서 생성한 공개키)
   - **호스트명**: 원하는 이름 (예: `blynk-platform`)
   - **Create Droplet** 클릭

3. IP 주소 확인 및 저장
   - 생성된 Droplet의 IP 주소를 `DROPLET_HOST` Secret에 사용

---

### Step 6: Droplet 초기 설정 (15분)

Droplet에 SSH 접속 후 다음 명령어들을 **순서대로** 실행:

```bash
# 1. SSH 접속
ssh root@your-droplet-ip

# 2. 시스템 업데이트
apt update && apt upgrade -y

# 3. Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 4. Docker Compose 설치
apt install docker-compose-plugin -y

# 5. Nginx 설치
apt install nginx -y

# 6. 디렉토리 생성
mkdir -p /var/www/blynk-platform
chown -R www-data:www-data /var/www/blynk-platform
mkdir -p /opt/blynk-backend
mkdir -p /opt/blynk-backups

# 7. 방화벽 설정
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 8. Docker 및 Nginx 자동 시작 설정
systemctl enable docker
systemctl enable nginx
```

---

### Step 7: 프로젝트 클론 및 환경 변수 설정 (10분)

```bash
# 1. 프로젝트 클론
cd /opt/blynk-backend
git clone <your-repo-url> .

# 2. 환경 변수 파일 생성
nano .env.production
```

**환경 변수 값 입력:**

```env
NODE_ENV=production
PORT=3000

# 데이터베이스 (비밀번호를 강력한 값으로 변경!)
DATABASE_URL=postgresql://blynk:your_secure_password@postgres:5432/blynk_db

# Redis
REDIS_URL=redis://redis:6379

# JWT 시크릿 (랜덤 문자열 생성)
JWT_SECRET=your-very-strong-secret-key-change-this-in-production-min-32-chars

# JWT 만료 시간
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

**중요 값 생성 방법:**

1. **JWT_SECRET 생성:**
   ```bash
   openssl rand -base64 32
   ```

2. **데이터베이스 비밀번호:**
   - `docker-compose.prod.yml`의 `POSTGRES_PASSWORD`와 동일하게 설정

3. **Docker Compose용 .env 파일:**
   ```bash
   nano /opt/blynk-backend/.env
   ```
   ```env
   JWT_SECRET=your-very-strong-secret-key-change-this-in-production-min-32-chars
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback
   CORS_ORIGIN=https://your-domain.com
   ```

---

### Step 8: 초기 백엔드 서비스 시작 (5분)

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

**정상 작동 확인:**
```bash
# 백엔드 헬스 체크
curl http://localhost:3000/health
# 응답: {"status":"ok"} 또는 유사한 메시지
```

---

### Step 9: 첫 배포 실행 (5분)

**방법 1: 코드 푸시 (자동 배포)**

```bash
# 로컬에서
git add .
git commit -m "Trigger deployment"
git push origin main
```

**방법 2: 수동 실행**

1. GitHub 저장소 > Actions 탭
2. "Deploy to DigitalOcean" 워크플로우 선택
3. "Run workflow" 버튼 클릭
4. 브랜치 선택 (main)
5. "Run workflow" 클릭

**배포 진행 확인:**
- GitHub Actions에서 각 Job이 성공적으로 완료되는지 확인
- 약 7-10분 소요

---

## ✅ 배포 완료 확인

배포가 완료되면 다음을 확인하세요:

### 백엔드 확인
```bash
# Droplet에 SSH 접속
ssh root@your-droplet-ip

# 백엔드 헬스 체크
curl http://localhost:3000/health

# 또는 브라우저에서
# http://your-droplet-ip/api/health
```

### 프론트엔드 확인
브라우저에서 다음 URL 접속:

- Shop Operator: `http://your-droplet-ip/shop/`
- Customer: `http://your-droplet-ip/customer/`
- Administrator: `http://your-droplet-ip/admin/`

### 서비스 상태 확인
```bash
# Docker 컨테이너 상태
docker-compose -f /opt/blynk-backend/docker-compose.prod.yml ps

# Nginx 상태
systemctl status nginx

# 로그 확인
docker-compose -f /opt/blynk-backend/docker-compose.prod.yml logs -f
```

---

## 🆘 문제 해결

### 배포가 실패하는 경우

1. **GitHub Actions 로그 확인**
   - GitHub 저장소 > Actions 탭
   - 실패한 워크플로우 클릭
   - 실패한 Job의 로그 확인

2. **Droplet 로그 확인**
   ```bash
   ssh root@your-droplet-ip
   docker-compose -f /opt/blynk-backend/docker-compose.prod.yml logs
   tail -f /var/log/nginx/blynk-error.log
   ```

3. **일반적인 문제**
   - Secrets 설정 확인
   - SSH 키 권한 확인
   - 환경 변수 값 확인
   - Docker 이미지 pull 실패 확인

자세한 트러블슈팅은 `DEPLOYMENT.md`를 참조하세요.

---

## 📚 추가 자료

- **상세 체크리스트**: `deployment/SETUP_CHECKLIST.md`
- **아키텍처 설명**: `deployment/ARCHITECTURE_EXPLANATION.md`
- **사용자 작업 가이드**: `deployment/WHAT_YOU_NEED_TO_DO.md`
- **배포 가이드**: `blynk_backend/DEPLOYMENT.md`

---

## ⏱️ 예상 소요 시간

| 단계 | 소요 시간 |
|------|----------|
| 코드 푸시 | 2분 |
| GitHub Secrets 설정 | 5분 |
| Docker Hub 계정 | 2분 |
| SSH 키 생성 | 2분 |
| Droplet 생성 | 5분 |
| Droplet 초기 설정 | 15분 |
| 환경 변수 설정 | 10분 |
| 초기 서비스 시작 | 5분 |
| 첫 배포 실행 | 5분 |
| **총계** | **약 50분** |

---

**행운을 빕니다! 🚀**
