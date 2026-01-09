# 단계별 배포 가이드

이 가이드는 체크리스트 작업을 순서대로 진행할 수 있도록 단계별로 안내합니다.

## 🎯 현재 상태

✅ **완료된 작업 (제가 처리함):**
- CI/CD 워크플로우 파일 생성
- 배포 스크립트 생성
- Nginx 설정 파일 생성
- 프론트엔드 빌드 설정 업데이트
- 배포 문서 작성
- 배포 준비 스크립트 생성

⚠️ **사용자가 해야 할 작업:**
- Git 저장소 초기화 및 GitHub 연결
- GitHub Secrets 설정
- Docker Hub 계정 준비
- SSH 키 생성
- DigitalOcean Droplet 생성 및 설정
- 환경 변수 설정
- 첫 배포 실행

---

## 📋 Step-by-Step 가이드

### Step 0: Git 저장소 설정 (5분)

**목적**: 코드를 GitHub에 푸시하기 위한 준비

**방법 1: 자동 스크립트 사용 (권장)**

```bash
cd /Users/ilsoonim/Dev/BlynkV5QR/Apps
bash deployment/setup-git.sh
```

**방법 2: 수동 설정**

```bash
cd /Users/ilsoonim/Dev/BlynkV5QR/Apps

# Git 초기화
git init
git branch -M main

# .gitignore 확인 (없으면 생성)
# (필요시 deployment/setup-git.sh 참조)

# 파일 추가 및 커밋
git add .
git commit -m "Initial commit: Add CI/CD deployment configuration"
```

**GitHub 저장소 연결:**

