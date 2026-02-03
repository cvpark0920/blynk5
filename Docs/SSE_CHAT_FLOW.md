# SSE 채팅 메시지 플로우 및 증상 추적 가이드

## 증상 설명

고객앱에서 중국어 상용구를 보내면:
1. ✅ **처음에는 정상적으로 중국어로 표시됨** (낙관적 업데이트)
2. ❌ **SSE 이벤트가 상점앱에 도달하는 시점에 영어로 변함**

## 전체 플로우 설명

### 1단계: 고객앱에서 메시지 전송

```
고객앱 (BlynkApp.tsx)
├─ handleQuickAction() 호출
├─ 상용구 선택 (chip.messageZH에 중국어 텍스트)
├─ API 요청: apiClient.sendMessage()
│  ├─ textZh: "중국어 텍스트"
│  ├─ textEn: undefined
│  └─ 기타 필드...
└─ 낙관적 업데이트: setMessages()로 즉시 UI에 표시
   └─ ✅ 이 시점에는 중국어로 정상 표시됨
```

**로그 위치**: `[QuickAction] 상용구 전송 시작`

### 2단계: 백엔드에서 메시지 저장

```
백엔드 (chatService.ts)
├─ createMessage() 호출
├─ 언어 감지 및 번역 처리
│  ├─ providedTextZh 확인 (중국어 텍스트 있음)
│  ├─ originalLanguage = 'zh' 결정
│  ├─ detectedLanguage = 'zh' 설정
│  └─ textZh 필드에 중국어 텍스트 저장
├─ Prisma로 DB 저장
│  └─ ChatMessage 테이블에 textZh 필드 저장
└─ SSE 이벤트 발행
   └─ eventEmitter.publishChatMessage()
```

**로그 위치**: `[ChatService] createMessage - 저장된 메시지 언어 필드`

### 3단계: SSE 이벤트 발행 및 전달

```
백엔드 (eventEmitter.ts)
├─ publishChatMessage() 호출
├─ SSE 이벤트 생성
│  └─ type: 'chat:new'
│     ├─ sessionId
│     ├─ sender: 'user'
│     ├─ message: textKo || textVn || textEn || textZh || textRu
│     └─ ⚠️ 주의: text 필드는 단순 문자열만 포함 (언어 필드 정보 없음)
└─ SSE 스트림으로 전송
   └─ 상점앱으로 실시간 전달
```

**중요**: SSE 이벤트의 `message` 필드는 단순 텍스트만 포함하며, `textZh`/`textRu` 같은 언어별 필드 정보는 포함되지 않습니다.

### 4단계: 상점앱에서 SSE 이벤트 수신

```
상점앱 (MainApp.tsx)
├─ SSEClient.onMessage() 호출
├─ handleSSEEvent() 호출
│  └─ case 'chat:new':
│     ├─ 이벤트 정보 파싱
│     ├─ 알림 표시 (모달/토스트)
│     └─ chatNewHandlerRef.current() 호출
│        └─ TableGrid.updateTableRequestStatus() 호출
```

**로그 위치**: `[MainApp] SSE chat:new 이벤트 수신 - 플로우 시작점`

### 5단계: 상점앱에서 채팅 히스토리 재로드

```
상점앱 (TableGrid.tsx)
├─ updateTableRequestStatus() 호출
│  ├─ 테이블 요청 상태 업데이트
│  ├─ 읽지 않은 메시지 수 계산
│  └─ getChatHistory() API 호출
│     └─ 백엔드에서 전체 메시지 목록 조회
│
└─ loadChatMessages() 호출 (테이블 상세가 열려있는 경우)
   ├─ apiClient.getChatHistory() 호출
   ├─ 백엔드 응답 받음
   │  └─ ⚠️ 이 시점에 textZh 필드가 비어있거나 잘못된 값일 수 있음
   ├─ setChatMessages() 호출
   └─ ❌ 이 시점에 영어로 표시됨
```

**로그 위치**: 
- `[TableGrid] updateTableRequestStatus - SSE 이벤트로 인한 채팅 메시지 재로드 시작`
- `[TableGrid] loadChatMessages - 시작`
- `[TableGrid] loadChatMessages - 중국어/러시아어 메시지 발견`

### 6단계: 메시지 표시

```
상점앱 (ChatBubble.tsx)
├─ getMessageText() 또는 getTranslatedText() 호출
├─ 언어 필드 확인
│  ├─ textZh 필드 확인
│  └─ ⚠️ textZh가 비어있으면 fallback으로 textEn 사용
└─ UI에 표시
   └─ ❌ 영어로 표시됨
```

**로그 위치**: `[ChatBubble] 메시지 표시`

## 문제 발생 지점 추적

### 가능한 문제 지점

