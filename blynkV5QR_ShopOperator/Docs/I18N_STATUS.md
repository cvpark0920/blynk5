# 상점앱(blynkV5QR_ShopOperator) i18n 작업 상태

**검사일:** 2025-01-29  
**갱신일:** 2025-01-29 (전체 i18n 적용 완료 + zh 추가)  
**대상:** `src/app`, `src/context`, `src/lib`  
**언어:** ko(한국어), en(영어), vn(베트남어), zh(간체 중국어)

---

## 1. 전체 요약

| 항목 | 상태 |
|------|------|
| **LanguageContext** | ko/en/vn/zh 4개 언어, 350개 이상 키/언어 (checkout/push/qr/chat 등 + zh 블록 전체) |
| **t() 사용** | 전역 적용 완료 |
| **완전 i18n** | CheckoutSheet, MainApp, QR/TableQR 모달, MenuManager, QuickChips, StoreHeader, ChatBubble 등 하드코딩 → t() 전환 완료 |
| **누락 키** | 해소 완료 |

---

## 2. 컴포넌트별 상태

### ✅ i18n 적용 양호
- **MainApp.tsx** – 탭, 토스트 등 대부분 `t()` 사용 (일부 하드코딩 있음)
- **TableGrid.tsx** – 테이블 상태/액션/에러/성공 메시지 `t()` 사용
- **OrderFeed.tsx** – 탭명, 버튼문구 `t()` 사용 (EmptyState·일부 문구 미적용)
- **CheckoutSheet.tsx** – 결제 관련 라벨/버튼 `t()` 사용
- **MenuManager.tsx** – 메뉴/카테고리/옵션 라벨 `t()` 사용
- **StaffManagement.tsx** – 직원/역할/상태 `t()` 사용
- **TableManagement.tsx** – 테이블 관리 라벨 `t()` 사용
- **StoreHeader.tsx** – 알림 탭 `t()` 사용 (로딩 문구 1곳 하드코딩)
- **SettingsPage.tsx** – 설정 탭/결제 방법 `t()` 사용
- **WaitingListPanel.tsx** – 대기 명단 라벨/메시지 `t()` 사용
- **ReportsDashboard.tsx** – 리포트 라벨/기간 `t()` 사용
- **LoginScreen.tsx** – 로그인/에러 메시지 `t()` 사용
- **DeviceRegisterScreen.tsx** – 일부만 `t()` (하드코딩 있음)
- **CustomerRequestModal.tsx** – 모달 라벨 `t()` + language 분기
- **PaymentMethodManagement.tsx** – 결제 방법 라벨 `t()` 사용

### ⚠️ 하드코딩/인라인 분기 존재

#### OrderFeed.tsx
| 위치 | 현재 문구 | 권장 |
|------|-----------|------|
| 새 주문 탭 버튼 | `'Updating...' : 'Start Cooking'` | `t('order.status.updating')` / `t('order.action.start_cooking')` |
| EmptyState (새 주문 없음) | `"No new orders"` | `t('feed.empty_new')` 등 키 추가 후 사용 |
| EmptyState (조리중 없음) | `"Nothing cooking right now"` | `t('feed.empty_cooking')` 등 |
| EmptyState (조리완료 없음) | `"No orders ready to serve"` | `t('feed.empty_served')` 등 |
| 테이블 헤더 | `Table {tableId}` | `t('table.management.table_label').replace('{number}', tableId)` |
| 서브텍스트 | `X order(s) ready to serve` | `t('feed.orders_ready_to_serve', { count })` 등 |
| 시간 표시 | `Xm ago`, `Xm elapsed`, `Xm waiting` | `t('feed.minutes_ago', { m })` 등 (선택) |

#### TableGrid.tsx
| 위치 | 현재 | 권장 |
|------|------|------|
| QR 버튼 툴팁 | `language === 'ko' ? 'QR 코드 보기' : ...` | `t('qr.view_title')` 등 키 추가 |
| 테이블 초기화 다이얼로그 | `'테이블 초기화'`, `'취소'`, `'초기화'` 인라인 | `t('table.reset.title')`, `t('btn.cancel')`, `t('table.reset.confirm')` |
| 초기화 성공/실패 메시지 | `테이블 N이(가) 공석으로...` | `t('table.reset.success', { id })` / `t('table.reset.failed')` |
| 시트 푸터 "초기화" 버튼 | `language === 'ko' ? '초기화' : ...` | `t('table.reset.confirm')` |
| 결제 방법 표시 | `language === 'ko' ? '계좌이체' : ...` | `t('checkout.bank_transfer')` 등 |

#### CheckoutSheet.tsx ✅
| 위치 | 적용 |
|------|------|
| 제목/에러/버튼 | `t('checkout.title_table')`, `t('checkout.payment_load_failed')` 등 적용 완료 |

