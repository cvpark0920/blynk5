# 고객앱(blynkV5QR_Customer) i18n 상태

**검사일:** 2025-01-29  
**갱신일:** 2025-01-29 (i18n 정리 적용 + zh 추가)  
**대상:** `src/app`, `src/lib`  
**언어:** ko(한국어), vn(베트남어), en(영어), zh(간체 중국어)

---

## 1. 전체 요약

| 항목 | 상태 |
|------|------|
| **i18n 방식** | 공식 라이브러리 없음. `LanguageContext` + `translations.ts` + `getTranslation(path, lang)` |
| **언어 타입** | `LangType = 'ko' | 'vn' | 'en' | 'zh'` |
| **저장소** | `localStorage.getItem('blynk_user_lang')` |
| **번역 키** | `tabs`, `input`, `coachMark`, `bill`, `chat`, `quickActions`, `toast`, `error`, `common`, `app` 등 60+ 키 (ko/vn/en/zh 4개 언어) |
| **완전 i18n** | BlynkApp·BillModal·ErrorPage·LoadingScreen·App·MenuModal·ChatBubble·EventModal 등 getTranslation 적용 완료. zh 포함 |

---

## 2. i18n 인프라

### LanguageContext (`src/app/i18n/LanguageContext.tsx`)
- **제공 값:** `lang`, `setLang`
- **t() 없음:** 문자열 번역은 `getTranslation(path, lang)` (translations.ts) 사용
- **초기값:** localStorage → 브라우저 언어(ko/vi/zh → vn/zh) → 기본 'en'. 지원 언어 배열에 `zh` 포함.

### translations.ts (`src/app/i18n/translations.ts`)
- **구조:** 중첩 객체, 최종 값은 `{ ko, vn, en, zh }`
- **헬퍼:** `getTranslation(path, lang)` — 점 경로 예: `'bill.title'`, `'toast.orderReceived'`. fallback: `value[lang] || value.ko`
- **정의된 영역:** tabs, input, coachMark, bill, chat, quickActions, toast, error, common, app

---

## 3. 컴포넌트별 상태

### ✅ getTranslation 사용 중 (대부분 i18n 적용)

| 컴포넌트 | 사용 키 | 비고 |
|----------|---------|------|
| **BlynkApp** | `tabs.*`, `input.placeholder`, `toast.*` (메뉴 실패, 네트워크, 주문 상태, 메시지/사진 전송, 세션, 주문/결제 실패) | 토스트·탭·입력창은 번역 적용 |
| **BillModal** | `bill.*`, `toast.*` (restaurantNotFound, bankTransferDisabled, accountInfoMissing, qrGenerateFailed, qrCodeMissing, qrDownloadFailed, imageSaved) | 제목·결제 수단·버튼·에러 메시지 번역 |
| **ChatBubble** | `chat.translate`, `chat.orderDetails`, `chat.total` | 번역 버튼·주문 내역·총합계 |
| **QuickActions** | 칩 라벨은 데이터(`labelKO/labelVN/labelEN`) 기반 표시 | translations의 quickActions는 별도 활용 가능 |

### ✅ 적용 완료 (i18n 정리 + zh)

#### BlynkApp.tsx
| 위치 | 적용 |
|------|------|
| Coach Mark 오버레이 | `getTranslation('coachMark.title', userLang)`, `getTranslation('coachMark.subtitle', userLang)` |
| ErrorPage 호출 시 title/message | `getTranslation('error.sessionLoadFailed', userLang)` 등 error.* 키 사용 |
| 언어 선택 UI | ko / Tiếng Việt / English / 中文 (ZH) |

#### BillModal.tsx
| 위치 | 적용 |
|------|------|
| QR memo (테이블 번호) | `getTranslation('bill.tableLabel', lang).replace('{n}', tableNumber)` |
| QR 로딩 / 예금주·입금 금액 / QR 없음·돌아가기 | `bill.qrGenerating`, `bill.accountHolderLabel`, `bill.transferAmount`, `toast.qrLoadFailed`, `common.goBack` |

#### ErrorPage.tsx
| 위치 | 적용 |
|------|------|
| defaultTitle / defaultMessage / Retry | `getTranslation('error.title', lang)`, `error.message`, `error.retry` (fallback으로 기존 lang 분기 유지) |

#### LoadingScreen.tsx
| 위치 | 적용 |
|------|------|
| 문구 | `lang` prop 추가, `getTranslation('common.loading', lang)`. BlynkApp에서 userLang 전달 |

#### App.tsx (LanguageProvider 밖)
| 위치 | 적용 |
|------|------|
| 잘못된 테이블 번호 / 로딩 중 / 잘못된 링크 | `getLangFromNavigator()` 등으로 lang 추정 후 `getTranslation('app.invalidTableNumber', lang)` 등 app.* 키 사용 |

---

## 4. translations.ts 키 목록 (ko/vn/en/zh 정의)

- **tabs:** event, menu, bill  
- **input:** placeholder  
- **coachMark:** title, subtitle  
- **bill:** title, paymentMethod, transfer, noOrders, total, pay, selectPayment, bankTransfer, cash, creditCard, qrSaved, qrDownload, transferComplete, accountHolder, bankName, qrGenerating, tableLabel (`{n}`), accountHolderLabel, transferAmount  
- **chat:** translate, orderDetails, total  
- **quickActions:** wifi, toilet, tissue, bill  
- **toast:** orderReceived, cookingStarted, paymentCompleted, orderCancelled, tableReset, menuLoadFailed, networkError, messageSendFailed, sessionInfoMissing, orderFailed, paymentFailed, photoSent, restaurantNotFound, bankTransferDisabled, accountInfoMissing, qrGenerateFailed, qrCodeMissing, qrDownloadFailed, imageSaved, qrLoadFailed  
- **error:** title, message, retry, sessionLoadFailed, noSession, cannotCreateSession  
- **common:** goBack, loading  
- **app:** invalidTableNumber, useCorrectQR, loading, invalidLink  

---

## 5. 데이터 필드 선택 (i18n 아님, 유지)

- 메뉴/이벤트/채팅 메시지의 **이름·설명·옵션 라벨**: `nameKO/nameVN/nameEN`, `labelKO/labelVN/labelEN` 등 **데이터 필드** 선택이므로 `lang === 'ko' ? item.nameKO : ...` 형태는 올바른 패턴.
- **MenuModal**의 UI 문구는 로컬 `UI_TEXT` 객체로 ko/vn/en/zh 처리 완료.

---

## 6. 적용 완료 요약

- **BlynkApp** Coach Mark·세션 에러·언어 선택(zh) 적용  
- **ErrorPage** error.* 키 + getTranslation  
- **BillModal** bill.tableLabel, qrGenerating, accountHolderLabel, transferAmount, toast.qrLoadFailed, common.goBack  
- **LoadingScreen** common.loading + lang prop  
- **App.tsx** app.* 키 + getLangFromNavigator  
- **MenuModal** UI_TEXT에 zh 추가  
- **ChatBubble / EventModal** zh 분기 및 UI_TEXT zh 추가

---

## 7. 참고

- 기존 상세 분석: `I18N_ANALYSIS.md` (컴포넌트별 하드코딩 목록 등).
- 상점앱(ShopOperator)은 `t(key)` + 플레이스홀더 `replace` 방식; 고객앱은 `getTranslation(path, lang)` 방식으로 서로 다름.
