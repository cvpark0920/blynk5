# GitHub Actions 워크플로우 상태 확인 가이드

## 워크플로우 실행 시간 분석

워크플로우가 17-19초만에 완료된 것은 **정상이 아닙니다**. 

예상 소요 시간:
- **build-backend**: 3-5분 (Docker 이미지 빌드)
- **build-frontend**: 2-3분 (프론트엔드 빌드)
- **deploy**: 1-2분 (배포)
- **총 예상 시간**: 약 7-10분

17-19초는 워크플로우가 **실패**했을 가능성이 높습니다.

## 워크플로우 상태 확인 방법

### 1. GitHub 웹사이트에서 확인

1. GitHub 저장소 접속: https://github.com/cvpark0920/blynk5
2. **Actions** 탭 클릭
3. 실패한 워크플로우 클릭 (빨간색 X 표시 또는 노란색 경고 표시)
4. 실패한 Job 클릭
5. 실패한 Step 클릭하여 로그 확인

### 2. 일반적인 실패 원인

#### Secrets가 설정되지 않음
- **증상**: "Secret not found" 또는 "Authentication failed" 에러
- **해결**: GitHub Secrets가 올바르게 설정되었는지 확인

#### Docker Hub 로그인 실패
- **증상**: "unauthorized" 또는 "authentication required" 에러
- **해결**: DOCKER_USERNAME과 DOCKER_PASSWORD 확인

#### SSH 연결 실패
- **증상**: "Connection refused" 또는 "Permission denied" 에러
- **해결**: DROPLET_HOST, DROPLET_USER, DROPLET_SSH_KEY 확인

#### Droplet이 아직 생성되지 않음
- **증상**: "Host unreachable" 또는 "Connection timeout" 에러
- **해결**: Droplet을 먼저 생성하고 DROPLET_HOST 설정

## 워크플로우 로그 확인 단계

각 워크플로우 실행에서 다음을 확인하세요:

1. **어떤 Job이 실행되었는가?**
   - build-backend
   - build-frontend
   - deploy

2. **어떤 Job이 실패했는가?**
   - 실패한 Job은 빨간색 X 표시

3. **어떤 Step에서 실패했는가?**
   - 실패한 Step을 클릭하여 상세 로그 확인

4. **에러 메시지는 무엇인가?**
   - 에러 메시지를 복사하여 문제 해결

## 예상되는 문제 및 해결 방법

### 문제 1: Secrets가 설정되지 않음

**에러 메시지:**
```
Error: Input required and not supplied: DOCKER_USERNAME
```

**해결 방법:**
1. GitHub 저장소 > Settings > Secrets and variables > Actions
2. 모든 Secrets가 설정되었는지 확인
3. Secret 이름이 정확한지 확인 (대소문자 구분)

### 문제 2: Docker Hub 인증 실패

**에러 메시지:**
```
Error: unauthorized: authentication required
```

**해결 방법:**
1. Docker Hub 계정 확인
2. DOCKER_PASSWORD가 올바른지 확인
3. Access Token을 사용하는 경우, 토큰이 유효한지 확인

### 문제 3: Droplet 연결 실패

**에러 메시지:**
```
Error: dial tcp: connect: connection refused
```

**해결 방법:**
1. Droplet이 실행 중인지 확인
2. DROPLET_HOST가 올바른 IP 주소인지 확인
3. SSH 키가 올바르게 설정되었는지 확인
4. 방화벽 설정 확인 (포트 22 허용)

### 문제 4: Droplet이 아직 생성되지 않음

**에러 메시지:**
```
Error: dial tcp: lookup: no such host
```

**해결 방법:**
1. DigitalOcean Droplet을 먼저 생성
2. Droplet IP 주소를 DROPLET_HOST Secret에 설정
3. 워크플로우 재실행

## 워크플로우 재실행 방법

### 방법 1: 코드 푸시 (자동 실행)

```bash
git add .
git commit -m "Trigger deployment"
git push origin main
```

### 방법 2: 수동 실행

1. GitHub 저장소 > Actions 탭
2. "Deploy to DigitalOcean" 워크플로우 선택
3. "Run workflow" 버튼 클릭
4. 브랜치 선택 (main)
5. "Run workflow" 클릭

## 정상적인 워크플로우 실행 예시

정상적으로 실행되면 다음과 같이 보입니다:

```
✅ build-backend (3-5분)
  ✅ Checkout code
  ✅ Set up Docker Buildx
  ✅ Log in to Docker Hub
  ✅ Build and push Docker image

✅ build-frontend (2-3분)
  ✅ Checkout code
  ✅ Setup Node.js
  ✅ Install dependencies - ShopOperator
  ✅ Build ShopOperator
  ✅ Install dependencies - Customer
  ✅ Build Customer
  ✅ Install dependencies - Administrator
  ✅ Build Administrator
  ✅ Create deployment archive
  ✅ Upload frontend build artifacts

✅ deploy (1-2분)
  ✅ Checkout code
  ✅ Download frontend build artifacts
  ✅ Prepare deployment package
  ✅ Deploy files to DigitalOcean Droplet
  ✅ Execute deployment script
```

## 다음 단계

워크플로우가 실패한 경우:

1. **로그 확인**: 실패한 Job의 로그를 자세히 확인
2. **에러 메시지 확인**: 정확한 에러 메시지 파악
3. **Secrets 확인**: 모든 Secrets가 올바르게 설정되었는지 확인
4. **Droplet 상태 확인**: Droplet이 실행 중이고 접근 가능한지 확인
5. **재실행**: 문제를 해결한 후 워크플로우 재실행

워크플로우가 성공한 경우:

1. **배포 확인**: Droplet에 SSH 접속하여 배포 상태 확인
2. **서비스 확인**: 백엔드와 프론트엔드가 정상 작동하는지 확인

## 도움말

문제를 해결할 수 없는 경우:

1. GitHub Actions 로그를 복사하여 저장
2. `deployment/SETUP_CHECKLIST.md`의 트러블슈팅 섹션 참조
3. `blynk_backend/DEPLOYMENT.md`의 트러블슈팅 섹션 참조