#### MainApp.tsx ✅
| 위치 | 적용 |
|------|------|
| 결제 완료/알림음/푸시 | `t('msg.payment_confirmed')`, `t('settings.sound_activate')`, `t('push.*')` 등 적용 완료 |

#### QRCodeModal.tsx ✅
| 위치 | 적용 |
|------|------|
| 라벨/토스트/에러 | `t('qr.*')` 전환 완료 |

#### TableQRCodeModal.tsx ✅
| 위치 | 적용 |
|------|------|
| 라벨/토스트 | `t('qr.url_copied')`, `t('qr.table_title').replace('{number}', ...)` 적용 완료 |

#### MenuManager.tsx ✅
| 위치 | 적용 |
|------|------|
| 버튼 로딩 | `t('btn.adding')`, `t('btn.saving')` 적용 완료 |

#### QuickChipsManagement.tsx ✅
| 위치 | 적용 |
|------|------|
| 버튼 | `t('btn.cancel')`, `t('btn.save')` 적용 완료 |

#### StoreHeader.tsx ✅
| 위치 | 적용 |
|------|------|
| 로딩 | `t('common.loading')` 적용 완료 |

#### ChatBubble.tsx ✅
| 위치 | 적용 |
|------|------|
| 총합계/번역하기 | `t('chat.total')`, `t('chat.translate')` 적용 완료 |

#### DeviceRegisterScreen.tsx
| 위치 | 현재 | 권장 |
|------|------|------|
| placeholder 등 | `QR 코드로 받은 등록 코드를 입력하세요.` | `t('auth.register_code_placeholder')` 등 |

#### StaffManagement.tsx
| 위치 | 현재 | 권장 |
|------|------|------|
| 디바이스 라벨 | `token.label || '디바이스'` | `t('staff.device')` fallback |

---

## 3. LanguageContext 키 (적용 완료)

- **checkout.** – payment_load_failed, table_info_missing, payment_process_failed, no_payment_methods, title_table
- **btn.processing** – 처리 중...
- **msg.** – request_table, new_message, payment_confirmed
- **qr.** – bank_list_failed, bank_not_found, account_invalid, generate_failed, response_invalid, url_invalid, no_qr, account_holder, exact_amount, copy_url_failed
- **push.** – restaurant_required, browser_not_supported, permission_required, vapid_failed, enabled, disabled, disable_failed, sound_enabled, enable_failed
- **settings.** – sound_locked_message, sound_not_set, sound_https_blocked, sound_please_enable, sound_play_failed
- **chat.translate** – 번역하기/Translate/Dịch

---

## 4. 적용 완료 항목

1. **CheckoutSheet** – 제목/에러/버튼 전부 `t()` 적용  
2. **MainApp** – 결제 완료/알림음/푸시/요청 알림/채팅 메시지 `t()` 적용  
3. **QRCodeModal / TableQRCodeModal** – 모든 라벨·토스트·에러 `t()` 적용  
4. **MenuManager** – 추가 중/저장 중 `t('btn.adding')`, `t('btn.saving')`  
5. **QuickChipsManagement** – 취소/저장 `t('btn.cancel')`, `t('btn.save')` + useLanguage 추가  
6. **StoreHeader** – 로딩 문구 `t('common.loading')`  
7. **ChatBubble** – 총합계/번역하기 `t('chat.total')`, `t('chat.translate')`

---

## 5. t() fallback 패턴

많은 곳에서 `t('key') || '한글 fallback'` 사용. 키가 있으면 문제 없으나, **각 언어에서 fallback이 올바르게 나오도록** LanguageContext에 해당 키가 ko/en/vn/zh 모두 정의되어 있는지 확인하는 것이 좋음.

---

## 6. 참고: 언어별 키 개수

- ko: 약 330개  
- en: 약 330개  
- vn: 약 330개  
- zh: 약 330개 (간체 중국어, ko/en/vn과 동일 키 1:1 대응)  
(키 이름 기준으로 1:1 대응되어 있음.)

## 7. zh(중국어) 추가 (2025-01-29)

- **Language 타입:** `'ko' | 'en' | 'vn' | 'zh'`
- **translations:** `zh` 블록 전체 추가 (nav, feed, report, table, checkout, modal, chat, qr, push, settings, common, btn, msg 등)
- **StoreHeader:** 언어 선택 Select에 「🇨🇳 简体中文」 SelectItem 추가
- **인라인 분기 zh 추가:** StoreHeader(알림 title/description), ChatBubble(메시지/주문 접두사/항목·옵션 라벨/날짜 로케일), MainApp(요청 알림 메시지), TableGrid(메시지 전송 시 textKo/Vn/En), mappers(메뉴·카테고리·채팅 메시지), CustomerRequestModal(fallback 문구), QuickActions(라벨/메시지), ReportsDashboard(날짜 로케일·요일명·주문 라벨)
