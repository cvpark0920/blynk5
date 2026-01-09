# 다음 단계 가이드

## ✅ 완료된 작업

다음 작업들이 성공적으로 완료되었습니다:

- ✅ Git 저장소 초기화 및 GitHub 연결
- ✅ 코드 푸시 완료
- ✅ CI/CD 워크플로우 파일 준비 완료
- ✅ 배포 스크립트 준비 완료
- ✅ 모든 필수 파일 준비 완료

## 📋 다음에 해야 할 작업

이제 다음 단계들을 순서대로 진행하세요:

### 1. GitHub Secrets 설정 (5분) - 필수

**위치**: GitHub 저장소 > Settings > Secrets and variables > Actions

**설정할 Secrets:**

1. **DOCKER_USERNAME**
   - Docker Hub 사용자명
   - 예: `myusername`

2. **DOCKER_PASSWORD**
   - Docker Hub 비밀번호 또는 Access Token
   - 생성 방법:
     - Docker Hub 로그인
     - Account Settings > Security > New Access Token
     - 권한: Read & Write
   - 예: `dckr_pat_xxxxxxxxxxxxx`

3. **DROPLET_HOST**
   - DigitalOcean Droplet IP 주소
   - 예: `123.456.789.0`
   - **참고**: 아직 Droplet이 없다면 나중에 설정 가능

4. **DROPLET_USER**
   - SSH 사용자명
   - 예: `root`

5. **DROPLET_SSH_KEY**
   - SSH 개인키 전체 내용
   - 생성 방법:
     ```bash
     ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
     cat ~/.ssh/id_rsa
     # 출력된 전체 내용 복사 (-----BEGIN 부터 -----END 까지)
     ```

### 2. Docker Hub 계정 준비 (2분)

- [Docker Hub](https://hub.docker.com) 접속
- 계정 생성 또는 로그인
- Access Token 생성 (권장)

### 3. SSH 키 생성 (2분)

```bash
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
cat ~/.ssh/id_rsa.pub  # 공개키 (Droplet에 추가할 것)
```

### 4. DigitalOcean Droplet 생성 (5분)

1. [DigitalOcean 대시보드](https://cloud.digitalocean.com/droplets/new) 접속
2. Droplet 생성:
   - 이미지: Ubuntu 22.04 LTS
   - 플랜: 2GB RAM, 1 vCPU (최소)
   - 인증: SSH 키 선택
   - Create Droplet 클릭
3. IP 주소 확인 및 저장

### 5. Droplet 초기 설정 (15분)

SSH 접속 후 다음 명령어 실행:

```bash
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

# 디렉토리 생성
mkdir -p /var/www/blynk-platform
chown -R www-data:www-data /var/www/blynk-platform
mkdir -p /opt/blynk-backend
mkdir -p /opt/blynk-backups

# 방화벽 설정
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 자동 시작 설정
systemctl enable docker
systemctl enable nginx
```

### 6. 프로젝트 클론 및 환경 변수 설정 (10분)

```bash
cd /opt/blynk-backend
git clone https://github.com/cvpark0920/blynk5.git .

# 환경 변수 파일 생성
nano .env.production
```

필요한 환경 변수 값 입력 (자세한 내용은 `SETUP_CHECKLIST.md` 참조)

### 7. 초기 백엔드 서비스 시작 (5분)

```bash
cd /opt/blynk-backend
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:migrate deploy
```

### 8. 첫 배포 실행 (5분)

코드를 푸시하거나 GitHub Actions에서 수동 실행:

```bash
# 로컬에서
git add .
git commit -m "Trigger deployment"
git push origin main
```

또는 GitHub Actions에서 "Run workflow" 클릭

## 📚 상세 가이드

각 단계에 대한 상세한 설명은 다음 문서를 참조하세요:

- **빠른 시작**: `deployment/QUICK_START.md`
- **단계별 가이드**: `deployment/STEP_BY_STEP_GUIDE.md`
- **체크리스트**: `deployment/SETUP_CHECKLIST.md`
- **사용자 작업 가이드**: `deployment/WHAT_YOU_NEED_TO_DO.md`

## 🎯 현재 상태

- ✅ 코드가 GitHub에 푸시됨
- ✅ CI/CD 워크플로우 파일 준비됨
- ⏳ GitHub Secrets 설정 필요
- ⏳ Docker Hub 계정 준비 필요
- ⏳ SSH 키 생성 필요
- ⏳ Droplet 생성 및 설정 필요

## 🚀 다음 작업

**가장 먼저 해야 할 일**: GitHub Secrets 설정

GitHub 저장소 > Settings > Secrets and variables > Actions에서 5개 Secrets를 설정하세요.

자세한 내용은 `deployment/QUICK_START.md`를 참조하세요.
