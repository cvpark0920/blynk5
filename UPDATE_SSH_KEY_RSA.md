# SSH 키 업데이트 - RSA 형식

## 문제
GitHub Actions에서 OpenSSH 형식 키가 인식되지 않아 RSA 형식으로 새 키를 생성했습니다.

## 완료된 작업

✅ RSA 형식 SSH 키 생성 완료
✅ Droplet에 공개 키 추가 완료
✅ 로컬 접속 테스트 성공

## GitHub Secrets 업데이트 필요

### 1단계: GitHub Secrets 업데이트

1. **GitHub 저장소로 이동**:
   https://github.com/cvpark0920/blynk5/settings/secrets/actions

2. **`DROPLET_SSH_KEY` Secret 찾기**

3. **"Update" 버튼 클릭**

4. **기존 내용 삭제 후 새 RSA 키 붙여넣기**
   - 클립보드에 RSA 형식 키가 복사되어 있습니다
   - 전체 내용을 붙여넣으세요 (BEGIN부터 END까지)

5. **"Update secret" 클릭**

## RSA SSH 키 형식

RSA 키는 다음과 같은 형식입니다:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(여러 줄의 base64 인코딩된 키)
...
-----END RSA PRIVATE KEY-----
```

**중요**: 
- ✅ BEGIN과 END 라인 포함
- ✅ 각 줄 끝에 줄바꿈 유지
- ✅ 앞뒤 공백 없음
- ✅ 따옴표 없음

## 확인

GitHub Secrets 업데이트 후:

1. GitHub Actions 다시 실행
2. "Deploy to DigitalOcean Droplet" 단계에서 SSH 연결 성공 확인

## SSH 공개 키 (참고용)

Droplet에 이미 추가된 공개 키:

```
(아래 명령어로 확인 가능)
cat ~/.ssh/blynk_deploy_rsa.pub
```

## 다음 단계

1. GitHub Secrets에 RSA 키 업데이트
2. GitHub Actions 다시 실행
3. 배포 성공 확인
