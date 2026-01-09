# Blynk Backend API Server

Blynk 플랫폼의 백엔드 API 서버입니다.

## 기술 스택

- Node.js 20+
- TypeScript
- Express.js
- PostgreSQL (Prisma ORM)
- Redis
- Server-Sent Events (SSE)
- OAuth 2.0 (Google) + JWT

## 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.development` 파일을 복사하여 환경 변수를 설정하세요.

```bash
cp .env.example .env.development
```

### 3. 데이터베이스 실행 (Docker)

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Prisma 마이그레이션

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. 개발 서버 실행

```bash
npm run dev
```

서버는 `http://localhost:3000`에서 실행됩니다.

## 프로젝트 구조

```
backend/
├── src/
│   ├── config/          # 설정 파일
│   ├── controllers/     # 컨트롤러
│   ├── services/        # 비즈니스 로직
│   ├── models/          # 데이터 모델
│   ├── routes/          # 라우트 정의
│   ├── middleware/      # 미들웨어
│   ├── utils/           # 유틸리티
│   ├── sse/             # SSE 핸들러
│   └── index.ts         # Express 앱 진입점
├── prisma/              # Prisma 스키마
├── tests/               # 테스트 파일
└── docker/              # Docker 관련 파일
```

## 주요 스크립트

- `npm run dev` - 개발 서버 실행 (hot reload)
- `npm run build` - TypeScript 컴파일
- `npm run start` - 프로덕션 서버 실행
- `npm run prisma:generate` - Prisma 클라이언트 생성
- `npm run prisma:migrate` - 데이터베이스 마이그레이션
- `npm run prisma:studio` - Prisma Studio 실행
- `npm test` - 테스트 실행
- `npm run lint` - 코드 린팅

## 개발 워크플로우

### 1. 데이터베이스 시작
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Prisma 마이그레이션
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 3. 개발 서버 실행
```bash
npm run dev
```

서버는 `http://localhost:3000`에서 실행됩니다.

## 프로덕션 배포

자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참조하세요.

## API 클라이언트 예시

프론트엔드 연동 예시는 [API_CLIENT_EXAMPLE.md](./API_CLIENT_EXAMPLE.md)를 참조하세요.

## API 엔드포인트

### 인증
- `GET /api/auth/google` - Google OAuth 인증 시작
- `GET /api/auth/google/callback` - Google OAuth 콜백
- `POST /api/auth/logout` - 로그아웃
- `POST /api/auth/refresh` - 토큰 갱신
- `GET /api/auth/me` - 현재 사용자 정보
- `POST /api/auth/pin` - PIN 코드 로그인 (직원용)

### 고객 API
- `GET /api/customer/restaurant/:qrCode` - QR 코드로 식당 정보 조회
- `GET /api/customer/menu/:restaurantId` - 메뉴 조회
- `POST /api/customer/session` - 세션 시작
- `POST /api/customer/orders` - 주문 생성
- `GET /api/sse/session/:sessionId` - SSE 연결 (고객용)

### 식당 운영자 API
- `GET /api/staff/tables` - 테이블 목록
- `GET /api/staff/orders` - 주문 목록
- `GET /api/sse/restaurant/:restaurantId/staff` - SSE 연결 (직원용)

## 라이선스

ISC
