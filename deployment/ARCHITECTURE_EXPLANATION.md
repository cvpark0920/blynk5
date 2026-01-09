# 배포 아키텍처 상세 설명

## 🏗️ 전체 배포 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│  (소스 코드 저장소)                                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 코드 푸시 (main 브랜치)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Actions (CI/CD)                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Job 1: build-backend                                  │ │
│  │  - GitHub Actions Runner (Ubuntu)                    │ │
│  │  - Docker 이미지 빌드                                 │ │
│  │  - Docker Hub에 푸시                                  │ │
│  └───────────────────┬───────────────────────────────────┘ │
│                      │                                       │
│  ┌───────────────────▼───────────────────────────────────┐ │
│  │ Job 2: build-frontend                                 │ │
│  │  - GitHub Actions Runner (Ubuntu)                    │ │
│  │  - Node.js로 프론트엔드 빌드                          │ │
│  │  - 정적 파일 생성 (dist/)                             │ │
│  └───────────────────┬───────────────────────────────────┘ │
│                      │                                       │
│  ┌───────────────────▼───────────────────────────────────┐ │
│  │ Job 3: deploy                                         │ │
│  │  - 빌드된 파일들을 Droplet에 전송                      │ │
│  │  - 배포 스크립트 실행                                  │ │
│  └───────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Docker Hub   │ │ SSH/SCP     │ │ SSH/SCP     │
│ (이미지 저장) │ │ (파일 전송) │ │ (스크립트)  │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                 │
       │                └────────┬────────┘
       │                         │
       └──────────────┬──────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         DigitalOcean Droplet                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Nginx (웹 서버)                                       │ │
