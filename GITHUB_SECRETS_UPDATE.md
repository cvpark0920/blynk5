# GitHub Secrets 업데이트 가이드

## 업데이트할 Secrets

프론트엔드 빌드를 위해 다음 GitHub Secrets를 업데이트해야 합니다:

### 1. VITE_API_URL
- **현재 값**: `http://165.232.172.98/api` (또는 이전 값)
- **새 값**: `https://qoodle.top/api`

### 2. VITE_FRONTEND_BASE_URL
- **현재 값**: `http://165.232.172.98` (또는 이전 값)
- **새 값**: `https://qoodle.top`

## 업데이트 방법

1. GitHub 저장소 접속: https://github.com/cvpark0920/blynk5
2. **Settings** 탭 클릭
3. 좌측 메뉴에서 **Secrets and variables** → **Actions** 클릭
4. 각 Secret을 클릭하여 수정:
   - `VITE_API_URL` → `https://qoodle.top/api`
   - `VITE_FRONTEND_BASE_URL` → `https://qoodle.top`
5. **Update secret** 클릭

## 확인

Secrets 업데이트 후 GitHub Actions를 실행하여 프론트엔드를 재빌드하세요.
