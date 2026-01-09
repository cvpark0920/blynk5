# 인증 시스템 테스트 준비 상태 체크리스트

## ✅ 완료된 항목

### 백엔드 인프라
- [x] PostgreSQL 데이터베이스 컨테이너 실행 중 (포트 5433)
- [x] Redis 컨테이너 실행 중
- [x] 백엔드 서버 실행 중 (포트 3000)
- [x] Health check 엔드포인트 정상 작동 (`/health`)

### 데이터베이스
- [x] 스키마 마이그레이션 완료 (`posPinHash` 필드 추가)
- [x] 시드 데이터 생성 완료
- [x] 슈퍼 관리자 계정 생성 (`cvpark0920@gmail.com`)

### 백엔드 API 구현
- [x] Google OAuth 인증 엔드포인트 (`/api/auth/google`)
- [x] Google OAuth 콜백 엔드포인트 (`/api/auth/google/callback`)
- [x] PIN 로그인 엔드포인트 (`/api/auth/pin`)
- [x] 사용자 정보 조회 엔드포인트 (`/api/auth/me`)
- [x] 토큰 갱신 엔드포인트 (`/api/auth/refresh`)
- [x] 로그아웃 엔드포인트 (`/api/auth/logout`)
- [x] 직원 목록 조회 API (`/api/staff/restaurant/:restaurantId/staff-list`)
- [x] 직원 PIN 등록 API (`/api/staff/restaurant/:restaurantId/staff/:staffId/pin`)
- [x] 포스 PIN 등록 API (`/api/staff/restaurant/:restaurantId/pos-pin`)

### 프론트엔드 구현
- [x] Administrator App API 클라이언트 구현
- [x] Administrator App Google OAuth 플로우 구현
- [x] ShopOperator App API 클라이언트 구현
- [x] ShopOperator App Google OAuth 플로우 구현
- [x] ShopOperator App PIN 로그인 UI 구현
- [x] ShopOperator App PIN 관리 UI 구현

## ⚠️ 확인 필요 항목

### 환경 변수 설정

#### 백엔드 (`.env` 또는 `.env.development`)
다음 환경 변수들이 설정되어 있는지 확인:
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FRONTEND_ADMIN_URL=http://localhost:5173
FRONTEND_SHOP_URL=http://localhost:5174
DATABASE_URL=postgresql://blynk:blynk@localhost:5433/blynk_db
JWT_SECRET=your-secret-key-change-in-production
```

#### 프론트엔드
각 앱의 루트 디렉토리에 `.env` 파일 생성 필요:

**blynkV5QR_Administrator/.env**
```
VITE_API_URL=http://localhost:3000
```

**blynkV5QR_ShopOperator/.env**
```
VITE_API_URL=http://localhost:3000
```

### Google OAuth 설정

1. **Google Cloud Console 설정**
   - Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성 필요
   - 승인된 리디렉션 URI에 추가:
     - `http://localhost:3000/api/auth/google/callback`
   - 승인된 JavaScript 원본에 추가:
     - `http://localhost:5173` (Administrator App)
     - `http://localhost:5174` (ShopOperator App)

2. **테스트 계정**
   - 슈퍼 관리자: `cvpark0920@gmail.com` (시드 데이터에 포함)
   - 상점 대표: 시드 데이터의 `owner@restaurant.com` 사용 가능

## 📋 테스트 시나리오

### 1. Administrator App 테스트

#### 1.1 Google OAuth 로그인
```bash
# 1. 브라우저에서 http://localhost:5173 접속
# 2. "Sign in with Google" 버튼 클릭
# 3. Google 계정 선택 (cvpark0920@gmail.com)
# 4. 콜백 페이지에서 토큰 저장 확인
# 5. 대시보드 접근 확인
```

#### 1.2 권한 체크
- [ ] PLATFORM_ADMIN 역할로 로그인 시 모든 기능 접근 가능
- [ ] ADMIN 역할로 로그인 시 제한된 기능만 접근 가능
- [ ] CUSTOMER 역할로 로그인 시 접근 거부

