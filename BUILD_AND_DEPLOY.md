# 빌드 및 배포 가이드

## 📋 현재 상태

### ✅ 완료된 작업
1. **통합 빌드 테스트**: 성공
2. **로컬 백엔드 + 도커 DB 테스트**: 성공
3. **앱 정상 동작 확인**: 모든 경로 정상 작동

## 🚀 빌드 및 배포 절차

### 1. 통합 프론트엔드 빌드

```bash
# 프로젝트 루트에서 실행
cd /Users/ilsoonim/Dev/BlynkV5QR/Apps

# 환경 변수 설정
export VITE_API_URL=http://localhost:3000/api
export VITE_FRONTEND_BASE_URL=http://localhost:3000

# 빌드 실행
npm run build

# 빌드 결과 확인
ls -la dist/
```

**환경 변수 설명**:
- `VITE_API_URL`: 백엔드 API URL (예: `http://localhost:3000/api` 또는 `https://api.yourdomain.com/api`)
- `VITE_FRONTEND_BASE_URL`: 프론트엔드 기본 URL (예: `http://localhost:3000` 또는 `https://yourdomain.com`)
  - 통합 빌드 환경에서는 백엔드가 프론트엔드를 서빙하므로 백엔드 URL과 동일하게 설정
  - Admin 앱의 Shop 앱 바로 가기 링크와 테이블 QR URL 생성에 사용됨

**예상 결과**:
- `dist/index.html`
- `dist/assets/` 폴더 (CSS, JS 파일)

### 2. 로컬 테스트 (도커 DB 사용)

#### 2.1 도커 DB 실행
```bash
cd blynk_backend
docker-compose -f docker-compose.dev.yml up -d
```

#### 2.2 데이터베이스 마이그레이션
```bash
npm run prisma:generate
npm run prisma:migrate
```

#### 2.3 프론트엔드 빌드 결과 복사
```bash
# 프로젝트 루트에서
cp -r dist blynk_backend/public
```

#### 2.4 백엔드 실행
```bash
cd blynk_backend
npm run dev
```

#### 2.5 테스트
```bash
# 헬스체크
curl http://localhost:3000/health

# 프론트엔드 확인
curl http://localhost:3000/
curl http://localhost:3000/admin
curl http://localhost:3000/shop
curl http://localhost:3000/customer

# API 확인
curl http://localhost:3000/api/public/quick-chips
```

### 3. 도커라이징 (프로덕션)

#### 3.1 환경 변수 설정

프로덕션 환경 변수 파일 생성:
```bash
cd blynk_backend
cp .env.example .env.production
```

`.env.production` 파일 수정:
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
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback

FRONTEND_BASE_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com

VIETQR_CLIENT_ID=your-vietqr-client-id
VIETQR_API_KEY=your-vietqr-api-key
```

#### 3.2 프론트엔드 빌드 (프로덕션)

```bash
# 프로젝트 루트에서
export VITE_API_URL=https://your-domain.com/api
export VITE_FRONTEND_BASE_URL=https://your-domain.com
npm run build
```

**중요**: `VITE_FRONTEND_BASE_URL`은 백엔드가 프론트엔드를 서빙하는 도메인과 동일하게 설정해야 합니다.

#### 3.3 도커 빌드

```bash
cd blynk_backend

# 빌드 컨텍스트는 프로젝트 루트 (..)
# Dockerfile은 blynk_backend/Dockerfile
docker-compose -f docker-compose.prod.yml build
```

또는 직접 빌드:
```bash
# 프로젝트 루트에서
docker build -f blynk_backend/Dockerfile -t blynk-backend:latest .
```

#### 3.4 도커 실행

```bash
cd blynk_backend

# 환경 변수 파일 로드
export $(cat .env.production | xargs)

# 실행
docker-compose -f docker-compose.prod.yml up -d

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f backend

