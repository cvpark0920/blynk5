# GitHub Actions 워크플로우 실행하기

## 방법 1: 웹 인터페이스에서 실행 (가장 빠름)

### 단계별 가이드

1. **브라우저에서 다음 링크 열기**:
   https://github.com/cvpark0920/blynk5/actions/workflows/deploy.yml

2. **"Run workflow" 버튼 클릭**
   - 오른쪽 상단에 있는 파란색 "Run workflow" 버튼 클릭

3. **브랜치 선택**
   - 드롭다운에서 `main` 선택 (기본값)

4. **실행 확인**
   - "Run workflow" 버튼 다시 클릭

5. **실행 상태 확인**
   - 워크플로우 실행이 시작되면 목록에 나타남
   - 실행 항목을 클릭하여 상세 로그 확인

## 방법 2: GitHub CLI 사용 (터미널)

### 인증 완료 후

터미널에서 다음 명령어 실행:

```bash
cd /Users/ilsoonim/Dev/BlynkV5QR/Apps

# GitHub CLI 인증 (처음 한 번만)
gh auth login

# 워크플로우 실행
gh workflow run deploy.yml
```

## 빠른 링크

- **워크플로우 페이지**: https://github.com/cvpark0920/blynk5/actions/workflows/deploy.yml
- **Actions 전체**: https://github.com/cvpark0920/blynk5/actions

## 실행 확인

워크플로우가 실행되면:

1. **실행 목록 확인**
   - 노란색 점: 실행 중
   - 초록색 체크: 성공 ✅
   - 빨간색 X: 실패 ❌

2. **로그 확인**
   - 실행 항목 클릭
   - 각 단계를 클릭하여 상세 로그 확인
   - 특히 "Deploy to DigitalOcean Droplet" 단계 확인

## 예상 실행 시간

- 프론트엔드 빌드: 약 2-3분
- Docker 이미지 빌드 및 푸시: 약 5-10분
- Droplet 배포: 약 2-3분

**총 예상 시간**: 약 10-15분

## 문제 발생 시

각 단계의 로그를 확인하여 에러 메시지를 확인하세요:
- 빌드 실패: 빌드 로그 확인
- Docker Hub 푸시 실패: 인증 확인
- SSH 연결 실패: SSH 키 확인
- 배포 실패: Droplet 서버 상태 확인
