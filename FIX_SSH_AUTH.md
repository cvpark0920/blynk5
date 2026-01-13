# SSH 인증 실패 해결 가이드

## 에러 메시지
```
ssh: handshake failed: ssh: unable to authenticate, attempted methods [none publickey], no supported methods remain
```

이 에러는 Droplet에 SSH 공개 키가 추가되지 않았거나 잘못 설정되었을 때 발생합니다.

## 해결 방법

### 방법 1: DigitalOcean 웹 콘솔 사용 (가장 확실한 방법)

1. **DigitalOcean 대시보드 접속**
   - https://cloud.digitalocean.com
   - Droplet (165.232.172.98) 선택

2. **웹 콘솔 실행**
   - "Access" 탭 클릭
   - "Launch Droplet Console" 버튼 클릭
   - 브라우저에서 콘솔이 열립니다

3. **SSH 키 추가 명령어 실행**

콘솔에서 다음 명령어를 실행하세요:

```bash
# SSH 디렉토리 생성 및 권한 설정
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 공개 키 추가 (아래 키를 그대로 복사)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA1qcfeA3rL2mQP1P59OVyrofwcddcMb4M6G3lk9oCD7 blynk-deployment" >> ~/.ssh/authorized_keys

# 권한 설정
chmod 600 ~/.ssh/authorized_keys

# 확인
cat ~/.ssh/authorized_keys
```

4. **확인 메시지**
   - `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA1qcfeA3rL2mQP1P59OVyrofwcddcMb4M6G3lk9oCD7 blynk-deployment`가 출력되어야 합니다

### 방법 2: 기존 SSH 접속 방법 사용

다른 방법으로 Droplet에 접속할 수 있다면:

```bash
# 기존 방법으로 접속 (비밀번호 또는 다른 키)
ssh root@165.232.172.98

# 접속 후 다음 명령어 실행
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA1qcfeA3rL2mQP1P59OVyrofwcddcMb4M6G3lk9oCD7 blynk-deployment" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit

# 새 키로 테스트
ssh -i ~/.ssh/blynk_deploy root@165.232.172.98
```

### 방법 3: DigitalOcean SSH 키 기능 사용

1. **DigitalOcean 대시보드 → Account → Security → SSH Keys**
2. **"Add SSH Key" 클릭**
3. **다음 공개 키 붙여넣기**:
   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA1qcfeA3rL2mQP1P59OVyrofwcddcMb4M6G3lk9oCD7 blynk-deployment
   ```
4. **키 이름 입력**: `blynk-deployment`
5. **"Add SSH Key" 클릭**
6. **Droplet 재시작** (선택사항)

### 방법 4: 새 SSH 키 생성 및 추가

기존 키가 계속 문제가 되면 새 키 생성:

```bash
# 새 키 생성
ssh-keygen -t ed25519 -C "blynk-deployment-v2" -f ~/.ssh/blynk_deploy_v2 -N ""

# 공개 키 확인
cat ~/.ssh/blynk_deploy_v2.pub

# DigitalOcean 웹 콘솔에서 공개 키 추가
# 또는 ssh-copy-id 사용 (다른 방법으로 접속 가능한 경우)
ssh-copy-id -i ~/.ssh/blynk_deploy_v2.pub root@165.232.172.98

# GitHub Secrets 업데이트
cat ~/.ssh/blynk_deploy_v2
# 위 출력을 GitHub Secrets의 DROPLET_SSH_KEY에 업데이트
```

## SSH 공개 키 (Droplet에 추가해야 함)

```
ssh-ed25519 AAAAC3NzaC1lZDI1lZDI1NTE5AAAAIA1qcfeA3rL2mQP1P59OVyrofwcddcMb4M6G3lk9oCD7 blynk-deployment
```

## 테스트

SSH 키 추가 후 로컬에서 테스트:

```bash
ssh -i ~/.ssh/blynk_deploy root@165.232.172.98
```

성공하면 Droplet에 접속됩니다.

## 확인 사항

Droplet에 접속한 후 다음을 확인:

```bash
# authorized_keys 파일 확인
cat ~/.ssh/authorized_keys

# 권한 확인
ls -la ~/.ssh/

# 올바른 출력 예시:
# -rw------- 1 root root   XXX Jan 12 XX:XX authorized_keys
# drwx------ 2 root root   XXX Jan 12 XX:XX .
```

## 문제가 계속되면

1. **Droplet 재시작**
   ```bash
   # DigitalOcean 대시보드에서 Droplet 재시작
   ```

2. **SSH 서비스 확인**
   ```bash
   # Droplet에 접속 후
   systemctl status ssh
   ```

3. **방화벽 확인**
   ```bash
   # Droplet에 접속 후
   ufw status
   # SSH 포트(22)가 열려있는지 확인
   ```

## 다음 단계

SSH 키 추가가 완료되면:
1. 로컬에서 SSH 연결 테스트
2. GitHub Actions 다시 실행
3. 배포 성공 확인
