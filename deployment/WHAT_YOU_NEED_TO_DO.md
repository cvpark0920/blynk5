# 배포를 위해 사용자가 해야 할 작업

이 문서는 제가 자동으로 할 수 없는 작업들을 명확히 구분하여 안내합니다.

## 🤖 제가 이미 완료한 작업

다음 작업들은 이미 완료되었습니다:

- ✅ CI/CD 워크플로우 파일 생성 (`.github/workflows/deploy.yml`)
- ✅ 배포 스크립트 생성 (`deployment/deploy.sh`)
- ✅ Nginx 설정 파일 생성 (`deployment/nginx.conf`)
- ✅ 프론트엔드 빌드 설정 업데이트
- ✅ 배포 문서 작성

## 👤 사용자가 직접 해야 할 작업

다음 작업들은 외부 서비스 접근이나 실제 서버 설정이 필요하여 사용자가 직접 해야 합니다.

---

## 📋 필수 작업 체크리스트

### 1️⃣ GitHub Secrets 설정 (약 5분)

**왜 필요한가?**
- GitHub Actions가 Docker Hub에 로그인하고 Droplet에 접속하기 위해 필요
- 코드에 직접 비밀번호를 작성할 수 없으므로 Secrets에 저장

**어디서 하나요?**
- GitHub 저장소 웹사이트에서 설정

**구체적인 방법:**

1. GitHub 저장소 접속
   ```
   https://github.com/your-username/your-repo
   ```

2. Settings 메뉴 클릭
   - 저장소 상단의 "Settings" 탭

3. Secrets 메뉴로 이동
   - 왼쪽 사이드바에서 "Secrets and variables" 클릭
   - "Actions" 선택

4. 다음 5개 Secrets 추가 (각각 "New repository secret" 클릭)

   | Secret 이름 | 값 예시 | 설명 |
   |------------|---------|------|
   | `DOCKER_USERNAME` | `myusername` | Docker Hub 사용자명 |
   | `DOCKER_PASSWORD` | `dckr_pat_xxx...` | Docker Hub 비밀번호 또는 Access Token |
   | `DROPLET_HOST` | `123.456.789.0` | DigitalOcean Droplet IP 주소 |
   | `DROPLET_USER` | `root` | SSH 접속 사용자명 |
   | `DROPLET_SSH_KEY` | `-----BEGIN OPENSSH...` | SSH 개인키 전체 내용 |

**상세 가이드:**
- `SETUP_CHECKLIST.md`의 "1단계: GitHub Secrets 설정" 참조

---

### 2️⃣ Docker Hub 계정 준비 (약 2분)

**왜 필요한가?**
- 빌드된 Docker 이미지를 저장하고 배포하기 위해 필요

**어디서 하나요?**
- Docker Hub 웹사이트

**구체적인 방법:**

1. Docker Hub 계정 생성/로그인
   ```
   https://hub.docker.com
   ```

2. Access Token 생성 (권장)
   - Account Settings > Security > New Access Token
   - 토큰 이름 입력 (예: "github-actions")
   - 권한: Read & Write
   - 생성된 토큰을 `DOCKER_PASSWORD` Secret에 사용

**왜 Access Token을 사용하나요?**
- 비밀번호보다 안전함
- 필요시 개별 토큰만 취소 가능
- 권한 제어 가능

---

### 3️⃣ SSH 키 생성 (약 2분)

**왜 필요한가?**
- GitHub Actions가 Droplet에 안전하게 접속하기 위해 필요

**어디서 하나요?**
- 로컬 컴퓨터 터미널

**구체적인 방법:**

```bash
# 1. SSH 키 생성 (이미 있다면 생략 가능)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# 2. 개인키 내용 확인 (GitHub Secret에 사용)
cat ~/.ssh/id_rsa
# 출력된 전체 내용을 복사 (-----BEGIN 부터 -----END 까지)

# 3. 공개키 내용 확인 (Droplet에 추가할 것)
cat ~/.ssh/id_rsa.pub
```

