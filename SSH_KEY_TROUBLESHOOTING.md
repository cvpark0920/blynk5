# SSH 키 문제 해결 가이드

## 에러 메시지
```
ssh.ParsePrivateKey: ssh: no key found
```

이 에러는 GitHub Secrets에 저장된 SSH 개인 키가 올바르게 파싱되지 않을 때 발생합니다.

## 원인
1. SSH 키가 잘못 복사되었을 수 있음
2. 줄바꿈 문자나 공백이 잘못 포함되었을 수 있음
3. 키 형식이 올바르지 않을 수 있음

## 해결 방법

### 1단계: SSH 키 확인

로컬에서 SSH 키가 올바른지 확인:

```bash
# 개인 키 확인
cat ~/.ssh/blynk_deploy

# 공개 키 확인
cat ~/.ssh/blynk_deploy.pub

# 키 형식 확인
ssh-keygen -l -f ~/.ssh/blynk_deploy.pub
```

### 2단계: GitHub Secrets에서 SSH 키 재설정

**중요**: SSH 개인 키를 복사할 때 다음을 확인하세요:

1. **전체 내용 복사**: `-----BEGIN OPENSSH PRIVATE KEY-----`부터 `-----END OPENSSH PRIVATE KEY-----`까지 전체를 복사
2. **줄바꿈 유지**: 각 줄의 끝에 줄바꿈이 있어야 함
3. **공백 제거**: 앞뒤 공백이 없어야 함
4. **따옴표 없음**: 따옴표로 감싸지 말 것

### 3단계: 올바른 SSH 키 복사 방법

터미널에서 다음 명령어로 키를 복사하세요:

```bash
# macOS
cat ~/.ssh/blynk_deploy | pbcopy

# Linux
cat ~/.ssh/blynk_deploy | xclip -selection clipboard
```

또는 파일을 직접 열어서 복사:
```bash
cat ~/.ssh/blynk_deploy
```

### 4단계: GitHub Secrets 업데이트

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. `DROPLET_SSH_KEY` Secret 찾기
3. "Update" 클릭
4. 새로 복사한 SSH 개인 키 붙여넣기
5. "Update secret" 클릭

### 5단계: SSH 키 형식 변환 (필요한 경우)

OpenSSH 형식이 문제가 있다면 RSA 형식으로 변환:

```bash
# 기존 키 백업
cp ~/.ssh/blynk_deploy ~/.ssh/blynk_deploy.backup

# RSA 형식으로 변환
ssh-keygen -p -m PEM -f ~/.ssh/blynk_deploy

# 변환된 키 확인
cat ~/.ssh/blynk_deploy
```

### 6단계: 테스트

로컬에서 SSH 연결 테스트:

```bash
ssh -i ~/.ssh/blynk_deploy root@165.232.172.98
```

성공하면 "SSH 연결 성공" 메시지가 표시됩니다.

## 올바른 SSH 키 형식 예시

### OpenSSH 형식 (현재 사용 중)
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACANanH3gN6y9pkD9T+fTlcq6H8HHXXDG+DOht5ZPaAg+wAAAJjyH1+z8h9f
swAAAAtzc2gtZWQyNTUxOQAAACANanH3gN6y9pkD9T+fTlcq6H8HHXXDG+DOht5ZPaAg+w
AAAEDU6x3kFjLVOOkpLNgpfwZBndU/jCf5TotNMfhmbYksMQ1qcfeA3rL2mQP1P59OVyro
fwcddcMb4M6G3lk9oCD7AAAAEGJseW5rLWRlcGxveW1lbnQBAgMEBQ==
-----END OPENSSH PRIVATE KEY-----
```

### RSA 형식 (대안)
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----
```

## 추가 확인 사항

1. **키 권한 확인**:
```bash
chmod 600 ~/.ssh/blynk_deploy
chmod 644 ~/.ssh/blynk_deploy.pub
```

2. **Droplet에 공개 키 추가 확인**:
```bash
ssh root@165.232.172.98 "cat ~/.ssh/authorized_keys | grep blynk-deployment"
```

3. **GitHub Actions 로그 확인**:
- GitHub Actions 탭에서 실패한 워크플로우 확인
- "Deploy to DigitalOcean Droplet" 단계의 로그 확인

## 문제가 계속되면

1. 새 SSH 키 생성:
```bash
ssh-keygen -t rsa -b 4096 -C "blynk-deployment-v2" -f ~/.ssh/blynk_deploy_v2
```

2. 새 키를 Droplet에 추가
3. GitHub Secrets에 새 키 업데이트
