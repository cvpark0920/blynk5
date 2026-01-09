# blynkV5QR_Customer i18n 상태 분석 리포트

## 📋 개요

이 프로젝트는 **공식 i18n 라이브러리 없이** 커스텀 다국어 시스템을 사용하고 있습니다. 
지원 언어: 한국어(ko), 베트남어(vn), 영어(en)

---

## ✅ 현재 구현 상태

### 1. 언어 관리 시스템

#### 언어 타입 정의
- **위치**: `BlynkApp.tsx`, `MenuModal.tsx`, `EventModal.tsx`
- **타입**: `type LangType = 'ko' | 'vn' | 'en'`
- **상태 관리**: `useState<LangType>('ko')` (기본값: 한국어)

#### 언어 저장 및 불러오기
- **저장소**: `localStorage.getItem('blynk_user_lang')`
- **키**: `'blynk_user_lang'`
- **자동 감지**: 브라우저 언어 기반 초기 설정
  ```typescript
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.includes('ko')) setUserLang('ko');
  else if (browserLang.includes('vi')) setUserLang('vn');
  else setUserLang('en');
  ```

#### 언어 전환 UI
- **위치**: `BlynkApp.tsx` 헤더 (라인 296-314)
- **구현**: DropdownMenu 컴포넌트 사용
- **기능**: 언어 선택 시 localStorage에 저장

---

## 📊 데이터 구조 분석

### 1. 타입 정의 (`types.ts`)

#### ChatMessage
```typescript
interface ChatMessage {
  textKO: string;      // 필수
  textVN: string;      // 필수
  textEN?: string;     // 선택적
}
```

#### MenuItem
```typescript
interface MenuItem {
  nameKO: string;           // 필수
  nameVN: string;           // 필수
  nameEN?: string;          // 선택적
  descriptionKO?: string;
  descriptionVN?: string;
  descriptionEN?: string;
}
```

#### MenuOption
```typescript
interface MenuOption {
  labelKO: string;     // 필수
  labelVN: string;     // 필수
  labelEN?: string;    // 선택적
}
```

#### QuickChip
```typescript
interface QuickChip {
  labelKO: string;      // 필수
  labelVN: string;      // 필수
  labelEN?: string;     // 선택적
  messageKO?: string;
  messageVN?: string;
  messageEN?: string;
}
```

**분석**: 
- ✅ 한국어와 베트남어는 필수 필드
- ⚠️ 영어는 대부분 선택적 (fallback: 한국어 사용)

---

## 🎯 컴포넌트별 i18n 구현 상태

### ✅ 완전히 다국어화된 컴포넌트

#### 1. **MenuModal.tsx**
- **상태**: ✅ 완벽
- **UI_TEXT 객체**: 모든 UI 텍스트 다국어화 (13개 키)
- **메뉴 아이템**: 언어별 이름/설명 표시
- **옵션**: 언어별 라벨 표시
- **카테고리**: 언어별 카테고리명

#### 2. **EventModal.tsx**
- **상태**: ✅ 완벽
- **UI_TEXT 객체**: 모든 UI 텍스트 다국어화 (6개 키)
- **메뉴 아이템**: 언어별 이름/설명 표시

#### 3. **ChatBubble.tsx**
- **상태**: ✅ 메시지 다국어화 완료
- **기능**: 
  - 사용자 언어에 따른 메시지 표시
  - 번역 토글 기능
  - 날짜 포맷 로케일 적용
- **문제점**: ⚠️ "번역하기" 버튼 하드코딩 (라인 86)

#### 4. **BlynkApp.tsx**
- **상태**: ✅ 메시지 생성 시 다국어화
- **언어 전환**: ✅ 완벽 구현
- **문제점**: ⚠️ 하드코딩된 텍스트 다수 (아래 참조)

---

### ⚠️ 부분적으로 다국어화된 컴포넌트

#### 1. **BillModal.tsx**
**문제점**:
- ❌ 모든 UI 텍스트가 하드코딩됨
- ❌ 한국어/영어 병기 형식만 사용 (예: "계산서 (Bill)")
- ❌ 베트남어 번역 없음