**중요:**
- 개인키(`id_rsa`) → GitHub Secret에 저장
- 공개키(`id_rsa.pub`) → Droplet에 추가

---

### 4️⃣ DigitalOcean Droplet 생성 (약 5분)

**왜 필요한가?**
- 애플리케이션을 실행할 서버가 필요

**어디서 하나요?**
- DigitalOcean 웹 대시보드

**구체적인 방법:**

1. DigitalOcean 로그인
   ```
   https://cloud.digitalocean.com
   ```

2. Droplet 생성
   - "Create" > "Droplets" 클릭
   - 이미지: Ubuntu 22.04 LTS
   - 플랜: 2GB RAM, 1 vCPU (최소) 또는 4GB+ (권장)
   - 인증: SSH 키 선택 (3단계에서 생성한 공개키)
   - 호스트명: 원하는 이름
   - "Create Droplet" 클릭

3. IP 주소 확인
   - 생성된 Droplet의 IP 주소를 `DROPLET_HOST` Secret에 사용

---

### 5️⃣ Droplet 초기 설정 (약 15분)

**왜 필요한가?**
- 서버에 필요한 소프트웨어 설치 및 디렉토리 준비

**어디서 하나요?**
- Droplet에 SSH 접속하여 실행

**구체적인 방법:**

```bash
# 1. Droplet에 SSH 접속
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
```

**상세 가이드:**
- `SETUP_CHECKLIST.md`의 "3단계: DigitalOcean Droplet 초기 설정" 참조

---

### 6️⃣ 프로젝트 클론 및 환경 변수 설정 (약 10분)

**왜 필요한가?**
- 백엔드 서비스를 시작하기 위해 코드와 설정이 필요

**어디서 하나요?**
- Droplet에 SSH 접속하여 실행

**구체적인 방법:**

```bash
# 1. 프로젝트 클론
cd /opt/blynk-backend
git clone <your-repo-url> .

# 2. 환경 변수 파일 생성
nano .env.production
```

**환경 변수 값 입력 필요:**

다음 값들을 실제 값으로 변경해야 합니다:

```env
# 필수: 데이터베이스 비밀번호 (강력한 비밀번호로 변경)
DATABASE_URL=postgresql://blynk:your_secure_password@postgres:5432/blynk_db

# 필수: JWT 시크릿 (랜덤 문자열 생성)
JWT_SECRET=your-very-strong-secret-key-change-this-in-production-min-32-chars

# 필수: Google OAuth (Google Cloud Console에서 발급)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback

# 필수: CORS 설정 (프론트엔드 도메인)
CORS_ORIGIN=https://your-domain.com
```

**각 값 생성 방법:**

1. **JWT_SECRET 생성:**
   ```bash
   openssl rand -base64 32
   ```

