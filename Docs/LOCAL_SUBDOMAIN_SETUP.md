## 로컬 서브도메인 + /api 프록시 설정

로컬에서도 배포와 동일하게 **서브도메인 + /api 프록시** 구조로 동작하도록 설정합니다.

### 1) dnsmasq 설정
`scripts/setup-dnsmasq.sh` 실행 후, macOS DNS에 `127.0.0.1` 추가:
- 시스템 설정 → 네트워크 → DNS
- `127.0.0.1` 추가 후 최상단으로 이동

### 2) 도커 리버스 프록시 사용 (권장)
로컬에서도 배포와 동일하게 `/api` 프록시가 동작하도록, 도커 nginx를 사용합니다.

1. 프록시 컨테이너 실행
   - `cd blynk_backend`
   - `docker compose -f docker-compose.dev.yml up -d reverse-proxy`

2. 접속
   - `https://okchiken7.localhost`

> 로컬 nginx(Homebrew)는 필요하지 않습니다.

### 3) 접근 URL
- `https://okchiken7.localhost` (포트 없이 접근)
- 프론트/백엔드가 모두 동일 origin으로 동작

### 4) HTTPS 인증서 설치
알림(Push) 기능을 위해서는 HTTPS가 필요합니다.

1. 인증서 발급
   - `mkcert -install`
   - `mkcert -cert-file blynk_backend/certs/localhost.pem -key-file blynk_backend/certs/localhost-key.pem "*.localhost" "okchiken7.localhost" "localhost" "127.0.0.1"`

2. 프록시 재시작
   - `docker compose -f blynk_backend/docker-compose.dev.yml up -d --force-recreate reverse-proxy`

### 4) 주의사항
- `/api`, `/api/sse`, `/socket.io`는 반드시 백엔드로 프록시되어야 합니다.
- 로컬에서도 **상대 경로(`/api/...`)** 호출이 정상 동작하도록 구성합니다.