**하드코딩된 텍스트**:
- `'계산서 (Bill)'` (라인 61)
- `'결제 수단 선택'` (라인 62)
- `'계좌이체 (Transfer)'` (라인 63)
- `'아직 주문 내역이 없습니다.<br/>(No orders yet)'` (라인 109)
- `'총 합계 (Total)'` (라인 147)
- `'계산하기 (Pay)'` (라인 154)
- `'결제 방법을 선택해주세요<br/>Please select payment method'` (라인 164)
- `'계좌이체 (Bank Transfer)'` (라인 172)
- `'현금 (Cash)'` (라인 181)
- `'신용카드 (Credit Card)'` (라인 190)
- `'QR코드가 갤러리에 저장되었습니다.'` (라인 41)
- `'QR코드 저장 (Download)'` (라인 233)
- `'송금 완료 (Transfer Complete)'` (라인 240)

**권장사항**: UI_TEXT 객체 생성 필요

---

#### 2. **BlynkApp.tsx**
**하드코딩된 텍스트**:
- `'여기서 주문을 시작하세요!'` (라인 280) - Coach Mark
- `'터치하면 메뉴가 열립니다'` (라인 281) - Coach Mark
- `'메시지 입력...'` (라인 386) - Input placeholder
- `'이벤트'` (라인 416) - 탭 레이블
- `'메뉴'` (라인 436) - 탭 레이블
- `'계산서'` (라인 449) - 탭 레이블

**권장사항**: UI_TEXT 객체 생성 필요

---

#### 3. **ChatBubble.tsx**
**하드코딩된 텍스트**:
- `'번역하기'` (라인 86) - 번역 버튼
- `'주문 내역 (Đơn hàng)'` (라인 109) - 주문 헤더
- `'총 합계 (Total)'` (라인 131) - 합계 레이블

**권장사항**: UI_TEXT 객체 생성 필요

---

#### 4. **QuickActions.tsx**
**문제점**:
- ❌ 하드코딩된 추가 액션 버튼들 (라인 30-100)
- ❌ 와이파이, 화장실, 휴지, 계산서 버튼이 하드코딩
- ⚠️ `chip.labelKO`만 표시 (라인 23) - 사용자 언어 무시

**하드코딩된 텍스트**:
- `'와이파이'` (라인 34, 44)
- `'화장실'` (라인 52, 62)
- `'휴지'` (라인 70, 80)
- `'계산서'` (라인 88, 98)

**버그**: 
- 라인 23: `{chip.labelKO}` → 사용자 언어에 따라 `labelVN` 또는 `labelEN` 표시해야 함

---

## 🔍 언어 선택 로직 분석

### ChatBubble.tsx (라인 11-35)
```typescript
const userLang = (localStorage.getItem('blynk_user_lang') as 'ko' | 'en' | 'vn') || 'ko';

switch (userLang) {
  case 'en':
    primaryText = message.textEN || message.textKO;  // ✅ Fallback
    translatedText = message.textVN;
    break;
  case 'vn':
    primaryText = message.textVN || message.textKO;  // ✅ Fallback
    translatedText = message.textKO;
    break;
  case 'ko':
  default:
    primaryText = message.textKO;
    translatedText = message.textVN;
    break;
}
```

**분석**:
- ✅ 영어/베트남어 선택 시 한국어로 fallback
- ✅ 번역 기능 제공
- ⚠️ localStorage 직접 접근 (컨텍스트 없음)

---

### MenuModal.tsx (라인 62-64)
```typescript
const primaryName = lang === 'ko' ? item.nameKO 
  : lang === 'vn' ? item.nameVN 
  : (item.nameEN || item.nameKO);  // ✅ Fallback
```

**분석**:
- ✅ 언어별 이름 표시
- ✅ 영어 없을 시 한국어 fallback

---

## 🐛 발견된 문제점

### 1. **일관성 없는 언어 접근 방식**

#### 문제:
- `BlynkApp.tsx`: `userLang` state 사용
- `ChatBubble.tsx`: localStorage 직접 접근
- `MenuModal.tsx`: props로 `lang` 전달받음

#### 영향:
- 상태 동기화 문제 가능성
- 리렌더링 시점 불일치

#### 권장 해결책:
- Context API 또는 전역 상태 관리 도입
- 또는 모든 컴포넌트에서 props로 전달

---

### 2. **하드코딩된 UI 텍스트**

#### 심각도: 높음