│  │  - /api/* → Backend 프록시                            │ │
│  │  - /shop, /customer, /admin → 정적 파일 서빙          │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Docker Compose                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │ │
│  │  │ Backend      │  │ PostgreSQL   │  │ Redis       │ │ │
│  │  │ (Docker Hub  │  │ (공식 이미지)│  │ (공식 이미지)│ │ │
│  │  │ 에서 pull)   │  │              │  │             │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Docker Hub를 사용하는 이유

### ✅ 현재 방식: Docker Hub 사용 (권장)

**장점:**
1. **빌드 부하 분산**: Droplet에서 빌드하지 않고 GitHub Actions에서 빌드
2. **빌드 캐싱**: Docker Hub의 레이어 캐싱 활용
3. **빠른 배포**: Droplet은 이미 빌드된 이미지만 pull하면 됨
4. **리소스 절약**: Droplet의 CPU/메모리를 서비스 운영에 집중
5. **버전 관리**: Docker Hub에 태그로 버전 관리 가능

**프로세스:**
```
GitHub Actions → Docker 이미지 빌드 → Docker Hub 푸시
                                              ↓
Droplet → docker-compose pull → 최신 이미지 다운로드 → 컨테이너 재시작
```

### ❌ 대안: Droplet에서 직접 빌드 (비권장)

**단점:**
1. **느린 배포**: 매번 소스 코드를 전송하고 빌드해야 함
2. **리소스 낭비**: Droplet의 CPU/메모리를 빌드에 사용
3. **의존성 설치**: 매번 npm install 등 시간 소요
4. **네트워크 부하**: 소스 코드 전체를 전송해야 함

## 🔄 상세 배포 프로세스

### 1단계: 코드 푸시
```bash
# 로컬에서
git push origin main
```

### 2단계: GitHub Actions 트리거
- `main` 브랜치에 푸시되면 자동으로 워크플로우 실행
- 또는 GitHub Actions에서 수동 실행 가능

### 3단계: 백엔드 빌드 (build-backend Job)

**위치**: GitHub Actions Runner (Ubuntu 가상 머신)

**작업 내용:**
```yaml
1. 코드 체크아웃
2. Docker Buildx 설정
3. Docker Hub 로그인
4. Docker 이미지 빌드
   - 컨텍스트: ./blynk_backend
   - Dockerfile 사용
   - 태그: your-username/blynk-backend:latest
5. Docker Hub에 푸시
```

**결과물**: Docker Hub에 `your-username/blynk-backend:latest` 이미지 업로드 완료

### 4단계: 프론트엔드 빌드 (build-frontend Job)

**위치**: GitHub Actions Runner (Ubuntu 가상 머신)

**작업 내용:**
```yaml
1. 코드 체크아웃
2. Node.js 20 설치
3. ShopOperator 빌드
   - npm ci (의존성 설치)
   - npm run build (Vite 빌드)
   - 결과: dist/ 폴더 생성
4. Customer 빌드 (동일)
5. Administrator 빌드 (동일)
6. 빌드된 파일들을 tar.gz로 압축
7. GitHub Artifacts에 업로드
```

**결과물**: `frontend-build.tar.gz` 파일 (GitHub Artifacts에 저장)

### 5단계: 배포 (deploy Job)

**위치**: GitHub Actions Runner → DigitalOcean Droplet

**작업 내용:**

#### 5-1. 파일 준비
```yaml
1. 프론트엔드 빌드 아티팩트 다운로드
2. deployment/nginx.conf 복사
3. deployment/deploy.sh 복사
4. 모든 파일을 deployment-package.tar.gz로 압축
```

#### 5-2. Droplet에 파일 전송 (SCP)
```yaml
전송되는 파일:
- frontend-build.tar.gz (프론트엔드 빌드 결과)
- deployment-package.tar.gz (Nginx 설정 + 배포 스크립트)

전송 위치: /tmp/blynk-deploy/
```

#### 5-3. Droplet에서 배포 스크립트 실행 (SSH)

**배포 스크립트(`deploy.sh`)가 수행하는 작업:**

```bash
1. 프론트엔드 백업 (기존 파일)
   → /opt/blynk-backups/frontend-YYYYMMDD-HHMMSS.tar.gz

2. 프론트엔드 배포
   → frontend-build.tar.gz 압축 해제
   → /var/www/blynk-platform/shop/
   → /var/www/blynk-platform/customer/
   → /var/www/blynk-platform/admin/
   → 권한 설정 (www-data:www-data)

3. 백엔드 배포
   → cd /opt/blynk-backend
   → docker-compose pull backend  # Docker Hub에서 최신 이미지 pull
   → docker-compose up -d --no-deps backend  # 컨테이너 재시작
   → Prisma 마이그레이션 실행

4. Nginx 설정 업데이트
   → nginx.conf 복사
   → nginx -t (설정 검증)
   → systemctl reload nginx

5. 헬스 체크
   → Backend: curl http://localhost:3000/health
   → Nginx: systemctl status nginx
```

## 🔑 GitHub Secrets의 역할

GitHub Secrets는 **민감한 정보를 안전하게 저장**하는 곳입니다.

### 왜 필요한가?

1. **보안**: 코드에 비밀번호를 직접 작성하면 안 됨
2. **유연성**: 환경별로 다른 설정 사용 가능
3. **관리 용이성**: 한 곳에서 모든 인증 정보 관리

### 각 Secret의 사용 위치

| Secret | 사용 위치 | 용도 |
|--------|----------|------|
| `DOCKER_USERNAME` | build-backend Job | Docker Hub 로그인 |
| `DOCKER_PASSWORD` | build-backend Job | Docker Hub 로그인 |
| `DROPLET_HOST` | deploy Job | SSH/SCP 연결 대상 |
| `DROPLET_USER` | deploy Job | SSH 사용자명 |
| `DROPLET_SSH_KEY` | deploy Job | SSH 인증 |
| `VITE_API_URL` | build-frontend Job | 프론트엔드 빌드 시 API URL 주입 |

## ❓ GitHub 레포지토리만 알려주면 CI/CD가 완료되나요?

### ❌ 아니요! 다음 작업들이 필요합니다:

#### 1. GitHub Secrets 설정 (필수)
- GitHub 저장소에 접근 권한 필요
- Docker Hub 계정 필요
- DigitalOcean Droplet 정보 필요
- SSH 키 생성 필요

#### 2. DigitalOcean Droplet 초기 설정 (필수)
- Droplet 생성
- Docker, Docker Compose, Nginx 설치
- 디렉토리 생성
- 백엔드 환경 변수 설정
- 초기 백엔드 서비스 시작

#### 3. 도메인 및 SSL 설정 (선택사항)
- DNS 설정
- SSL 인증서 발급

### ✅ GitHub 레포지토리만으로 가능한 것:

1. **CI/CD 워크플로우 파일**: 이미 프로젝트에 포함되어 있음
2. **배포 스크립트**: 이미 프로젝트에 포함되어 있음
3. **Nginx 설정**: 이미 프로젝트에 포함되어 있음

### ❌ GitHub 레포지토리만으로 불가능한 것:

1. **GitHub Secrets 설정**: 저장소 소유자/관리자 권한 필요
2. **Droplet 초기 설정**: 서버 접근 권한 필요
3. **환경 변수 설정**: 실제 값 입력 필요

## 📋 완전한 배포를 위한 체크리스트

### Phase 1: GitHub 설정 (5분)
- [ ] GitHub 저장소 확인
- [ ] GitHub Secrets 5개 설정
  - DOCKER_USERNAME
  - DOCKER_PASSWORD
  - DROPLET_HOST
  - DROPLET_USER
  - DROPLET_SSH_KEY
- [ ] (선택) VITE_API_URL 설정

### Phase 2: Docker Hub 설정 (5분)
- [ ] Docker Hub 계정 생성/확인
- [ ] Access Token 생성 (비밀번호 대신 사용 권장)

### Phase 3: DigitalOcean 설정 (15분)
- [ ] Droplet 생성
- [ ] SSH 키 추가
- [ ] 서버 초기 설정 (Docker, Nginx 등)
- [ ] 백엔드 디렉토리 생성 및 Git 클론
- [ ] 환경 변수 설정

### Phase 4: 첫 배포 (5분)
- [ ] 코드 푸시 또는 수동 실행
- [ ] GitHub Actions 로그 확인
- [ ] 배포 결과 확인

## 🔍 실제 배포 흐름 예시

### 시나리오: 코드 변경 후 배포

```bash
# 1. 로컬에서 코드 수정
vim src/index.ts
git add .
git commit -m "Fix bug"
git push origin main
```

```
2. GitHub Actions 자동 실행
   ↓
3. build-backend Job 시작
   - Docker 이미지 빌드 (3-5분)
   - Docker Hub에 푸시
   ↓
4. build-frontend Job 시작
   - 프론트엔드 빌드 (2-3분)
   - Artifacts에 저장
   ↓
5. deploy Job 시작
   - 파일 전송 (30초)
   - 배포 스크립트 실행 (1-2분)
     * 프론트엔드 배포
     * Docker Hub에서 이미지 pull (30초)
     * 컨테이너 재시작 (10초)
     * 마이그레이션 실행 (5초)
     * Nginx 리로드 (5초)
   ↓
6. 배포 완료! (총 소요 시간: 약 7-10분)
```

## 💡 핵심 포인트

1. **Docker Hub는 이미지 저장소**: 빌드된 이미지를 저장하고 배포
2. **GitHub Actions는 빌드 엔진**: 코드를 빌드하고 배포 자동화
3. **Droplet은 실행 환경**: 빌드된 결과물을 실행하는 서버
4. **GitHub Secrets는 인증 정보**: 보안을 위한 필수 설정
5. **배포 스크립트는 자동화 도구**: Droplet에서 실제 배포 작업 수행

## 🚀 빠른 시작 가이드

가장 빠르게 배포를 시작하려면:

1. **GitHub Secrets만 설정**하면 자동 배포 가능
2. **Droplet 초기 설정**은 한 번만 하면 됨
3. **이후에는 코드 푸시만** 하면 자동 배포됨

자세한 설정 방법은 `SETUP_CHECKLIST.md`를 참조하세요.
