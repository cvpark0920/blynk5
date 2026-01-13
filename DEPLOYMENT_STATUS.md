# GitHub CI/CD → DigitalOcean Droplet 배포 상태 점검 보고서

**점검 일시**: 2026-01-12  
**점검 항목**: GitHub Actions 워크플로우, Docker 설정, 배포 스크립트

---

## ✅ 정상 동작 중인 항목

1. **GitHub Actions 워크플로우 기본 구조**
   - ✅ 트리거 설정 (main/master 브랜치 push, workflow_dispatch)
   - ✅ Docker Hub 로그인 설정
   - ✅ SSH 배포 스크립트 기본 구조

2. **Docker 설정**
   - ✅ Dockerfile 멀티 스테이지 빌드 구조
   - ✅ docker-compose.prod.yml 서비스 정의
   - ✅ Health check 설정
   - ✅ Prisma OpenSSL 호환성 해결됨

3. **환경 변수 예시 파일**
   - ✅ `.env.example` 파일 존재

---

## ❌ 발견된 문제점

### 🔴 Critical Issues (즉시 수정 필요)

#### 1. **프론트엔드 빌드 누락**
**문제**: CI/CD 파이프라인에 프론트엔드 빌드 단계가 없습니다.
- Dockerfile은 루트의 `dist` 폴더를 필요로 하지만, 빌드하지 않으면 이미지에 포함되지 않습니다.
- 현재 워크플로우는 백엔드만 빌드하고 있습니다.

**영향**: 배포된 이미지에 프론트엔드 파일이 없어 웹 앱이 동작하지 않습니다.

**해결 방법**: GitHub Actions에 프론트엔드 빌드 단계 추가 필요

---

#### 2. **빌드 컨텍스트 불일치**
**문제**: 
- GitHub Actions: `context: ./blynk_backend` (blynk_backend 디렉토리만)
- Dockerfile 요구사항: 루트의 `dist` 폴더 필요
- docker-compose.prod.yml: `context: ..` (루트 디렉토리)

**영향**: GitHub Actions에서 빌드한 이미지가 불완전하거나 실패할 수 있습니다.

**해결 방법**: GitHub Actions의 빌드 컨텍스트를 루트(`.`)로 변경

---

#### 3. **Docker 이미지 사용 전략 불일치**
**문제**:
- GitHub Actions: Docker Hub에 이미지를 push (`${{ secrets.DOCKER_USERNAME }}/blynk-backend:latest`)
- docker-compose.prod.yml: 로컬 빌드 시도 (`build: context: ..`)
- 배포 스크립트: `docker-compose pull` 후 `--build` 플래그 사용 (충돌)

**영향**: Docker Hub에서 pull한 이미지를 사용하지 않고 로컬 빌드를 시도합니다.

**해결 방법**: 
- 옵션 A: docker-compose.prod.yml에서 이미지 사용 (`image:` 지정)
- 옵션 B: GitHub Actions에서 빌드한 이미지를 사용하도록 배포 스크립트 수정

---

#### 4. **Prisma 마이그레이션 명령어 오류**
**문제**: 
- 현재: `npm run prisma:migrate` → `prisma migrate dev` (개발용)
- 필요: `prisma migrate deploy` (프로덕션용)

**영향**: 프로덕션 환경에서 마이그레이션이 제대로 실행되지 않을 수 있습니다.

**해결 방법**: `prisma migrate deploy` 명령어 직접 사용 또는 스크립트 추가

---

### 🟡 Medium Issues (수정 권장)

#### 5. **환경 변수 누락**
**문제**: docker-compose.prod.yml에 다음 환경 변수가 없습니다:
- `FRONTEND_BASE_URL`
- `VIETQR_CLIENT_ID`
- `VIETQR_API_KEY`
- `JWT_ACCESS_EXPIRY`
- `JWT_REFRESH_EXPIRY`
- `UPLOAD_MAX_SIZE`
- `UPLOAD_ALLOWED_TYPES`

**영향**: 일부 기능이 동작하지 않을 수 있습니다.

**해결 방법**: docker-compose.prod.yml에 환경 변수 추가

---

#### 6. **프로덕션 환경 변수 파일 관리**
**문제**: Droplet 서버에 `.env.production` 파일이 수동으로 관리되어야 합니다.

**영향**: 환경 변수 변경 시 서버에 직접 접속하여 수정해야 합니다.

**해결 방법**: 
- GitHub Secrets에 환경 변수 저장
- 배포 스크립트에서 `.env` 파일 생성

---

#### 7. **Node.js 버전 명시 없음**
**문제**: GitHub Actions에서 Node.js 버전이 명시되지 않았습니다 (프론트엔드 빌드 시 필요).

