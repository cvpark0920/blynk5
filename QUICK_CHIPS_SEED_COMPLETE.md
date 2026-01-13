# Quick Chips 상용구 시드 데이터 추가 완료

## ✅ 완료된 작업

### 1. 고객 요청 상용구 확장

기존 12개에서 **23개**로 확장:

**기존 상용구 (12개):**
- 물 주세요, 수저 주세요, 얼음 주세요, 메뉴판 주세요, 계산서 주세요
- 화장실 어디인가요, 와이파이 비밀번호, 음식이 너무 매워요, 음식이 너무 차가워요
- 포장해주세요, 고수 빼고, 음악 소리 작게

**추가된 상용구 (11개):**
- 커피 주문 (Coffee)
- 추가 주문 (UtensilsCrossed)
- 요리사 부르기 (ChefHat)
- 직원 부르기 (Users)
- 봉투 주세요 (ShoppingBag)
- 냅킨 주세요 (Napkin)
- 음식 데워주세요 (Flame)
- 문제가 있어요 (AlertCircle)
- 맛있어요 (ThumbsUp)
- 카드 결제 (CreditCard)
- 현금 결제 (Banknote)

### 2. 직원 응답 상용구 확장

기존 6개에서 **15개**로 확장:

**기존 상용구 (6개):**
- 네, 알겠습니다, 잠시만 기다려주세요, 곧 가져다 드리겠습니다
- 죄송합니다, 감사합니다, 준비되었습니다

**추가된 상용구 (9개):**
- 커피 준비 중 (Coffee)
- 주문 확인했습니다 (UtensilsCrossed)
- 환영합니다 (Smile)
- 좋아요 (ThumbsUp)
- 포장 준비 중 (Package)
- 결제 준비 (CreditCard)
- 계산서 가져다 드릴게요 (Receipt)
- 도와드릴까요? (HelpCircle)
- 맛있게 드세요 (Star)

### 3. 아이콘 옵션 확장

Admin 앱의 Quick Chips 관리 화면에 새로운 아이콘 추가:
- `UtensilsCrossed`, `ChefHat`, `ShoppingBag`, `Napkin`, `Flame`, `Banknote`
- `ThermometerSun`, `ThermometerSnowflake`, `Droplets`, `ArrowRight`

## 📊 데이터베이스 상태

### 로컬 데이터베이스
- 고객 요청 상용구: 23개
- 직원 응답 상용구: 15개
- 총 38개의 플랫폼 전체 상용구

### 배포 사이트 적용 방법

배포 사이트에도 동일한 상용구가 자동으로 적용됩니다!

**자동 적용 (GitHub Actions)**
- GitHub Actions 워크플로우에 seed 실행 단계가 추가되어 있습니다
- `main` 브랜치에 푸시하면 자동으로 배포되며 seed가 실행됩니다
- `.github/workflows/deploy.yml`의 135-137번째 줄 참고

**수동 실행 (필요한 경우)**
```bash
# 서버에 SSH 접속
ssh root@165.232.172.98

# 백엔드 디렉토리로 이동
cd /opt/blynk-backend/blynk_backend

# Seed 실행
docker compose -f docker-compose.prod.yml exec backend npx tsx prisma/seed.ts
```

**스크립트 사용**
```bash
# 로컬에서 실행
./scripts/seed-quick-chips.sh local

# 프로덕션 실행 안내
./scripts/seed-quick-chips.sh production
```

## 🎯 사용 방법

### Admin 앱에서 확인

1. **Settings → Quick Chips** 메뉴 접속
2. **고객 요청 상용구** 탭에서 23개 상용구 확인
3. **직원 응답 상용구** 탭에서 15개 상용구 확인

### Customer 앱에서 사용

- 고객이 테이블 QR 코드 스캔 후 채팅 화면에서 상용구 사용 가능
- 아이콘과 함께 표시되어 직관적으로 선택 가능

### Shop 앱에서 사용

- 직원이 주문 관리 화면에서 상용구로 빠르게 응답 가능
- 고객 요청에 대한 표준 응답 제공

## 📝 상용구 구조

각 상용구는 다음 정보를 포함합니다:
- **icon**: Lucide 아이콘 이름
- **labelKo**: 한국어 라벨 (짧은 텍스트)
- **labelVn**: 베트남어 라벨
- **labelEn**: 영어 라벨 (선택사항)
- **messageKo**: 한국어 메시지 (실제 전송되는 메시지)
- **messageVn**: 베트남어 메시지
- **messageEn**: 영어 메시지 (선택사항)
- **displayOrder**: 표시 순서
- **isActive**: 활성화 여부

## 🔄 업데이트 방법

새로운 상용구를 추가하려면:

1. `blynk_backend/prisma/seed.ts` 파일 수정
2. `defaultCustomerRequestChips` 또는 `defaultStaffResponseChips` 배열에 추가
3. Seed 실행: `npx prisma db seed`

## ✅ 확인

로컬 환경에서 확인:
```bash
# 데이터베이스에서 상용구 개수 확인
docker compose exec postgres psql -U blynk -d blynk_db -c "SELECT type, COUNT(*) FROM quick_chips WHERE restaurant_id IS NULL GROUP BY type;"
```

브라우저에서 확인:
- http://localhost:3000/admin → Settings → Quick Chips
- 고객 요청 상용구와 직원 응답 상용구가 모두 표시되어야 합니다

---

**마지막 업데이트:** 2026-01-13
