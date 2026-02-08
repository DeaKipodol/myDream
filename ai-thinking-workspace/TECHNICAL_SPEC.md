# 기술 명세서 - AI 생각 작업공간

**버전**: 2.0.0
**작성일**: 2026-01-15
**최종 업데이트**: 2026-02-03
**상태**: 대화 UI 리디자인 완료

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│             (UI 구조 / Flexbox 레이아웃)            │
└──────────────────────┬────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
   ┌────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐
   │ app.js │  │  chat.js   │  │ panel.js │  │ data.js  │
   │(제어)  │  │  (핵심)    │  │ (관리)   │  │ (데이터) │
   └────────┘  └────────────┘  └──────────┘  └──────────┘
        │              │              │              │
   ┌────┴────┐  ┌──────┴──────┐  ┌────┴────┐  ┌────┴────┐
   │엣지 독  │  │ ChatManager │  │ Panel   │  │ 샘플    │
   │패널 토글│  │ 모드 전환   │  │ Manager │  │ 시나리오│
   └─────────┘  └─────────────┘  └─────────┘  └─────────┘
```

---

## ChatManager 상태 다이어그램

### 대화 모드 전환

```
┌─────────────────┐                    ┌─────────────────┐
│    standard     │                    │     persona     │
│   (1:1 대화)    │                    │  (전문가 토론)   │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │ 전문가 초대                           │ 1:1 전환 또는
         │ (inviteExpert/                       │ 모든 전문가 해제
         │  showExpertSelector)                 │
         │                                      │
         └──────────────► ◄─────────────────────┘
                switchToPersonaMode()    switchToStandardMode()
```

### 전문가 초대 흐름

```
┌──────────┐
│ standard │  (activeExperts = [])
└────┬─────┘
     │ 첫 번째 전문가 초대
     ▼
┌──────────┐
│ persona  │  (activeExperts = [expert1])
└────┬─────┘
     │ 추가 전문가 초대
     ▼
┌──────────┐
│ persona  │  (activeExperts = [expert1, expert2])
└────┬─────┘
     │ 전문가 해제
     ▼
┌──────────┐
│ persona  │  (activeExperts = [expert1])
└────┬─────┘
     │ 마지막 전문가 해제
     ▼
┌──────────┐
│ standard │  (activeExperts = [])
└──────────┘
```

---

## 이벤트 흐름

### 1. 전문가 초대 (채팅에서)

```javascript
// 1. "전문가에게 물어보기" 버튼 클릭
<button class="ask-experts-btn" data-action="ask-experts">

// 2. 이벤트 핸들러
handleAskExpertsAction(messageEl) {
  this.showExpertSelector();
}

// 3. 전문가 선택 모달 표시
showExpertSelector() {
  // 모달 생성 및 표시
  // 사용 가능한 전문가 목록 렌더링
}

// 4. 전문가 선택
selectExpert(expertId) {
  // 모달 닫기
  this.closeExpertSelector();

  // 첫 번째 초대면 페르소나 모드로 전환
  if (this.activeExperts.length === 0) {
    this.switchToPersonaMode([expert]);
  } else {
    this.addExpert(expert);
  }
}

// 5. 모드 전환
switchToPersonaMode(experts) {
  this.chatMode = 'persona';
  this.activeExperts = experts;

  // 시스템 메시지 추가
  // 컨텍스트 바 갱신
  // 패널 갱신
}
```

### 2. 전문가 초대 (패널에서)

```javascript
// 1. 패널 [초대] 버튼 클릭
<button class="expert-invite-btn" data-id="${expert.id}">

// 2. PanelManager 핸들러
inviteExpert(expertId) {
  // 전문가 찾기
  const expert = workspace.perspectives.find(p => p.id === expertId);

  // ChatManager에 전달
  if (chatManager.activeExperts.length === 0) {
    chatManager.switchToPersonaMode([expert]);
  } else {
    chatManager.addExpert(expert);
  }

  // 패널 다시 렌더링
  this.renderPerspectives(workspace);
}
```

### 3. 모드 복귀 (1:1 전환)

```javascript
// 1. 컨텍스트 바 "1:1 전환" 버튼 클릭
<button class="context-toggle" id="context-toggle-standard">

// 2. 이벤트 핸들러
toggleBtn.addEventListener('click', () => {
  this.switchToStandardMode();
});

// 3. 모드 전환
switchToStandardMode() {
  this.chatMode = 'standard';
  this.activeExperts = [];

  // 시스템 메시지 추가
  // 컨텍스트 바 갱신
  // 패널 갱신
}
```

---

## CSS 레이아웃 시스템

### GPT 스타일 메시지

```css
/* 사용자 메시지: 오른쪽 정렬 */
.user-message.standard-mode {
  display: flex;
  justify-content: flex-end;
}

.user-bubble {
  background: #e5e5e5;
  border-radius: 18px;
  padding: 10px 16px;
  max-width: 70%;
}

/* AI 메시지: 좌측 아이콘 + 전체 너비 */
.ai-message.standard-mode {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.ai-avatar {
  width: 32px;
  height: 32px;
  font-size: 20px;
}

.ai-response-block {
  flex: 1;
}

.ai-content {
  /* 전체 너비, 문서처럼 읽기 */
}
```

### 전문가 말풍선

```css
.expert-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.expert-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--expert-color-light);
  border: 2px solid var(--expert-color);
}

.expert-name-tag {
  font-size: 12px;
  font-weight: 600;
  color: var(--expert-color);
}

