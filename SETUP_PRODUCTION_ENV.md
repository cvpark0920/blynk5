# 프로덕션 환경 변수 설정 가이드

## 현재 상황

GitHub Actions 배포는 성공했지만, 컨테이너가 실행되지 않았습니다. 환경 변수 파일이 개발 환경 설정으로 되어 있어 프로덕션 설정으로 업데이트가 필요합니다.

## 완료된 작업

✅ `.env.production` 파일을 프로덕션 설정으로 업데이트
✅ `DOCKER_USERNAME` 추가

## 다음 단계

### 1. DOCKER_USERNAME 설정

`.env.production` 파일에 실제 Docker Hub 사용자명을 설정해야 합니다:

```bash
ssh -i ~/.ssh/blynk_deploy_rsa root@165.232.172.98
cd /opt/blynk-backend/blynk_backend
nano .env.production
```

다음 줄을 찾아서 실제 Docker Hub 사용자명으로 변경:
```
DOCKER_USERNAME=your-docker-username
```

예시:
```
DOCKER_USERNAME=cvpark0920
```

### 2. 컨테이너 시작

환경 변수 설정 후 컨테이너를 시작하세요:

```bash
cd /opt/blynk-backend/blynk_backend
export DOCKER_USERNAME=$(grep DOCKER_USERNAME .env.production | cut -d'=' -f2)
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### 3. 컨테이너 상태 확인

```bash
docker compose -f docker-compose.prod.yml ps
```

모든 컨테이너가 `Up` 상태여야 합니다.

### 4. 데이터베이스 마이그레이션

```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### 5. 로그 확인

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

### 6. 애플리케이션 접속 테스트

브라우저에서 다음 URL로 접속:
- http://165.232.172.98/health
- http://165.232.172.98/admin
- http://165.232.172.98/shop
- http://165.232.172.98/customer

## 중요 환경 변수

다음 변수들은 실제 값으로 변경해야 합니다:

1. **JWT_SECRET**: 강력한 랜덤 문자열 (최소 32자)
2. **DOCKER_USERNAME**: 실제 Docker Hub 사용자명
3. **GOOGLE_CLIENT_ID**: 실제 Google OAuth 클라이언트 ID
4. **GOOGLE_CLIENT_SECRET**: 실제 Google OAuth 클라이언트 시크릿
5. **VIETQR_CLIENT_ID**: 실제 VietQR 클라이언트 ID
6. **VIETQR_API_KEY**: 실제 VietQR API 키

## 자동화

다음 배포부터는 GitHub Actions가 자동으로:
1. DOCKER_USERNAME을 .env.production에 추가
2. 컨테이너를 시작
3. 마이그레이션 실행

하지만 첫 배포는 수동으로 환경 변수를 설정해야 합니다.
