# GitHub Secrets 설정 가이드

## ✅ 완료된 작업

- SSH 키 생성 완료: `~/.ssh/blynk_deploy`
- 공개 키: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA1qcfeA3rL2mQP1P59OVyrofwcddcMb4M6G3lk9oCD7 blynk-deployment`

---

## 1단계: Droplet에 SSH 공개 키 추가

다음 명령어를 실행하여 Droplet에 SSH 공개 키를 추가하세요:

```bash
ssh-copy-id -i ~/.ssh/blynk_deploy.pub root@165.232.172.98
```

또는 수동으로:

```bash
cat ~/.ssh/blynk_deploy.pub | ssh root@165.232.172.98 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

**테스트**: SSH 접속이 되는지 확인하세요:
```bash
ssh -i ~/.ssh/blynk_deploy root@165.232.172.98
```

---

## 2단계: GitHub Secrets 설정

GitHub 저장소 페이지로 이동:
**https://github.com/cvpark0920/blynk5/settings/secrets/actions**

각 Secret을 하나씩 추가하세요:

### Secret 1: DROPLET_HOST
- **이름**: `DROPLET_HOST`
- **값**: `165.232.172.98`

### Secret 2: DROPLET_USER
- **이름**: `DROPLET_USER`
- **값**: `root`

### Secret 3: DROPLET_SSH_KEY
- **이름**: `DROPLET_SSH_KEY`
- **값**: 아래 전체 내용을 복사하세요 (줄바꿈 포함):

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACANanH3gN6y9pkD9T+fTlcq6H8HHXXDG+DOht5ZPaAg+wAAAJjyH1+z8h9f
swAAAAtzc2gtZWQyNTUxOQAAACANanH3gN6y9pkD9T+fTlcq6H8HHXXDG+DOht5ZPaAg+w
AAAEDU6x3kFjLVOOkpLNgpfwZBndU/jCf5TotNMfhmbYksMQ1qcfeA3rL2mQP1P59OVyro
fwcddcMb4M6G3lk9oCD7AAAAEGJseW5rLWRlcGxveW1lbnQBAgMEBQ==
-----END OPENSSH PRIVATE KEY-----
```

**중요**: 전체 내용을 복사하세요 (BEGIN과 END 라인 포함)

### Secret 4: DOCKER_USERNAME
- **이름**: `DOCKER_USERNAME`
- **값**: Docker Hub 사용자명 (예: `your-docker-username`)

**참고**: Docker Hub 계정이 없다면 https://hub.docker.com 에서 생성하세요.

### Secret 5: DOCKER_PASSWORD
- **이름**: `DOCKER_PASSWORD`
- **값**: Docker Hub 비밀번호 또는 액세스 토큰

**권장**: 보안을 위해 액세스 토큰 사용을 권장합니다.
- Docker Hub → Account Settings → Security → New Access Token

### Secret 6: VITE_API_URL
- **이름**: `VITE_API_URL`
- **값**: `http://165.232.172.98/api`

**참고**: 나중에 도메인을 설정하면 `https://yourdomain.com/api`로 변경할 수 있습니다.

### Secret 7: VITE_FRONTEND_BASE_URL
- **이름**: `VITE_FRONTEND_BASE_URL`
- **값**: `http://165.232.172.98`

**참고**: 나중에 도메인을 설정하면 `https://yourdomain.com`으로 변경할 수 있습니다.

---

## 3단계: Secrets 확인

모든 Secrets가 추가되었는지 확인하세요:

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 다음 7개의 Secrets가 모두 있는지 확인:
   - ✅ DROPLET_HOST
   - ✅ DROPLET_USER
   - ✅ DROPLET_SSH_KEY
   - ✅ DOCKER_USERNAME
   - ✅ DOCKER_PASSWORD
   - ✅ VITE_API_URL
   - ✅ VITE_FRONTEND_BASE_URL

---

## 4단계: 배포 테스트

Secrets 설정이 완료되면:

1. **자동 배포**: `main` 브랜치에 푸시하면 자동으로 배포가 시작됩니다.
2. **수동 배포**: GitHub Actions 탭에서 "Deploy to DigitalOcean" 워크플로우를 수동으로 실행할 수 있습니다.

---

## 문제 해결

### SSH 연결 실패
```bash
# SSH 키 권한 확인
chmod 600 ~/.ssh/blynk_deploy
chmod 644 ~/.ssh/blynk_deploy.pub

# SSH 접속 테스트
ssh -i ~/.ssh/blynk_deploy root@165.232.172.98
```

### Docker Hub 인증 실패
- Docker Hub 사용자명과 비밀번호를 다시 확인하세요.
- 액세스 토큰을 사용하는 경우, 토큰이 유효한지 확인하세요.

### GitHub Actions 실패
- GitHub Actions 탭에서 로그를 확인하세요.
- 각 단계의 에러 메시지를 확인하세요.

---

## 다음 단계

Secrets 설정이 완료되면:
1. Droplet 서버 초기 설정 (`DEPLOYMENT_SETUP.md` 참고)
2. 첫 배포 실행
3. 배포 확인 및 테스트