.expert-bubble {
  border-left: 3px solid var(--expert-color);
  padding-left: 12px;
}
```

### 컨텍스트 바

```css
.context-bar {
  position: sticky;
  bottom: 80px;  /* 입력창 위 */
  background: var(--bg-sidebar);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-toggle {
  margin-left: auto;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 12px;
}
```

### 스크롤바 위치 (GPT 스타일)

```css
/* Before: 콘텐츠 안쪽 스크롤 */
.chat-messages { overflow-y: auto; }

/* After: chat-area 전체 스크롤 */
.chat-area { overflow-y: auto; }
.chat-messages { /* overflow 제거 */ }
```

---

## 데이터 구조

### ChatManager 상태

```javascript
class ChatManager {
  constructor() {
    this.chatMode = 'standard';  // 'standard' | 'persona'
    this.activeExperts = [];      // 초대된 전문가 배열
  }
}

// activeExperts 요소 구조
{
  id: 'marketer',
  emoji: '🎯',
  name: '마케터',
  color: '#3b82f6',
  text: '마케팅 관점 분석'
}
```

### PanelManager 상태

```javascript
class PanelManager {
  constructor() {
    this.currentTab = 'perspectives';  // 'perspectives' | 'sources'
  }
}
```

### perspectives 데이터 (data.js)

```javascript
perspectives: [
  {
    id: 'marketer',
    emoji: '🎯',
    name: '마케터',
    text: '마케팅 관점 분석',
    color: '#3b82f6'  // 전문가별 고유 색상
  },
  {
    id: 'analyst',
    emoji: '📊',
    name: '분석가',
    text: '데이터 기반 분석',
    color: '#10b981'
  },
  {
    id: 'critic',
    emoji: '😈',
    name: '비평가',
    text: '비판적 검토',
    color: '#ef4444'
  }
]
```

---

## 컴포넌트 관계

```
┌─────────────────────────────────────────────────────────────┐
│                        App (app.js)                         │
│  - 엣지 독 토글                                             │
│  - 패널 열기/닫기                                           │
│  - 설정 모달                                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  ChatManager    │ │  PanelManager   │ │  TreeManager    │
│  (chat.js)      │◄───────────────►│  (panel.js)      │ │  (tree.js)      │
│                 │  양방향 동기화   │                 │ │                 │
│ - chatMode      │                 │ - currentTab    │ │ - 트리 렌더링   │
│ - activeExperts │                 │                 │ │ - 노드 클릭     │
│ - 메시지 렌더링 │                 │ - 전문가 초대   │ │                 │
│ - 모드 전환     │                 │ - 전문가 해제   │ │                 │
│ - 컨텍스트 바   │                 │ - 카드 렌더링   │ │                 │
└─────────────────┘                 └─────────────────┘ └─────────────────┘
```

---

## 테스트 체크리스트

### Standard 모드

- [ ] 사용자 메시지: 오른쪽 정렬 버블
- [ ] AI 응답: 좌측 아이콘 + 전체 너비 블록
- [ ] 액션 버튼 4개 (호버 시)
- [ ] 컨텍스트 바: "🤖 AI와 대화 중"

### Persona 모드

- [ ] 전문가별 아바타 (이모지 + 배경색)
- [ ] 전문가별 이름 태그 (색상)
- [ ] 전문가별 좌측 색상 바
- [ ] 액션 버튼 2개 (복사, 분기)
- [ ] 컨텍스트 바: "🎭 OOO와 토론 중"

### 모드 전환

- [ ] "전문가에게 물어보기" → 전문가 선택 팝업
- [ ] 전문가 선택 → 시스템 메시지 + 모드 전환
- [ ] 패널 [초대] → 시스템 메시지 + 모드 전환
- [ ] "1:1 전환" → 시스템 메시지 + 표준 모드

### 동기화

- [ ] 채팅에서 초대 → 패널 갱신
- [ ] 패널에서 초대 → 채팅 모드 전환
- [ ] 패널에서 해제 → 채팅 갱신
- [ ] 마지막 전문가 해제 → 표준 모드 복귀

---

## 확장 가이드

### 새로운 전문가 추가

```javascript
// data.js - perspectives 배열에 추가
{
  id: 'designer',
  emoji: '🎨',
  name: '디자이너',
  text: 'UI/UX 관점 분석',
  color: '#8b5cf6'  // 보라색
}
```

### 새로운 액션 버튼 추가

```javascript
// chat.js - renderStandardMessage()에서
<div class="message-actions">
  <button class="action-btn" data-action="copy">📋 복사</button>
  <button class="action-btn" data-action="like">👍</button>
  <button class="action-btn" data-action="branch">🌿 분기</button>
  <button class="action-btn" data-action="ask-experts">🎭 전문가에게 물어보기</button>
  <!-- 새 버튼 추가 -->
  <button class="action-btn" data-action="new-action">🆕 새 액션</button>
</div>

// handleXXXAction() 메서드 추가
handleNewAction(messageEl) {
  // 액션 처리
}
```

### 모드 전환 애니메이션

```css
.message {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.message.entering {
  opacity: 0;
  transform: translateY(10px);
}

.message.entered {
  opacity: 1;
  transform: translateY(0);
}
```

---

## 성능 최적화

### 현재 상태

- DOM 요소: ~100개 (메시지 포함)
- CSS 파일: 1개
- JS 파일: 5개 (~2000줄 총합)
- 로드 시간: < 100ms

### 개선 기회

1. **메시지 가상화**: 많은 메시지 시 성능
2. **CSS 최적화**: 사용하지 않는 스타일 제거
3. **이벤트 위임**: 동적 요소 처리 최적화

---

**다음 버전**: v2.1.0 (조사 처리, 애니메이션)