2. **Google OAuth 설정:**
   - [Google Cloud Console](https://console.cloud.google.com/) 접속
   - 프로젝트 생성
   - APIs & Services > Credentials > Create Credentials > OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://your-domain.com/api/auth/google/callback`

3. **데이터베이스 비밀번호:**
   - `docker-compose.prod.yml`의 `POSTGRES_PASSWORD`와 동일하게 설정

4. **Docker Compose용 .env 파일:**
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

**상세 가이드:**
- `SETUP_CHECKLIST.md`의 "4단계: 백엔드 초기 설정" 참조

---

### 7️⃣ 초기 백엔드 서비스 시작 (약 5분)

**왜 필요한가?**
- 첫 배포 전에 백엔드가 정상 작동하는지 확인

**어디서 하나요?**
- Droplet에 SSH 접속하여 실행

**구체적인 방법:**

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

### 8️⃣ 첫 배포 실행 (약 5분)

**왜 필요한가?**
- CI/CD 파이프라인이 정상 작동하는지 확인

**어디서 하나요?**
- GitHub 웹사이트 또는 로컬에서 코드 푸시

**방법 1: 코드 푸시 (자동 배포)**

```bash
# 로컬에서
git add .
git commit -m "Initial deployment setup"
git push origin main
```

**방법 2: 수동 실행**

1. GitHub 저장소 > Actions 탭
2. "Deploy to DigitalOcean" 워크플로우 선택
3. "Run workflow" 버튼 클릭
4. 브랜치 선택 (main)
5. "Run workflow" 클릭

---

## 📊 작업 소요 시간 요약

| 작업 | 소요 시간 | 난이도 | 필수 여부 |
|------|----------|--------|----------|
| GitHub Secrets 설정 | 5분 | ⭐ 쉬움 | ✅ 필수 |
| Docker Hub 계정 준비 | 2분 | ⭐ 쉬움 | ✅ 필수 |
| SSH 키 생성 | 2분 | ⭐ 쉬움 | ✅ 필수 |
| Droplet 생성 | 5분 | ⭐ 쉬움 | ✅ 필수 |
| Droplet 초기 설정 | 15분 | ⭐⭐ 보통 | ✅ 필수 |
| 환경 변수 설정 | 10분 | ⭐⭐⭐ 어려움 | ✅ 필수 |
| 초기 서비스 시작 | 5분 | ⭐⭐ 보통 | ✅ 필수 |
| 첫 배포 실행 | 5분 | ⭐ 쉬움 | ✅ 필수 |

**총 예상 시간: 약 50분**

---

## 🎯 빠른 시작 가이드

가장 빠르게 시작하려면 다음 순서로 진행하세요:

1. **GitHub Secrets 설정** (5분) ← 가장 먼저!
2. **Docker Hub 계정 확인** (2분)
3. **SSH 키 생성** (2분)
4. **Droplet 생성** (5분)
5. **Droplet 초기 설정** (15분)
6. **환경 변수 설정** (10분)
7. **초기 서비스 시작** (5분)
8. **첫 배포 실행** (5분)

---

## ❓ 자주 묻는 질문

### Q: 제가 모든 작업을 다 해야 하나요?

**A:** 네, 위의 8가지 작업은 모두 사용자가 직접 해야 합니다. 제가 할 수 있는 것은 코드와 설정 파일 작성뿐입니다.

### Q: 어느 작업부터 시작해야 하나요?

**A:** GitHub Secrets 설정부터 시작하세요. 이것이 없으면 CI/CD가 작동하지 않습니다.

### Q: 환경 변수 값들을 모르겠어요.

**A:** 
- JWT_SECRET: `openssl rand -base64 32` 명령으로 생성
- Google OAuth: Google Cloud Console에서 발급 필요
- 나머지: 실제 사용할 도메인/비밀번호로 설정

### Q: Droplet 초기 설정이 복잡해 보여요.

**A:** `SETUP_CHECKLIST.md`에 단계별 명령어가 모두 있습니다. 복사해서 붙여넣기만 하면 됩니다.

### Q: 배포가 실패하면 어떻게 하나요?

**A:** 
1. GitHub Actions 로그 확인
2. Droplet에 SSH 접속하여 로그 확인
3. `DEPLOYMENT.md`의 트러블슈팅 섹션 참조

---

## 🆘 도움이 필요할 때

각 작업에 대한 상세 가이드는 다음 파일들을 참조하세요:

- **전체 체크리스트**: `deployment/SETUP_CHECKLIST.md`
- **아키텍처 설명**: `deployment/ARCHITECTURE_EXPLANATION.md`
- **배포 가이드**: `blynk_backend/DEPLOYMENT.md`

---

## ✅ 완료 체크리스트

배포 준비가 완료되었는지 확인하세요:

- [ ] GitHub Secrets 5개 모두 설정 완료
- [ ] Docker Hub 계정 준비 완료
- [ ] SSH 키 생성 완료
- [ ] DigitalOcean Droplet 생성 완료
- [ ] Droplet 초기 설정 완료
- [ ] 환경 변수 설정 완료
- [ ] 초기 백엔드 서비스 시작 완료
- [ ] 첫 배포 실행 완료

모든 항목이 체크되면 배포 준비가 완료된 것입니다! 🎉