### 2. ShopOperator App 테스트

#### 2.1 대표자 Google OAuth 로그인
```bash
# 1. 브라우저에서 http://localhost:5174 접속
# 2. "Admin Login" 또는 "Google Login" 버튼 클릭
# 3. 상점 대표 Google 계정으로 로그인
# 4. 콜백 페이지에서 토큰 저장 확인
# 5. 메인 화면 접근 확인
```

#### 2.2 직원 PIN 로그인
```bash
# 1. 로그인 화면에서 "POS Login (PIN)" 선택
# 2. 직원 목록에서 직원 선택
# 3. PIN 번호 입력 (시드 데이터: 0000 또는 1234)
# 4. 로그인 성공 확인
```

#### 2.3 PIN 관리 기능
```bash
# 1. OWNER 또는 MANAGER로 로그인
# 2. Settings > PINs 탭 접근
# 3. 직원 PIN 설정 테스트
# 4. POS PIN 설정 테스트
```

### 3. API 직접 테스트

#### 3.1 PIN 로그인 API 테스트
```bash
# 시드 데이터의 직원 ID 확인 필요
STAFF_ID="직원_ID"
PIN_CODE="0000"

curl -X POST http://localhost:3000/api/auth/pin \
  -H "Content-Type: application/json" \
  -d "{\"staffId\": \"$STAFF_ID\", \"pinCode\": \"$PIN_CODE\"}"
```

#### 3.2 직원 목록 조회 API 테스트
```bash
# OWNER 또는 MANAGER 토큰 필요
TOKEN="Bearer YOUR_ACCESS_TOKEN"
RESTAURANT_ID="시드_데이터의_레스토랑_ID"

curl -X GET "http://localhost:3000/api/staff/restaurant/$RESTAURANT_ID/staff-list" \
  -H "Authorization: $TOKEN"
```

#### 3.3 PIN 등록 API 테스트
```bash
# OWNER 또는 MANAGER 토큰 필요
TOKEN="Bearer YOUR_ACCESS_TOKEN"
RESTAURANT_ID="시드_데이터의_레스토랑_ID"
STAFF_ID="직원_ID"
PIN_CODE="1234"

curl -X POST "http://localhost:3000/api/staff/restaurant/$RESTAURANT_ID/staff/$STAFF_ID/pin" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"pinCode\": \"$PIN_CODE\"}"
```

## 🔧 테스트 전 준비 사항

1. **백엔드 서버 실행**
   ```bash
   cd blynk_backend
   npm run dev
   ```

2. **Administrator App 실행**
   ```bash
   cd blynkV5QR_Administrator
   npm install  # 필요시
   npm run dev
   ```

3. **ShopOperator App 실행**
   ```bash
   cd blynkV5QR_ShopOperator
   npm install  # 필요시
   npm run dev
   ```

4. **데이터베이스 확인**
   ```bash
   cd blynk_backend
   # 시드 데이터 확인
   npx prisma studio
   ```

## 🐛 알려진 이슈 및 주의사항

1. **Google OAuth 미설정 시**
   - Google OAuth 클라이언트 ID/Secret이 없으면 OAuth 로그인 불가
   - 에러 메시지: "Google OAuth is not configured" (503)

2. **restaurantId 필요**
   - ShopOperator App에서 직원 목록 조회 시 `restaurantId` 필요
   - 현재 AuthContext에서 `restaurantId`를 설정하는 로직 필요

3. **CORS 설정**
   - 백엔드의 CORS 설정에 프론트엔드 URL이 포함되어 있는지 확인

4. **토큰 저장**
   - 현재 localStorage에 토큰 저장
   - 프로덕션에서는 httpOnly cookie 사용 고려

## 📝 다음 단계

1. 환경 변수 파일 생성 및 설정
2. Google OAuth 클라이언트 ID/Secret 설정
3. 프론트엔드 앱 실행 및 테스트
4. API 엔드포인트 직접 테스트
5. 통합 테스트 시나리오 실행
