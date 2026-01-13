# 컨테이너 재시작 문제 해결

## 문제

`blynk_backend_prod` 컨테이너가 계속 재시작되는 문제가 발생했습니다.

## 원인

Prisma Client가 잘못된 아키텍처의 Query Engine을 찾으려고 했습니다:
- 설정: `linux-musl-arm64-openssl-3.0.x` (ARM64)
- 실제 서버: `x86_64` 아키텍처

## 해결 방법

`blynk_backend/prisma/schema.prisma` 파일의 `binaryTargets`를 수정했습니다:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]  // 아키텍처 명시 제거
}
```

## 적용된 수정사항

1. ✅ Prisma 스키마 파일 수정
2. ✅ Git에 커밋 및 푸시
3. ✅ Droplet에서 코드 업데이트
4. ✅ Docker 이미지 재빌드
5. ✅ 컨테이너 재시작

## 현재 상태

- ✅ `blynk_backend_prod`: Up (healthy)
- ✅ `blynk_postgres_prod`: Up (healthy)
- ✅ `blynk_redis_prod`: Up (healthy)

## 다음 단계

### 1. 방화벽 설정 확인

포트 3000이 열려있는지 확인:

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
ufw status
```

포트가 닫혀있다면:

```bash
ufw allow 3000/tcp
ufw reload
```

### 2. DigitalOcean 방화벽 설정

DigitalOcean 콘솔에서도 방화벽 설정을 확인하세요:
1. DigitalOcean 대시보드 접속
2. Droplet 선택
3. Networking 탭
4. Firewalls 섹션에서 포트 3000 허용 확인

### 3. 애플리케이션 접속 테스트

방화벽 설정 후 다음 URL로 접속:
- http://165.232.172.98/health
- http://165.232.172.98/admin
- http://165.232.172.98/shop
- http://165.232.172.98/customer

## 참고

- Prisma `binaryTargets`는 배포 환경의 아키텍처에 맞게 설정해야 합니다
- `linux-musl-openssl-3.0.x`는 아키텍처를 명시하지 않으면 자동으로 감지합니다
- Docker 이미지를 재빌드할 때 Prisma Client도 다시 생성됩니다
