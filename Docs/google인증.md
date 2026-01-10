# Google OAuth 인증 설정

## OAuth 클라이언트 생성

Google 인증 플랫폼의 클라이언트 탭에서 언제든지 클라이언트 ID에 액세스할 수 있습니다.

OAuth 액세스는 OAuth 동의 화면에 나열된 테스트 사용자로 제한됩니다.

## 클라이언트 정보

### 클라이언트 ID
```
YOUR_GOOGLE_CLIENT_ID_HERE
```

### 클라이언트 보안 비밀번호
```
YOUR_GOOGLE_CLIENT_SECRET_HERE
```

**주의**: 2025년 6월부터는 이 대화상자를 닫으면 더 이상 클라이언트 보안 비밀번호를 보거나 다운로드할 수 없습니다. 아래 정보를 복사하거나 다운로드하여 안전하게 보관해야 합니다.

## 설정 방법

1. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
2. 생성된 클라이언트 ID와 보안 비밀번호를 환경 변수에 설정:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALLBACK_URL` (예: `http://localhost:8080/api/auth/google/callback`)

## 환경 변수 설정

로컬 개발 환경에서는 `.env.local` 파일에 설정하세요:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback
```
