# GitHub Actions 수동 실행 가이드

## 방법 1: GitHub 웹 인터페이스에서 실행 (권장)

### 단계별 가이드

1. **GitHub 저장소로 이동**
   - https://github.com/cvpark0920/blynk5

2. **Actions 탭 클릭**
   - 저장소 상단 메뉴에서 "Actions" 탭 클릭

3. **워크플로우 선택**
   - 왼쪽 사이드바에서 "Deploy to DigitalOcean" 워크플로우 클릭

4. **수동 실행**
   - 오른쪽 상단에 "Run workflow" 버튼이 보입니다
   - "Run workflow" 버튼 클릭
   - 브랜치 선택: `main` (기본값)
   - "Run workflow" 버튼 다시 클릭

5. **실행 상태 확인**
   - 워크플로우 실행이 시작되면 목록에 나타납니다
   - 실행 항목을 클릭하여 상세 로그 확인

## 방법 2: GitHub CLI 사용 (선택사항)

터미널에서 GitHub CLI를 사용하여 실행:

```bash
# GitHub CLI 설치 (없는 경우)
brew install gh

# GitHub CLI 로그인
gh auth login

# 워크플로우 수동 실행
gh workflow run deploy.yml
```

## 실행 확인

워크플로우가 실행되면:

1. **실행 목록 확인**
   - Actions 탭에서 실행 중인 워크플로우 확인
   - 노란색 점: 실행 중
   - 초록색 체크: 성공
   - 빨간색 X: 실패

2. **로그 확인**
   - 실행 항목 클릭
   - 각 단계를 클릭하여 상세 로그 확인
   - 에러가 있으면 해당 단계의 로그 확인

## 주요 단계

워크플로우는 다음 단계로 구성됩니다:

1. ✅ Checkout code - 코드 체크아웃
2. ✅ Set up Node.js - Node.js 설정
3. ✅ Install frontend dependencies - 프론트엔드 의존성 설치
4. ✅ Build frontend - 프론트엔드 빌드
5. ✅ Set up Docker Buildx - Docker Buildx 설정
6. ✅ Log in to Docker Hub - Docker Hub 로그인
7. ✅ Build and push Docker image - Docker 이미지 빌드 및 푸시
8. ✅ Deploy to DigitalOcean Droplet - Droplet에 배포

## 문제 해결

### 워크플로우가 보이지 않을 때
- `main` 브랜치에 푸시되었는지 확인
- `.github/workflows/deploy.yml` 파일이 존재하는지 확인

### "Run workflow" 버튼이 보이지 않을 때
- `workflow_dispatch`가 워크플로우 파일에 있는지 확인
- 저장소에 대한 적절한 권한이 있는지 확인

### 실행이 실패할 때
- 각 단계의 로그를 확인하여 에러 메시지 확인
- Secrets가 올바르게 설정되었는지 확인
- SSH 키 형식이 올바른지 확인

## 빠른 링크

- **Actions 페이지**: https://github.com/cvpark0920/blynk5/actions
- **워크플로우 직접 링크**: https://github.com/cvpark0920/blynk5/actions/workflows/deploy.yml
