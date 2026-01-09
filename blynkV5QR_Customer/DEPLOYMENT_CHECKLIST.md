# 배포 준비 체크리스트

## 환경 변수 설정

### 필수 환경 변수

프로덕션 배포 전에 다음 환경 변수를 설정해야 합니다:

#### `VITE_API_URL`
- **설명**: 백엔드 API 서버의 URL
- **개발 환경**: `http://localhost:3000` (기본값)
- **프로덕션**: 실제 배포된 백엔드 서버 URL (예: `https://api.yourdomain.com`)
- **설정 방법**: 
  - `.env` 파일에 `VITE_API_URL=https://api.yourdomain.com` 추가
  - 또는 빌드 시 환경 변수로 설정: `VITE_API_URL=https://api.yourdomain.com npm run build`

### 환경 변수 설정 예시

#### `.env` 파일 (로컬 개발)
```env
VITE_API_URL=http://localhost:3000
```

#### `.env.production` 파일 (프로덕션)
```env
VITE_API_URL=https://api.yourdomain.com
```

## 배포 전 체크리스트

### 1. API 연동 확인
- [x] 메뉴 API (`/api/customer/menu/:restaurantId`) - 완료
- [x] 세션 API (`/api/customer/session`) - 완료
- [x] 주문 API (`/api/customer/orders`) - 완료
- [x] 채팅 API (`/api/customer/chat`) - 완료
- [x] 빌 API (`/api/customer/bill/:sessionId`) - 완료

### 2. Mock 데이터 제거
- [x] `mockData.ts` 파일 삭제 완료
- [x] 모든 하드코딩된 mock 데이터 제거 완료
- [x] QuickChips는 백엔드 API 없음 (하드코딩 유지, TODO 주석 추가)

### 3. 에러 처리
- [x] API 에러 처리 구현 완료
- [x] 네트워크 에러와 데이터 에러 구분 완료
- [x] 사용자 친화적인 에러 메시지 표시 완료

### 4. UI 상태 처리
- [x] 로딩 상태 UI 구현 완료 (`MenuModal`에 로딩 인디케이터 추가)
- [x] 빈 상태 UI 구현 완료 (메뉴가 없을 때 메시지 표시)
- [x] 장바구니 빈 상태 UI 기존 구현 확인

### 5. 빌드 및 배포
- [ ] 환경 변수 설정 확인
- [ ] 프로덕션 빌드 테스트 (`npm run build`)
- [ ] 빌드된 파일 확인
- [ ] CORS 설정 확인 (백엔드에서 프론트엔드 도메인 허용)
- [ ] HTTPS 설정 확인 (프로덕션 환경)

## 알려진 제한사항

### QuickChips
- 현재 QuickChips는 하드코딩되어 있음
- 백엔드에 QuickChips 모델/API가 없어 임시로 하드코딩 유지
- 향후 백엔드 API 연동 필요 (TODO 주석 추가됨)

## 배포 후 확인사항

1. **API 연결 확인**
   - 브라우저 개발자 도구에서 네트워크 탭 확인
   - API 요청이 올바른 URL로 전송되는지 확인
   - CORS 에러가 없는지 확인

2. **기능 테스트**
   - 메뉴 로드 테스트
   - 주문 생성 테스트
   - 채팅 기능 테스트
   - 세션 생성/조회 테스트

3. **에러 모니터링**
   - 콘솔 에러 확인
   - 네트워크 에러 확인
   - 사용자 피드백 수집

## 문제 해결

### API 연결 실패
- `VITE_API_URL` 환경 변수 확인
- 백엔드 서버가 실행 중인지 확인
- CORS 설정 확인

### 빌드 실패
- Node.js 버전 확인 (권장: 18.x 이상)
- 의존성 설치 확인 (`npm install`)
- 환경 변수 설정 확인