1. GitHub에서 새 저장소 생성 (https://github.com/new)
2. 저장소 URL 복사
3. 다음 명령어 실행:

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

**확인:**
- GitHub 저장소에 파일들이 올라갔는지 확인
- `.github/workflows/deploy.yml` 파일이 있는지 확인

---

### Step 1: GitHub Secrets 설정 (5분)

**목적**: CI/CD가 외부 서비스에 접근할 수 있도록 인증 정보 설정

**위치**: GitHub 저장소 > Settings > Secrets and variables > Actions

**설정할 Secrets:**

1. **DOCKER_USERNAME**
   - 값: Docker Hub 사용자명
   - 예: `myusername`

2. **DOCKER_PASSWORD**
   - 값: Docker Hub 비밀번호 또는 Access Token
   - 생성 방법:
     - Docker Hub 로그인
     - Account Settings > Security > New Access Token
     - 권한: Read & Write
   - 예: `dckr_pat_xxxxxxxxxxxxx`

3. **DROPLET_HOST**
   - 값: DigitalOcean Droplet IP 주소
   - 예: `123.456.789.0`
   - **참고**: 아직 Droplet이 없다면 나중에 설정 가능

4. **DROPLET_USER**
   - 값: SSH 사용자명
   - 예: `root`

5. **DROPLET_SSH_KEY**
   - 값: SSH 개인키 전체 내용
   - 생성 방법 (다음 Step 참조)

**확인:**
- Secrets 목록에 5개가 모두 있는지 확인

---

### Step 2: SSH 키 생성 (2분)

**목적**: GitHub Actions가 Droplet에 안전하게 접속하기 위해 필요

**로컬 컴퓨터에서 실행:**

```bash
# SSH 키 생성 (이미 있다면 생략 가능)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
# Enter 키를 여러 번 눌러 기본값 사용

# 개인키 확인 (GitHub Secret에 사용)
cat ~/.ssh/id_rsa
# 출력된 전체 내용을 복사 (-----BEGIN 부터 -----END 까지)
# → DROPLET_SSH_KEY Secret에 붙여넣기

# 공개키 확인 (Droplet에 추가할 것)
cat ~/.ssh/id_rsa.pub
# 출력된 내용을 복사해두기 (다음 Step에서 사용)
```

**확인:**
- 개인키가 복사되었는지 확인
- 공개키가 복사되었는지 확인

---

### Step 3: Docker Hub 계정 준비 (2분)

**목적**: Docker 이미지를 저장하고 배포하기 위해 필요

**작업:**

1. [Docker Hub](https://hub.docker.com) 접속
2. 계정 생성 또는 로그인
3. (권장) Access Token 생성:
   - Account Settings > Security > New Access Token
   - 이름: `github-actions`
   - 권한: Read & Write
   - 생성된 토큰 복사
   - → `DOCKER_PASSWORD` Secret에 사용

**확인:**
- Docker Hub 계정이 준비되었는지 확인
- Access Token이 생성되었는지 확인

---

### Step 4: DigitalOcean Droplet 생성 (5분)

**목적**: 애플리케이션을 실행할 서버 준비

**작업:**

1. [DigitalOcean 대시보드](https://cloud.digitalocean.com/droplets/new) 접속

2. Droplet 생성:
   - **이미지**: Ubuntu 22.04 LTS
   - **플랜**: 
     - 개발/테스트: 2GB RAM, 1 vCPU ($12/월)
     - 프로덕션: 4GB RAM, 2 vCPU ($24/월) 이상 권장
   - **데이터센터**: 베트남 또는 가장 가까운 지역
   - **인증**: SSH 키 선택
     - "New SSH Key" 클릭
     - Step 2에서 복사한 공개키 붙여넣기
     - 키 이름 입력 (예: `my-macbook`)
   - **호스트명**: 원하는 이름 (예: `blynk-platform`)
   - **Create Droplet** 클릭

3. IP 주소 확인:
   - 생성된 Droplet의 IP 주소 복사
   - → `DROPLET_HOST` Secret에 업데이트

**확인:**
- Droplet이 생성되었는지 확인
- IP 주소를 기록했는지 확인
- SSH 키가 추가되었는지 확인

---

### Step 5: Droplet 초기 설정 (15분)

**목적**: 서버에 필요한 소프트웨어 설치

**Droplet에 SSH 접속:**

```bash
ssh root@your-droplet-ip
```

**다음 명령어들을 순서대로 실행:**

```bash
# 1. 시스템 업데이트
apt update && apt upgrade -y

# 2. Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Docker Compose 설치
apt install docker-compose-plugin -y

# 4. Nginx 설치
apt install nginx -y

# 5. 디렉토리 생성
mkdir -p /var/www/blynk-platform
chown -R www-data:www-data /var/www/blynk-platform
mkdir -p /opt/blynk-backend
mkdir -p /opt/blynk-backups

# 6. 방화벽 설정
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 7. 자동 시작 설정
systemctl enable docker
systemctl enable nginx

# 8. 설치 확인
docker --version
docker compose version
nginx -v
```

**확인:**
- 모든 명령어가 성공적으로 실행되었는지 확인
- Docker, Docker Compose, Nginx가 설치되었는지 확인

---

### Step 6: 프로젝트 클론 및 환경 변수 설정 (10분)

**목적**: 백엔드 서비스를 시작하기 위한 코드와 설정 준비

**Droplet에서 실행:**

```bash
# 1. 프로젝트 클론
cd /opt/blynk-backend
git clone <your-repo-url> .

# 2. 환경 변수 파일 생성
nano .env.production
```

**환경 변수 입력:**

다음 내용을 실제 값으로 변경하여 입력:

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

**중요 값 생성:**

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

**확인:**
- `.env.production` 파일이 생성되었는지 확인
- `.env` 파일이 생성되었는지 확인
- 모든 값이 올바르게 입력되었는지 확인

---

### Step 7: 초기 백엔드 서비스 시작 (5분)

**목적**: 첫 배포 전에 백엔드가 정상 작동하는지 확인

**Droplet에서 실행:**

```bash
cd /opt/blynk-backend

# Docker Compose로 서비스 시작
docker-compose -f docker-compose.prod.yml up -d

# 서비스 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 잠시 대기 (서비스 시작 시간)
sleep 10

# 데이터베이스 마이그레이션
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:migrate deploy

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f backend
# Ctrl+C로 종료
```

**정상 작동 확인:**

```bash
# 백엔드 헬스 체크
curl http://localhost:3000/health
# 응답: {"status":"ok"} 또는 유사한 메시지
```

**확인:**
- 모든 컨테이너가 실행 중인지 확인
- 백엔드 헬스 체크가 성공하는지 확인
- 로그에 에러가 없는지 확인

---

### Step 8: 첫 배포 실행 (5분)

**목적**: CI/CD 파이프라인이 정상 작동하는지 확인

**방법 1: 코드 푸시 (자동 배포)**

```bash
# 로컬에서
cd /Users/ilsoonim/Dev/BlynkV5QR/Apps

# 변경사항이 있다면
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

1. GitHub Actions에서 각 Job이 실행되는지 확인:
   - `build-backend` Job (약 3-5분)
   - `build-frontend` Job (약 2-3분)
   - `deploy` Job (약 1-2분)

2. 각 단계가 성공적으로 완료되는지 확인

3. 실패한 경우:
   - 실패한 Job 클릭
   - 로그 확인
   - 에러 메시지 확인

**확인:**
- 모든 Job이 성공적으로 완료되었는지 확인
- 배포가 완료되었는지 확인

---

### Step 9: 배포 완료 확인 (5분)

**목적**: 배포된 서비스가 정상 작동하는지 확인

**백엔드 확인:**

```bash
# Droplet에 SSH 접속
ssh root@your-droplet-ip

# 백엔드 헬스 체크
curl http://localhost:3000/health

# 또는 브라우저에서
# http://your-droplet-ip/api/health
```

**프론트엔드 확인:**

브라우저에서 다음 URL 접속:

- Shop Operator: `http://your-droplet-ip/shop/`
- Customer: `http://your-droplet-ip/customer/`
- Administrator: `http://your-droplet-ip/admin/`

**서비스 상태 확인:**

```bash
# Docker 컨테이너 상태
docker-compose -f /opt/blynk-backend/docker-compose.prod.yml ps

# Nginx 상태
systemctl status nginx

# 로그 확인
docker-compose -f /opt/blynk-backend/docker-compose.prod.yml logs -f
```

**확인:**
- 백엔드 API가 응답하는지 확인
- 프론트엔드 앱들이 로드되는지 확인
- 모든 서비스가 정상 작동하는지 확인

---

## ✅ 완료 체크리스트

모든 단계를 완료했는지 확인하세요:

- [ ] Step 0: Git 저장소 설정 완료
- [ ] Step 1: GitHub Secrets 5개 모두 설정 완료
- [ ] Step 2: SSH 키 생성 완료
- [ ] Step 3: Docker Hub 계정 준비 완료
- [ ] Step 4: DigitalOcean Droplet 생성 완료
- [ ] Step 5: Droplet 초기 설정 완료
- [ ] Step 6: 환경 변수 설정 완료
- [ ] Step 7: 초기 백엔드 서비스 시작 완료
- [ ] Step 8: 첫 배포 실행 완료
- [ ] Step 9: 배포 완료 확인 완료

---

## 🆘 문제 해결

각 단계에서 문제가 발생하면:

1. **에러 메시지 확인**
2. **로그 확인**
3. **관련 문서 참조:**
   - `deployment/SETUP_CHECKLIST.md` - 상세 체크리스트
   - `deployment/QUICK_START.md` - 빠른 시작 가이드
   - `blynk_backend/DEPLOYMENT.md` - 배포 가이드 및 트러블슈팅

---

## 📚 추가 자료

- **빠른 시작**: `deployment/QUICK_START.md`
- **사용자 작업 가이드**: `deployment/WHAT_YOU_NEED_TO_DO.md`
- **아키텍처 설명**: `deployment/ARCHITECTURE_EXPLANATION.md`
- **배포 가이드**: `blynk_backend/DEPLOYMENT.md`

---

**행운을 빕니다! 🚀**
