# BlynkV5QR 작업/배포 워크플로우 요약

이 문서는 신규 작업자가 바로 이어서 작업할 수 있도록
프로젝트 개요, 앱 구성, 로컬/배포 절차를 요약한 것입니다.

## 프로젝트 개요

- 단일 Vite 빌드 산출물(`dist`)을 백엔드가 정적 서빙합니다.
- 프론트는 3개 앱(관리자/상점/고객)으로 구성되어 있습니다.
- 백엔드(`blynk_backend`)는 API + 정적 파일 서빙을 담당합니다.
- 프로덕션은 서버(`/opt/blynk-backend`)에서 Docker로 운용됩니다.

## 앱 구성과 특징

- 관리자 앱
  - 경로: `blynkV5QR_Administrator/`
  - 역할: 식당/카테고리/지역/알림/설정 관리
  - 테마: `.admin-theme` 스코프 사용
  - 시트/드로어 등 Radix UI 기반 컴포넌트 사용

- 상점 앱
  - 경로: `blynkV5QR_ShopOperator/`
  - 역할: POS/주문/테이블/직원/정산
  - 테마: `.shop-theme` 스코프 사용
  - 테이블 상세/QR/주문 관리 등 시트 사용

- 고객 앱
  - 경로: `blynkV5QR_Customer/`
  - 역할: 메뉴/주문/채팅/결제
  - 테마: `.customer-theme` 스코프 사용
  - 모바일 시트/드로어 UI 중심

## 로컬 개발 절차

1) 개발 서버

```bash
npm run dev
```

2) 로컬 빌드

```bash
npm run build:local
```

3) 로컬 도커 적용 (자주 사용하는 원클릭)

```bash
npm run build:local:sync
```

- 위 명령은 `dist`를 빌드하고, 백엔드 컨테이너에 동기화합니다.
- 스크립트 위치: `blynk_backend/scripts/sync-frontend.sh`

## 배포 절차 (서버 적용)

배포는 다음 순서로 진행합니다.

1) 로컬 빌드 (프로덕션)

```bash
npm run build:prod
```

2) 서버로 동기화 (rsync)

```bash
# Docker 빌드에서 root/dist를 사용하므로 root/dist도 동기화 필요
rsync -az --delete "./dist/" root@qoodle.top:/opt/blynk-backend/dist/
# uploads 디렉토리는 제외하고 동기화 (알림음 파일 보존)
rsync -az --delete --exclude "uploads" "./dist/" root@qoodle.top:/opt/blynk-backend/blynk_backend/public/
rsync -az --exclude ".env*" --exclude "node_modules" "./blynk_backend/" root@qoodle.top:/opt/blynk-backend/blynk_backend/
```

3) 서버에서 Docker 이미지 빌드

```bash
ssh root@qoodle.top "cd /opt/blynk-backend && docker build -t cvpark0920/blynk-backend:latest -f blynk_backend/Dockerfile ."
```

4) 서버 도커 적용

```bash
ssh root@qoodle.top "cd /opt/blynk-backend/blynk_backend && docker compose -f docker-compose.prod.yml up -d"
```

## 중요한 운영 포인트

- 정적 파일 서빙 경로
  - Nginx/백엔드가 `/opt/blynk-backend/blynk_backend/public` 을 서빙합니다.
  - `dist`를 이 경로에 동기화해야 반영됩니다.

- 포털 컴포넌트 테마 적용
  - `Sheet/Drawer`는 `body`에 렌더되므로
    `body`에 테마 클래스(`admin-theme`, `shop-theme`)가 필요합니다.

- URL 생성 주의
  - `generateSubdomainUrl` 로직에서
    프로덕션에서는 반드시 `*.qoodle.top`을 사용하도록 관리합니다.

## 작업 시작 시 체크리스트

- 변경 파일 확인
  - `git status`로 변경 파일 확인

- 빌드 확인
  - `npm run build:local:sync`로 로컬 반영

- 배포 전 확인
  - `npm run build:prod` → `dist` 생성 확인
  - `dist`가 서버 `public`에 동기화되는지 확인

## 참고 문서

- `BUILD_AND_DEPLOY.md`
- `DEVELOPMENT_WORKFLOW.md`
- `SETUP_PRODUCTION_ENV.md`
- `Docs/LOCAL_SUBDOMAIN_SETUP.md`