**영향**: Node.js 버전 불일치로 빌드 실패 가능

**해결 방법**: Node.js 설정 단계 추가

---

### 🟢 Minor Issues (개선 권장)

#### 8. **배포 스크립트 최적화**
**문제**: 
- `docker-compose pull` 후 `--build` 플래그 사용 (불필요한 빌드)
- `docker system prune -f`가 모든 이미지를 삭제할 수 있음

**해결 방법**: 스크립트 최적화

---

#### 9. **롤백 전략 부재**
**문제**: 배포 실패 시 롤백 메커니즘이 없습니다.

**해결 방법**: 이전 이미지 태그 유지 및 롤백 스크립트 추가

---

## 📋 수정 체크리스트

### 즉시 수정 필요
- [ ] GitHub Actions에 프론트엔드 빌드 단계 추가
- [ ] 빌드 컨텍스트를 루트(`.`)로 변경
- [ ] docker-compose.prod.yml에서 이미지 사용 방식 통일
- [ ] Prisma 마이그레이션 명령어를 `prisma migrate deploy`로 수정
- [ ] docker-compose.prod.yml에 누락된 환경 변수 추가

### 수정 권장
- [ ] Node.js 버전 명시
- [ ] 환경 변수를 GitHub Secrets로 관리
- [ ] 배포 스크립트 최적화
- [ ] 롤백 전략 추가

---

## 🔧 수정 예시

### 1. GitHub Actions 워크플로우 수정 예시

```yaml
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install frontend dependencies
        run: npm ci
        working-directory: .

      - name: Build frontend
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_FRONTEND_BASE_URL: ${{ secrets.VITE_FRONTEND_BASE_URL }}
        run: npm run build
        working-directory: .

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .  # 루트 디렉토리로 변경
          file: ./blynk_backend/Dockerfile
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/blynk-backend:latest
          cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/blynk-backend:latest

      - name: Deploy to DigitalOcean Droplet
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DROPLET_HOST }}
          username: ${{ secrets.DROPLET_USER }}
          key: ${{ secrets.DROPLET_SSH_KEY }}
          script: |
            cd /opt/blynk-backend
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
            docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy || true
            docker system prune -f
```

### 2. docker-compose.prod.yml 수정 예시

```yaml
services:
  backend:
    image: ${{ secrets.DOCKER_USERNAME }}/blynk-backend:latest  # 이미지 사용
    # build 섹션 제거 또는 주석 처리
    container_name: blynk_backend_prod
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://blynk:blynk@postgres:5432/blynk_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_ACCESS_EXPIRY: ${JWT_ACCESS_EXPIRY:-15m}
      JWT_REFRESH_EXPIRY: ${JWT_REFRESH_EXPIRY:-7d}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GOOGLE_CALLBACK_URL: ${GOOGLE_CALLBACK_URL}
      FRONTEND_BASE_URL: ${FRONTEND_BASE_URL}
      CORS_ORIGIN: ${CORS_ORIGIN}
      VIETQR_CLIENT_ID: ${VIETQR_CLIENT_ID:-}
      VIETQR_API_KEY: ${VIETQR_API_KEY:-}
      UPLOAD_MAX_SIZE: ${UPLOAD_MAX_SIZE:-5242880}
      UPLOAD_ALLOWED_TYPES: ${UPLOAD_ALLOWED_TYPES:-image/jpeg,image/png,image/webp}
```

---

## 📝 필요한 GitHub Secrets

다음 Secrets이 GitHub 저장소에 설정되어 있어야 합니다:

- `DOCKER_USERNAME`: Docker Hub 사용자명
- `DOCKER_PASSWORD`: Docker Hub 비밀번호
- `DROPLET_HOST`: DigitalOcean Droplet IP 주소
- `DROPLET_USER`: SSH 사용자명 (보통 `root` 또는 `blynk`)
- `DROPLET_SSH_KEY`: SSH 개인 키
- `VITE_API_URL`: 프론트엔드 빌드용 API URL (예: `https://api.yourdomain.com/api`)
- `VITE_FRONTEND_BASE_URL`: 프론트엔드 빌드용 Base URL (예: `https://yourdomain.com`)

---

## 🚀 다음 단계

1. **즉시 수정**: Critical Issues 해결
2. **테스트**: 로컬에서 수정된 워크플로우 시뮬레이션
3. **검증**: GitHub Actions에서 테스트 실행
4. **배포**: 수정 사항 적용 후 배포 테스트

---

## 📚 참고 문서

- `blynk_backend/DEPLOYMENT.md`: 배포 가이드
- `blynk_backend/docker-compose.prod.yml`: 프로덕션 Docker Compose 설정
- `.github/workflows/deploy.yml`: GitHub Actions 워크플로우