# 상태 확인
docker-compose -f docker-compose.prod.yml ps
```

#### 3.5 데이터베이스 마이그레이션 (프로덕션)

```bash
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:migrate deploy
```

## 📝 빌드 체크리스트

### 통합 빌드
- [x] 루트 `package.json` 빌드 스크립트 확인
- [x] `vite.config.ts` 설정 확인
- [x] 빌드 실행 성공
- [x] `dist` 폴더 생성 확인
- [x] 환경 변수 설정 (`VITE_API_URL`, `VITE_FRONTEND_BASE_URL`)

### 로컬 테스트
- [x] 도커 DB 실행 (PostgreSQL, Redis)
- [x] 데이터베이스 마이그레이션
- [x] 프론트엔드 빌드 결과 복사
- [x] 백엔드 실행
- [x] 헬스체크 확인
- [x] 프론트엔드 경로 확인 (`/`, `/admin`, `/shop`, `/customer`)
- [x] API 엔드포인트 확인

### 도커라이징
- [ ] 프로덕션 환경 변수 설정
- [ ] 프론트엔드 프로덕션 빌드 (`VITE_API_URL`, `VITE_FRONTEND_BASE_URL` 설정)
- [ ] 도커 이미지 빌드
- [ ] 도커 컨테이너 실행
- [ ] 프로덕션 마이그레이션 실행
- [ ] 프로덕션 환경 테스트

## 환경 변수 가이드

### 프론트엔드 빌드 시 필요한 환경 변수

#### 필수 환경 변수
- `VITE_API_URL`: 백엔드 API URL
  - 로컬: `http://localhost:3000/api`
  - 프로덕션: `https://your-domain.com/api`

- `VITE_FRONTEND_BASE_URL`: 프론트엔드 기본 URL
  - 로컬: `http://localhost:3000` (통합 빌드 환경)
  - 프로덕션: `https://your-domain.com`
  - **용도**: Admin 앱에서 Shop 앱 바로 가기 링크와 테이블 QR URL 생성에 사용

#### 환경 변수 설정 방법

**방법 1: 빌드 시 직접 설정**
```bash
VITE_API_URL=https://api.yourdomain.com/api \
VITE_FRONTEND_BASE_URL=https://yourdomain.com \
npm run build
```

**방법 2: .env 파일 사용**
프로젝트 루트에 `.env.production` 파일 생성:
```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_FRONTEND_BASE_URL=https://yourdomain.com
```

그리고 빌드:
```bash
npm run build
```

**주의사항**:
- Vite 환경 변수는 `VITE_` 접두사가 필요합니다
- 환경 변수는 빌드 시점에 주입되므로, 빌드 후 변경하려면 재빌드가 필요합니다
- `VITE_FRONTEND_BASE_URL`은 백엔드의 `FRONTEND_BASE_URL`과 동일한 값을 사용하는 것을 권장합니다

## 🔍 문제 해결

### 빌드 실패 시
1. `node_modules` 삭제 후 재설치
2. `dist` 폴더 삭제 후 재빌드
3. 환경 변수 확인

### 도커 빌드 실패 시
1. 빌드 컨텍스트 확인 (프로젝트 루트)
2. `dist` 폴더 존재 확인
3. `.dockerignore` 확인

### 백엔드 실행 실패 시
1. 데이터베이스 연결 확인
2. 환경 변수 확인
3. 포트 충돌 확인

## 📊 현재 테스트 결과

자세한 테스트 결과는 `TEST_RESULTS.md` 참조

### 성공한 테스트
- ✅ 통합 빌드
- ✅ 헬스체크 엔드포인트
- ✅ 프론트엔드 정적 파일 서빙
- ✅ Admin 앱 경로 (`/admin`)
- ✅ Shop 앱 경로 (`/shop`)
- ✅ Customer 앱 경로 (`/customer`)
- ✅ API 엔드포인트 (`/api/public/quick-chips`)
