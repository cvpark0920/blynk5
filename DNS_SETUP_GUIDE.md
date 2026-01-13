# DNS 설정 가이드 (qoodle.top)

## 현재 상태

✅ Nginx 설치 및 설정 완료
✅ 초기 HTTP 설정 완료
✅ 환경 변수 업데이트 완료
❌ DNS 설정 필요 (SSL 인증서 발급 전 필수)

## DNS 설정 방법

### 1. 도메인 등록 업체에서 DNS 설정

도메인 `qoodle.top`를 관리하는 DNS 제공업체(예: GoDaddy, Namecheap, Cloudflare 등)에 로그인하여 다음 레코드를 추가/수정하세요:

#### A 레코드 추가

**호스트/이름**: `@` 또는 `qoodle.top`
**타입**: `A`
**값/포인트**: `165.232.172.98`
**TTL**: `3600` (또는 기본값)

#### www 서브도메인 (선택사항)

**호스트/이름**: `www`
**타입**: `A`
**값/포인트**: `165.232.172.98`
**TTL**: `3600` (또는 기본값)

#### qr 서브도메인 (QR 코드용)

**호스트/이름**: `qr`
**타입**: `A`
**값/포인트**: `165.232.172.98`
**TTL**: `3600` (또는 기본값)

### 2. DNS 전파 확인

DNS 설정 후 전파되는데 몇 분에서 최대 48시간이 걸릴 수 있습니다. 다음 명령어로 확인:

```bash
# DNS 확인
dig qoodle.top +short
# 예상 출력: 165.232.172.98

# 또는
nslookup qoodle.top
# 예상 출력: 165.232.172.98

# 온라인 도구 사용
# https://www.whatsmydns.net/#A/qoodle.top
```

### 3. DNS 전파 후 SSL 인증서 발급

DNS가 전파되면 다음 명령어로 SSL 인증서를 발급하세요:

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98

# SSL 인증서 발급
certbot --nginx -d qoodle.top -d www.qoodle.top --non-interactive --agree-tos --email your-email@example.com --redirect

# 또는 대화형 모드
certbot --nginx -d qoodle.top -d www.qoodle.top
```

### 4. Nginx 설정 업데이트

SSL 인증서 발급 후, 최종 Nginx 설정을 적용:

```bash
# 최종 Nginx 설정 복사
scp -i ~/.ssh/blynk_deploy_rsa nginx.conf root@165.232.172.98:/etc/nginx/sites-available/qoodle.top

# 서버에서 실행
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
nginx -t
systemctl reload nginx
```

## 주요 DNS 제공업체별 설정 방법

### Cloudflare

1. Cloudflare 대시보드 접속
2. `qoodle.top` 도메인 선택
3. **DNS** 탭 클릭
4. **Add record** 클릭
5. 설정:
   - Type: `A`
   - Name: `@` (또는 `qoodle.top`)
   - IPv4 address: `165.232.172.98`
   - Proxy status: `DNS only` (SSL 발급 전)
   - TTL: `Auto`
6. **Save** 클릭

### GoDaddy

1. GoDaddy 도메인 관리 페이지 접속
2. `qoodle.top` 도메인 선택
3. **DNS** 섹션 클릭
4. **Records** 탭에서 **Add** 클릭
5. 설정:
   - Type: `A`
   - Name: `@`
   - Value: `165.232.172.98`
   - TTL: `600 seconds`
6. **Save** 클릭

### Namecheap

1. Namecheap 계정 로그인
2. **Domain List** 클릭
3. `qoodle.top` 옆의 **Manage** 클릭
4. **Advanced DNS** 탭 클릭
5. **Add New Record** 클릭
6. 설정:
   - Type: `A Record`
   - Host: `@`
   - Value: `165.232.172.98`
   - TTL: `Automatic`
7. **Save All Changes** 클릭

## 확인 체크리스트

- [ ] DNS A 레코드 추가 완료 (`qoodle.top` → `165.232.172.98`)
- [ ] DNS A 레코드 추가 완료 (`www.qoodle.top` → `165.232.172.98`) - 선택사항
- [ ] DNS A 레코드 추가 완료 (`qr.qoodle.top` → `165.232.172.98`) - QR 코드용
- [ ] DNS 전파 확인 (`dig qoodle.top +short`가 `165.232.172.98` 반환)
- [ ] HTTP 접속 확인 (`http://qoodle.top/health`)
- [ ] SSL 인증서 발급 완료
- [ ] HTTPS 접속 확인 (`https://qoodle.top/health`)

## 문제 해결

### DNS가 전파되지 않을 때

1. **TTL 확인**: DNS 레코드의 TTL이 너무 길면 변경사항이 늦게 반영될 수 있습니다.
2. **캐시 클리어**: 로컬 DNS 캐시를 클리어:
   ```bash
   # macOS/Linux
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   
   # Windows
   ipconfig /flushdns
   ```
3. **다른 DNS 서버 사용**: Google DNS (8.8.8.8) 또는 Cloudflare DNS (1.1.1.1) 사용

### SSL 인증서 발급 실패 시

1. **DNS 확인**: `dig qoodle.top +short`가 올바른 IP를 반환하는지 확인
2. **포트 80 확인**: Let's Encrypt는 포트 80을 통해 도메인을 확인합니다
3. **방화벽 확인**: 포트 80이 열려있는지 확인
4. **Nginx 상태 확인**: Nginx가 정상 실행 중인지 확인

## 다음 단계

DNS 설정이 완료되면:
1. SSL 인증서 발급
2. HTTPS 접속 테스트
3. Google OAuth 콜백 URL 업데이트 (Google Cloud Console)
4. 프론트엔드 빌드 시 환경 변수 업데이트
