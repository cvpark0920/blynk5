# 빌드 및 도커라이징 상태 점검 보고서

## 📋 아키텍처 이해

### 현재 구조
- **통합 프론트엔드 앱**: 루트 레벨에서 `src/App.tsx`가 `/admin/*`, `/shop/*`, `/customer/*` 경로로 라우팅하는 단일 SPA
- **빌드 방식**: 루트에서 `vite build` 실행 → `dist` 폴더 생성
- **백엔드 서빙**: 백엔드가 `public` 폴더(`dist` 복사본)에서 정적 파일 서빙
- **라우팅**: React Router가 클라이언트 사이드에서 경로 처리

## 📋 전체 상태 요약

### ✅ 준비 완료 항목

1. **루트 프론트엔드 (통합 앱)**
   - ✅ `src/App.tsx` 통합 라우팅 설정 완료
   - ✅ `vite.config.ts` 존재
   - ✅ `package.json` 빌드 스크립트 존재 (`npm run build`)
   - ✅ `index.html` 존재

2. **백엔드 (blynk_backend)**
   - ✅ Dockerfile 존재
   - ✅ docker-compose.prod.yml 존재
   - ✅ docker-compose.dev.yml 존재
   - ✅ package.json 빌드 스크립트 존재
   - ✅ .env.example 파일 존재
   - ✅ Prisma 설정 완료
   - ✅ 정적 파일 서빙 설정 완료 (`express.static(publicPath)`)
   - ✅ SPA Fallback 설정 완료 (모든 비-API 경로에 `index.html` 서빙)

3. **개별 앱 디렉토리들**
   - ⚠️ 각 앱의 Dockerfile은 **통합 빌드 방식에서는 불필요**할 수 있음
   - ⚠️ 각 앱의 nginx.conf도 통합 빌드에서는 사용되지 않음

### ⚠️ 확인 필요 사항

#### 1. 루트 vite.config.ts의 base path 설정
- **현재 상태**: base path 설정 없음
- **확인 필요**: 
  - 프로덕션에서 백엔드가 루트(`/`)에서 서빙하는지, 아니면 서브 경로에서 서빙하는지
  - 현재 백엔드는 루트에서 서빙하므로 `base: '/'` 또는 설정 없음이 맞을 수 있음

#### 2. 백엔드 Dockerfile의 빌드 컨텍스트
- **blynk_backend/Dockerfile** (38-40번 줄):
  ```dockerfile
  # Copy frontend build files (built from root directory)
  # Frontend dist folder should be built before Docker build
  COPY dist ./public
  ```
  - ⚠️ 빌드 컨텍스트가 프로젝트 루트인지 확인 필요
  - ⚠️ 프론트엔드가 먼저 빌드되어야 함

#### 3. 환경 변수 설정
- **프론트엔드**: VITE_API_URL 환경 변수 필요 (빌드 시점에 주입)
- **백엔드**: .env 파일 확인 필요

#### 4. 빌드 스크립트
- **현재**: 루트 `package.json`에 `"build": "vite build"`만 존재
- **확인 필요**: 
  - 각 앱을 개별 빌드하는 스크립트가 필요한지, 아니면 통합 빌드만 필요한지
  - 통합 빌드만 사용한다면 각 앱의 `package.json` 빌드 스크립트는 개발용일 수 있음

## 🔧 빌드 프로세스 확인

### 예상 빌드 순서 (통합 방식)

1. **프론트엔드 빌드** (프로젝트 루트에서):
   ```bash
   # 환경 변수 설정
   export VITE_API_URL=https://api.yourdomain.com
   
   # 빌드 실행
   npm run build
   # → dist/ 폴더 생성
   ```

2. **백엔드 Docker 빌드**:
   ```bash
   cd blynk_backend
   docker build -f Dockerfile --build-context .. .
   # → dist 폴더가 public으로 복사됨
   ```

### 백엔드 Dockerfile 빌드 컨텍스트 확인 필요

현재 Dockerfile이 프로젝트 루트를 컨텍스트로 사용하는지 확인:
- `COPY dist ./public` → 루트의 `dist` 폴더를 복사
- 빌드 시 `docker build -f blynk_backend/Dockerfile ..` 형태로 실행해야 함

## 📊 빌드 가능 여부

### 현재 상태: ✅ **대부분 준비 완료**

1. **통합 프론트엔드**: ✅ 빌드 가능
   - 루트 `vite.config.ts` 설정 확인됨
   - `package.json` 빌드 스크립트 존재
   - 통합 라우팅 설정 완료

2. **백엔드**: ✅ 빌드 가능
   - Dockerfile 존재
   - 정적 파일 서빙 설정 완료
   - 프론트엔드 빌드 선행 필요

3. **개별 앱 Dockerfile들**: ⚠️ 통합 빌드 방식에서는 불필요할 수 있음
   - 각 앱의 Dockerfile은 독립 배포용일 수 있음
   - 통합 배포에서는 사용되지 않을 수 있음

## 🚀 권장 빌드 절차

### 로컬 빌드 테스트

1. **프론트엔드 빌드**:
   ```bash
   # 프로젝트 루트에서
   VITE_API_URL=http://localhost:3000/api npm run build
   ```

2. **빌드 결과 확인**:
   ```bash
   ls -la dist/
   # index.html과 assets 폴더가 생성되어야 함
   ```

3. **백엔드 빌드** (Docker):
   ```bash
   cd blynk_backend
   docker build -f Dockerfile -t blynk-backend:latest ..
   ```

### 프로덕션 배포

1. 프론트엔드 빌드 (VITE_API_URL 설정)
2. 백엔드 Docker 빌드 (프로젝트 루트를 컨텍스트로)
3. docker-compose로 배포

## 📝 확인 필요 사항

- [x] 통합 앱 구조 확인 완료
- [ ] 루트 vite.config.ts의 base path 설정 확인
- [ ] 백엔드 Dockerfile 빌드 컨텍스트 확인
- [ ] 환경 변수 파일(.env) 실제 존재 여부 확인
- [ ] 빌드 스크립트 테스트
- [ ] CI/CD 파이프라인에서 빌드 순서 확인
