# Droplet에 SSH 키 추가하기

## 현재 상황
- ✅ 로컬에서 `ssh root@165.232.172.98` 접속 가능
- ❌ GitHub Actions에서 사용하는 `blynk_deploy` 키가 Droplet에 없음

## 해결 방법

### 방법 1: 현재 접속을 사용하여 키 추가 (가장 쉬움)

1. **현재 접속 유지**
   ```bash
   ssh root@165.232.172.98
   ```

2. **접속 후 다음 명령어 실행**
   ```bash
   # SSH 디렉토리 확인
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   
   # GitHub Actions용 키 추가
   echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA1qcfeA3rL2mQP1P59OVyrofwcddcMb4M6G3lk9oCD7 blynk-deployment" >> ~/.ssh/authorized_keys
   
   # 권한 설정
   chmod 600 ~/.ssh/authorized_keys
   
   # 확인
   cat ~/.ssh/authorized_keys | grep blynk-deployment
   ```

3. **접속 종료**
   ```bash
   exit
   ```

4. **새 키로 테스트**
   ```bash
   ssh -i ~/.ssh/blynk_deploy root@165.232.172.98
   ```

### 방법 2: ssh-copy-id 사용 (한 줄로)

```bash
ssh-copy-id -i ~/.ssh/blynk_deploy.pub root@165.232.172.98
```

### 방법 3: 수동으로 키 복사

```bash
# 공개 키를 Droplet에 복사
cat ~/.ssh/blynk_deploy.pub | ssh root@165.232.172.98 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

## SSH 공개 키 (추가해야 할 키)

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA1qcfeA3rL2mQP1P59OVyrofwcddcMb4M6G3lk9oCD7 blynk-deployment
```

## 확인

키 추가 후 다음 명령어로 테스트:

```bash
ssh -i ~/.ssh/blynk_deploy root@165.232.172.98
```

성공하면 Droplet에 접속됩니다.

## 다음 단계

키 추가가 완료되면:
1. 로컬에서 새 키로 SSH 접속 테스트
2. GitHub Actions 다시 실행
3. 배포 성공 확인
