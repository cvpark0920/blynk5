# SSH 키 문제 해결 - 즉시 조치

## 문제
```
ssh.ParsePrivateKey: ssh: no key found
```

GitHub Secrets에 저장된 SSH 키가 올바르게 파싱되지 않습니다.

## 해결 방법

### 1단계: SSH 키 다시 복사

다음 명령어를 실행하여 SSH 키를 클립보드에 복사하세요:

```bash
cat ~/.ssh/blynk_deploy | pbcopy
```

또는 터미널에서 직접 확인:

```bash
cat ~/.ssh/blynk_deploy
```

### 2단계: GitHub Secrets 업데이트

1. **GitHub 저장소로 이동**:
   https://github.com/cvpark0920/blynk5/settings/secrets/actions

2. **`DROPLET_SSH_KEY` Secret 찾기**

3. **"Update" 버튼 클릭**

4. **기존 내용 삭제 후 새로 복사한 키 붙여넣기**
   - ⚠️ **중요**: 전체 내용을 복사하세요
   - `-----BEGIN OPENSSH PRIVATE KEY-----`부터 시작
   - `-----END OPENSSH PRIVATE KEY-----`까지 끝
   - 각 줄의 줄바꿈이 유지되어야 합니다

5. **"Update secret" 클릭**

### 3단계: 올바른 형식 확인

SSH 키는 다음과 같은 형식이어야 합니다:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACANanH3gN6y9pkD9T+fTlcq6H8HHXXDG+DOht5ZPaAg+wAAAJjyH1+z8h9f
swAAAAtzc2gtZWQyNTUxOQAAACANanH3gN6y9pkD9T+fTlcq6H8HHXXDG+DOht5ZPaAg+w
AAAEDU6x3kFjLVOOkpLNgpfwZBndU/jCf5TotNMfhmbYksMQ1qcfeA3rL2mQP1P59OVyro
fwcddcMb4M6G3lk9oCD7AAAAEGJseW5rLWRlcGxveW1lbnQBAgMEBQ==
-----END OPENSSH PRIVATE KEY-----
```

**주의사항**:
- ❌ 따옴표로 감싸지 마세요
- ❌ 앞뒤 공백을 추가하지 마세요
- ✅ 각 줄 끝에 줄바꿈이 있어야 합니다
- ✅ BEGIN과 END 라인을 포함해야 합니다

### 4단계: 테스트

GitHub Actions를 다시 실행하거나, 다음 커밋/푸시 시 자동으로 실행됩니다.

로컬에서 테스트:

```bash
ssh -i ~/.ssh/blynk_deploy root@165.232.172.98
```

## 대안: RSA 형식으로 변환

OpenSSH 형식이 계속 문제가 되면 RSA 형식으로 변환:

```bash
# 새 RSA 키 생성
ssh-keygen -t rsa -b 4096 -C "blynk-deployment-rsa" -f ~/.ssh/blynk_deploy_rsa -N ""

# 공개 키를 Droplet에 추가
ssh-copy-id -i ~/.ssh/blynk_deploy_rsa.pub root@165.232.172.98

# 개인 키 확인
cat ~/.ssh/blynk_deploy_rsa
```

그런 다음 GitHub Secrets에 RSA 형식 키를 업데이트하세요.