1. **백엔드 저장 시점** (`chatService.ts`의 `createMessage`)
   - `textZh` 필드가 제대로 저장되지 않음
   - 로그 확인: `[ChatService] createMessage - 저장된 메시지 언어 필드`

2. **백엔드 조회 시점** (`chatService.ts`의 `getChatHistory`)
   - DB에서 조회한 메시지의 `textZh` 필드가 비어있음
   - 로그 확인: `[ChatService] getChatHistory - 조회된 메시지 언어 필드`

3. **API 응답 시점** (`chatController.ts`의 `getChatHistory`)
   - 컨트롤러에서 반환하는 메시지의 `textZh` 필드가 비어있음
   - 로그 확인: `[ChatController] getChatHistory - Response message`

4. **프론트엔드 수신 시점** (`TableGrid.tsx`의 `loadChatMessages`)
   - API 응답으로 받은 메시지의 `textZh` 필드가 비어있음
   - 로그 확인: `[TableGrid] loadChatMessages - 중국어/러시아어 메시지 발견`

5. **메시지 표시 시점** (`ChatBubble.tsx`)
   - `textZh` 필드가 비어있어서 fallback으로 `textEn` 사용
   - 로그 확인: `[ChatBubble] 메시지 표시`

## 로그 추적 방법

### 1. 브라우저 개발자 도구 콘솔 확인

상점앱에서 중국어 상용구를 받았을 때 다음 로그들을 순서대로 확인:

```
1. [MainApp] SSE chat:new 이벤트 수신 - 플로우 시작점
2. [TableGrid] updateTableRequestStatus - SSE 이벤트로 인한 채팅 메시지 재로드 시작
3. [TableGrid] loadChatMessages - 시작
4. [TableGrid] loadChatMessages - 중국어/러시아어 메시지 발견
5. [ChatBubble] 메시지 표시
```

### 2. 백엔드 로그 확인

Docker 컨테이너 로그에서 다음 로그들을 확인:

```bash
docker logs blynk_backend_dev | grep -E "ChatService|ChatController"
```

확인할 로그:
- `[ChatService] createMessage - 저장된 메시지 언어 필드`
- `[ChatService] getChatHistory - 조회된 메시지 언어 필드`
- `[ChatController] getChatHistory - Response message`

### 3. 로그 분석 포인트

각 로그에서 다음을 확인:

1. **textZh 필드 값**: 비어있는지(null/undefined/빈 문자열), 올바른 중국어 텍스트가 있는지
2. **detectedLanguage**: 'zh'로 올바르게 설정되어 있는지
3. **타이밍**: SSE 이벤트 수신 시점과 getChatHistory 호출 시점의 시간 차이
4. **메시지 ID**: 같은 메시지 ID를 추적하여 각 단계에서 값이 어떻게 변하는지 확인

## 예상되는 문제 시나리오

### 시나리오 1: 백엔드 저장 시 textZh가 비어있음
- **증상**: `[ChatService] createMessage` 로그에서 `textZh: null`
- **원인**: `chatService.ts`의 번역 로직에서 `textZh` 필드가 제대로 설정되지 않음
- **해결**: `chatService.ts`의 `createMessage` 함수에서 `providedTextZh` 보존 로직 확인

### 시나리오 2: DB 조회 시 textZh가 비어있음
- **증상**: `[ChatService] getChatHistory` 로그에서 `textZh: null`
- **원인**: DB에 저장은 되었지만 조회 시 필드가 누락됨
- **해결**: Prisma 스키마와 실제 DB 테이블 구조 확인

### 시나리오 3: API 응답 시 textZh가 비어있음
- **증상**: `[ChatController] getChatHistory` 로그에서 `textZh: null`
- **원인**: 컨트롤러에서 응답 생성 시 필드 누락
- **해결**: `chatController.ts`의 응답 생성 로직 확인

### 시나리오 4: 프론트엔드 수신 시 textZh가 비어있음
- **증상**: `[TableGrid] loadChatMessages` 로그에서 `textZh: null`
- **원인**: API 응답은 정상이지만 프론트엔드에서 필드 매핑 오류
- **해결**: `BackendChatMessage` 타입 정의와 실제 응답 구조 확인

### 시나리오 5: 표시 시 fallback으로 영어 사용
- **증상**: `[ChatBubble] 메시지 표시` 로그에서 `textZh: null`, `translatedText`가 영어
- **원인**: `getMessageText` 또는 `getTranslatedText` 함수의 fallback 로직
- **해결**: `ChatBubble.tsx`의 언어 필드 선택 로직 확인

## 다음 단계

로그를 확인한 후, 어느 단계에서 `textZh` 필드가 비어지는지 확인하고 해당 부분을 수정하면 됩니다.
