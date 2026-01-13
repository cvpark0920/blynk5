# 방화벽 설정 가이드

## 현재 상태

✅ 컨테이너 정상 실행 중
✅ 로컬에서 애플리케이션 접속 가능 (`http://localhost:3000/health` 응답 확인)
❌ 외부에서 접속 불가 (DigitalOcean 방화벽 설정 필요)

## 해결 방법

### 1. DigitalOcean 콘솔에서 방화벽 설정

1. DigitalOcean 대시보드 접속: https://cloud.digitalocean.com/
2. 좌측 메뉴에서 **Networking** → **Firewalls** 클릭
3. Droplet에 연결된 방화벽 선택 (없으면 새로 생성)
4. **Inbound Rules** 섹션에서 다음 규칙 추가:
   - **Type**: Custom
   - **Protocol**: TCP
   - **Port Range**: 3000
   - **Sources**: All IPv4, All IPv6 (또는 특정 IP만 허용)
5. **Save Changes** 클릭

### 2. 또는 UFW 방화벽 사용 (서버에서 직접 설정)

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98

# UFW 활성화
ufw enable

# SSH 포트 허용 (중요! 먼저 설정)
ufw allow 22/tcp

# 애플리케이션 포트 허용
ufw allow 3000/tcp

# HTTP/HTTPS 포트 허용 (나중에 Nginx 사용 시)
ufw allow 80/tcp
ufw allow 443/tcp

# 상태 확인
ufw status
```

### 3. DigitalOcean Droplet 방화벽 설정 확인

DigitalOcean 콘솔에서:
1. Droplet 선택 (`165.232.172.98`)
2. **Networking** 탭
3. **Firewalls** 섹션 확인
4. 포트 3000이 허용되어 있는지 확인

## 테스트

방화벽 설정 후 다음 명령어로 확인:

```bash
# 외부에서 접속 테스트
curl http://165.232.172.98/health

# 예상 응답:
# {"status":"ok","timestamp":"2026-01-12T15:36:44.411Z"}
```

## 권장 설정

프로덕션 환경에서는 다음을 권장합니다:

1. **Nginx 리버스 프록시 사용**
   - 포트 80/443만 외부에 노출
   - 내부적으로 포트 3000으로 프록시

2. **방화벽 규칙**
   - 포트 22: SSH (특정 IP만 허용 권장)
   - 포트 80: HTTP
   - 포트 443: HTTPS
   - 포트 3000: 직접 노출하지 않고 Nginx를 통해 접근

3. **보안 그룹 설정**
   - DigitalOcean Firewall 사용
   - 필요한 포트만 허용
   - 불필요한 포트는 모두 차단

## 현재 접속 가능한 URL (방화벽 설정 후)

- Health Check: http://165.232.172.98/health
- Admin 앱: http://165.232.172.98/admin
- Shop 앱: http://165.232.172.98/shop
- Customer 앱: http://165.232.172.98/customer

## 다음 단계

1. ✅ 컨테이너 재시작 문제 해결 완료
2. ⏳ DigitalOcean 방화벽 설정 (포트 3000 허용)
3. ⏳ 애플리케이션 접속 테스트
4. (선택) Nginx 리버스 프록시 설정
5. (선택) SSL 인증서 설정 (Let's Encrypt)
