# Google OAuth 콜백 URL 업데이트 가이드

## 업데이트할 콜백 URL

Google Cloud Console에서 OAuth 2.0 클라이언트의 Authorized redirect URIs를 업데이트해야 합니다.

### 현재 설정
- `http://localhost:3000/api/auth/google/callback` (개발용)
- `http://165.232.172.98/api/auth/google/callback` (이전 프로덕션)

### 추가할 콜백 URL
- `https://qoodle.top/api/auth/google/callback` (새 프로덕션)

## 업데이트 방법

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/

2. **프로젝트 선택**
   - 상단에서 올바른 프로젝트 선택

3. **APIs & Services → Credentials**
   - 좌측 메뉴에서 **APIs & Services** 클릭
   - **Credentials** 클릭

4. **OAuth 2.0 클라이언트 ID 선택**
   - OAuth 2.0 Client IDs 섹션에서 클라이언트 ID 클릭
   - 또는 새로 생성된 클라이언트 ID 선택

5. **Authorized redirect URIs 업데이트**
   - **Authorized redirect URIs** 섹션에서 **+ ADD URI** 클릭
   - `https://qoodle.top/api/auth/google/callback` 입력
   - 기존 URI는 유지하거나 제거 가능 (개발용은 유지 권장)

6. **Save 클릭**

## 확인

업데이트 후 Google 로그인을 테스트하세요:
- https://qoodle.top/admin 에서 Google 로그인 시도
- 정상적으로 리다이렉트되는지 확인

## 참고

- Google OAuth 콜백 URL은 정확히 일치해야 합니다
- HTTP와 HTTPS는 다른 URL로 취급됩니다
- 도메인 변경 시 Google Cloud Console에서도 업데이트가 필요합니다