**영향받는 컴포넌트**:
1. `BillModal.tsx` - 12개 이상의 하드코딩 텍스트
2. `BlynkApp.tsx` - 5개 하드코딩 텍스트
3. `ChatBubble.tsx` - 3개 하드코딩 텍스트
4. `QuickActions.tsx` - 4개 하드코딩 텍스트 + 언어 무시 버그

**총 하드코딩 텍스트**: 약 24개 이상

---

### 3. **QuickActions 언어 버그**

**위치**: `QuickActions.tsx` 라인 23

**현재 코드**:
```typescript
<span>{chip.labelKO}</span>  // ❌ 항상 한국어만 표시
```

**수정 필요**:
```typescript
const userLang = (localStorage.getItem('blynk_user_lang') as LangType) || 'ko';
const label = userLang === 'ko' ? chip.labelKO 
  : userLang === 'vn' ? chip.labelVN 
  : (chip.labelEN || chip.labelKO);
<span>{label}</span>
```

---

### 4. **날짜 포맷 일관성**

**ChatBubble.tsx**: 언어별 로케일 사용 ✅
```typescript
dateFormatLocale = 'ko-KR' | 'en-US' | 'vi-VN'
```

**BlynkApp.tsx**: 하드코딩된 로케일 ❌
```typescript
{new Date().toLocaleDateString()}  // 라인 342 - 브라우저 기본 로케일 사용
```

**권장**: 언어에 따른 일관된 날짜 포맷 적용

---

### 5. **Toast 메시지 다국어화 누락**

**위치**: `BillModal.tsx` 라인 41-43
```typescript
toast.success('QR코드가 갤러리에 저장되었습니다.', {
  description: 'Image saved to gallery'  // 영어만
});
```

**권장**: 언어별 toast 메시지 적용

---

## 📈 개선 권장사항

### 우선순위 1: 긴급 수정

1. **QuickActions 언어 버그 수정**
   - 사용자 언어에 따라 라벨 표시

2. **BillModal 다국어화**
   - UI_TEXT 객체 생성
   - 모든 하드코딩 텍스트 제거

### 우선순위 2: 중요 개선

3. **중앙화된 언어 관리**
   - Context API 도입
   - 또는 커스텀 훅 생성 (`useLanguage`)

4. **BlynkApp 하드코딩 제거**
   - 탭 레이블, placeholder, Coach Mark 텍스트 다국어화

5. **ChatBubble 하드코딩 제거**
   - "번역하기", "주문 내역" 등 다국어화

### 우선순위 3: 장기 개선

6. **i18n 라이브러리 도입 검토**
   - `react-i18next` 또는 `react-intl` 고려
   - 현재 시스템과 비교 분석

7. **번역 파일 분리**
   - JSON/YAML 파일로 번역 관리
   - 번역자 협업 용이성 향상

8. **타입 안정성 강화**
   - 번역 키 타입 정의
   - 누락된 번역 컴파일 타임 체크

---

## 📝 번역 커버리지

### 완전히 번역된 영역
- ✅ 메뉴 아이템 (이름, 설명, 옵션)
- ✅ 채팅 메시지
- ✅ 빠른 액션 칩 (QUICK_CHIPS)
- ✅ 메뉴 모달 UI
- ✅ 이벤트 모달 UI

### 부분적으로 번역된 영역
- ⚠️ 계산서 모달 (한국어/영어만)
- ⚠️ 메인 앱 UI (하드코딩 다수)
- ⚠️ 채팅 버블 UI (일부 하드코딩)

### 번역 누락 영역
- ❌ Toast 메시지
- ❌ 에러 메시지
- ❌ Coach Mark 텍스트
- ❌ Input placeholder

---

## 🎯 결론

### 현재 상태
- **다국어 지원**: ✅ 기본 구조 완성
- **일관성**: ⚠️ 부분적 (컴포넌트별 차이)
- **완성도**: ⚠️ 약 70% (하드코딩 텍스트 다수)

### 즉시 조치 필요
1. QuickActions 언어 버그 수정
2. BillModal 완전 다국어화
3. 하드코딩 텍스트 제거 (최소 24개)

### 권장 아키텍처
```
src/
  app/
    i18n/
      translations.ts      # 중앙화된 번역 객체
      useLanguage.ts      # 언어 관리 훅
      LanguageContext.tsx # Context Provider (선택)
```

---

**생성일**: 2025-01-27
**분석 범위**: blynkV5QR_Customer 프로젝트 전체
