# Droplet SSH 키 설정 가이드

## 현재 상황
SSH 연결이 실패했습니다. Droplet에 SSH 공개 키를 추가해야 합니다.

## SSH 공개 키
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA1qcfeA3rL2mQP1P59OVyrofwcddcMb4M6G3lk9oCD7 blynk-deployment
```

## 방법 1: DigitalOcean 웹 콘솔 사용 (권장)

1. DigitalOcean 대시보드에 로그인
2. Droplet (165.232.172.98) 선택
3. "Access" 탭 클릭
4. "Launch Droplet Console" 클릭
5. 콘솔에서 다음 명령어 실행:

```bash
# SSH 디렉토리 생성
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 공개 키 추가
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA1qcfeA3rL2mQP1P59OVyrofwcddcMb4M6G3lk9oCD7 blynk-deployment" >> ~/.ssh/authorized_keys

# 권한 설정
chmod 600 ~/.ssh/authorized_keys
```

## 방법 2: 기존 SSH 키로 접속 후 추가

기존 SSH 키나 비밀번호로 접속할 수 있다면:

```bash
# 기존 방법으로 접속
ssh root@165.232.172.98

# 공개 키 추가
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA1qcfeA3rL2mQP1P59OVyrofwcddcMb4M6G3lk9oCD7 blynk-deployment" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 방법 3: DigitalOcean SSH 키 기능 사용

1. DigitalOcean 대시보드 → Account → Security → SSH Keys
2. "Add SSH Key" 클릭
3. 공개 키 붙여넣기
4. Droplet 재생성 시 이 키 선택 (또는 기존 Droplet에 추가)

## 테스트

SSH 키 추가 후 다음 명령어로 테스트:

```bash
ssh -i ~/.ssh/blynk_deploy root@165.232.172.98
```

성공하면 "SSH 연결 성공" 메시지가 표시됩니다.

## 다음 단계

SSH 연결이 성공하면:
1. Docker 및 Docker Compose 설치 확인
2. 프로젝트 디렉토리 설정
3. GitHub Actions를 통한 첫 배포
