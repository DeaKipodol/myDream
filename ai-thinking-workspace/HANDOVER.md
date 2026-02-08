# 인수인계 문서 - AI 생각 작업공간

**작성 일시**: 2026년 1월 15일
**최종 업데이트**: 2026년 2월 3일
**프로젝트**: AI 생각 작업공간 (Interactive Demo)
**상태**: 대화 UI 리디자인 완료

---

## 인수인계 체크리스트

- [x] GPT 스타일 1:1 대화 레이아웃
- [x] 페르소나 모드 (전문가 토론)
- [x] 초대 기반 전문가 시스템
- [x] 컨텍스트 바 + 시스템 메시지
- [x] 엣지 독 시스템 (좌우 측면)
- [x] 패널 리디자인 (전문가 관리 UI)

---

## 프로젝트 목표

> 투자자 피칭 PPT에서 보여줬던 "AI 생각 작업공간" 시연 화면을
> 실제 작동하는 웹 데모로 구현하여 다른 AI에게 제품 컨셉을 이해시키기

---

## 파일 구조

```
ai-thinking-workspace/
│
├── index.html               # 메인 페이지 (UI 구조)
├── DESIGN_ANALYSIS.md       # 디자인 분석 문서
├── README.md                # 프로젝트 개요
├── HANDOVER.md              # 이 파일
├── QUICK_START.md           # 빠른 참조 가이드
├── TECHNICAL_SPEC.md        # 기술 명세
│
├── css/
│   └── style.css            # 전체 스타일
│                              - GPT 스타일 메시지 레이아웃
│                              - 컨텍스트 바 스타일
│                              - 전문가 말풍선 스타일
│                              - 엣지 독 스타일
│
├── js/
│   ├── app.js               # 메인 앱 제어
│   │                          - 엣지 독 토글
│   │                          - 패널 열기/닫기
│   │                          - 설정 모달
│   │
│   ├── chat.js              # 채팅 관리 클래스 (핵심)
│   │                          - chatMode: 'standard' | 'persona'
│   │                          - activeExperts: 초대된 전문가 배열
│   │                          - renderStandardMessage(): 1:1 GPT 스타일
│   │                          - renderPersonaMessage(): 전문가 말풍선
│   │                          - renderSystemMessage(): 상태 알림
│   │                          - switchToStandardMode/PersonaMode()
│   │                          - inviteExpert/removeExpert()
│   │                          - showExpertSelector(): 전문가 선택 팝업
│   │
│   ├── panel.js             # 패널 관리 클래스
│   │                          - renderPerspectives(): 초대/해제 UI
│   │                          - inviteExpert(): 전문가 초대
│   │                          - removeExpert(): 전문가 해제
│   │                          - 채팅-패널 양방향 동기화
│   │
│   ├── tree.js              # 트리 관리 클래스
│   │                          - 트리 렌더링
│   │                          - 노드 클릭/활성화
│   │
│   └── data.js              # 샘플 데이터
│                              - perspectives에 color 속성 포함
│
└── 실행: python3 -m http.server 3000
```

---

## 핵심 기능 (5개 모듈)

### 모듈 1: GPT 스타일 레이아웃

**파일**: `js/chat.js` - `renderStandardMessage()`

| 요소 | 스타일 |
|------|--------|
| 사용자 메시지 | 오른쪽 정렬 버블 (`.user-bubble`) |
| AI 응답 | 좌측 🤖 아이콘 + 전체 너비 블록 |
| 액션 버튼 | 복사, 좋아요, 분기, 전문가에게 물어보기 |

```javascript
// chat.js
renderStandardMessage(msg) {
  if (isUser) {
    return `<div class="user-bubble">${msg.content}</div>`;
  } else {
    return `
      <div class="ai-avatar">🤖</div>
      <div class="ai-response-block">
        <div class="ai-content">${msg.content}</div>
        <div class="message-actions">...</div>
      </div>
    `;
  }
}
```

### 모듈 2: 컨텍스트 바 + 시스템 메시지

**파일**: `js/chat.js` - `updateContextBar()`, `renderSystemMessage()`

**컨텍스트 바 상태:**
```
Standard 모드  → 🤖 AI와 대화 중
Persona 모드   → 🎭 마케터, 분석가와 토론 중  [🤖 1:1 전환]
```

**시스템 메시지:**
```
🎭 마케터, 분석가가 참여했습니다
🤖 1:1 대화로 돌아갑니다
```

### 모듈 3: 패널 리디자인 (전문가 관리)

**파일**: `js/panel.js` - `renderPerspectives()`

**빈 상태 UI:**
```
🎭 조언자
─────────────────
아직 초대된 전문가가 없습니다

추천 전문가:
🎯 마케터  [초대]
📊 분석가  [초대]
```

**참여 중 상태:**
```
참여 중인 전문가:
🎯 마케터  [해제]

추천 전문가:
📊 분석가  [초대]
```

### 모듈 4: 페르소나 모드 말풍선

**파일**: `js/chat.js` - `renderPersonaMessage()`

```
🎯 마케터
┌─────────────────────────────────────────┐
│ 마케팅 관점에서의 분석...                │  ← border-left: 3px solid 색상
│ [📋 복사] [🌿 이 의견으로 분기]          │
└─────────────────────────────────────────┘
```

**전문가 구분 요소:**
1. 아바타 (이모지 + 배경색)
2. 이름 태그 (전문가별 색상)
3. 좌측 색상 바 (border-left)

### 모듈 5: 모드 전환 통합

**파일**: `js/chat.js` - `showExpertSelector()`, `js/panel.js` - `inviteExpert()`

**전환 진입점:**
1. AI 응답 하단 "🎭 전문가에게 물어보기" 버튼 → 전문가 선택 팝업
2. 우측 패널에서 [초대] 버튼 클릭

**전환 해제:**
1. 컨텍스트 바 "🤖 1:1 전환" 버튼
2. 패널에서 모든 전문가 [해제]

---

## ChatManager 클래스 구조

```javascript
class ChatManager {
  constructor() {
    this.chatMode = 'standard';  // 'standard' | 'persona'
    this.activeExperts = [];      // 초대된 전문가 배열
  }

  // 렌더링
  renderMessage(msg)           // 모드에 따라 분기
  renderStandardMessage(msg)   // 1:1 GPT 스타일
  renderPersonaMessage(msg)    // 전문가 말풍선
  renderSystemMessage(msg)     // 상태 알림

  // 모드 전환
  switchToStandardMode()       // 1:1로 복귀
  switchToPersonaMode(experts) // 전문가 토론 시작

  // 전문가 관리
  addExpert(expert)            // 전문가 추가
  removeExpert(expertId)       // 전문가 제거

  // 컨텍스트 바
  updateContextBar()           // 상태 표시 갱신

  // 전문가 선택 팝업
  showExpertSelector()         // 모달 표시
  selectExpert(expertId)       // 선택 처리
  closeExpertSelector()        // 모달 닫기
}
```

---

## PanelManager 클래스 구조

```javascript
class PanelManager {
  constructor() {
    this.currentTab = 'perspectives';  // 'perspectives' | 'sources'
  }

  // 렌더링
  renderPerspectives(workspace)  // 초대/해제 UI
  renderExpertCard(expert, isInvited)  // 전문가 카드
  renderSources(workspace)       // 자료 탭

  // 전문가 관리 (ChatManager와 연동)
  inviteExpert(expertId)         // 전문가 초대
  removeExpert(expertId)         // 전문가 해제
}
```

---

## 실행 방법

### 1. 서버 시작

```bash
cd ai-thinking-workspace
python3 -m http.server 3000
```

### 2. 브라우저 접속

```
http://localhost:3000
```

### 3. 기능 테스트

```
1. 기본 상태 확인
   → 채팅 영역만 표시 (GPT 스타일)
   → 좌우 엣지 독 표시

2. 1:1 대화 테스트
   → 메시지 입력 → 사용자: 오른쪽 버블, AI: 좌측 블록
   → 액션 버튼 4개 확인 (호버 시)

3. 전문가 초대 (방법 1)
   → AI 응답 하단 "🎭 전문가에게 물어보기" 클릭
   → 전문가 선택 팝업 → 선택
   → 시스템 메시지 + 컨텍스트 바 변경

4. 전문가 초대 (방법 2)
   → 우측 엣지 독 → 💡 클릭 → 🎭 조언자 클릭
   → 패널에서 [초대] 버튼 클릭
   → 시스템 메시지 + 모드 전환

5. 페르소나 모드 테스트
   → 메시지 입력 → 전문가별 말풍선 응답
   → 각 전문가 색상 구분 확인

6. 1:1 복귀 테스트
   → 컨텍스트 바 "🤖 1:1 전환" 클릭
   → 시스템 메시지 + 표준 모드 복귀
```

---

## 알려진 제한사항 & 향후 개선

### 현재 구현된 기능 ✅

- GPT 스타일 레이아웃
- 두 가지 대화 모드
- 초대 기반 전문가 시스템
- 컨텍스트 바 + 시스템 메시지
- 엣지 독 + 패널 토글
- 채팅-패널 양방향 동기화

### 미구현 기능 (선택)

- 조사 처리 ("~와/과 토론 중")
- 모드 전환 애니메이션
- 다크 모드
- 데이터 로컬스토리지 저장
- 모바일 반응형 최적화

---

## 관련 파일

| 파일 | 목적 |
|------|------|
| [DESIGN_ANALYSIS.md](DESIGN_ANALYSIS.md) | 디자인 분석 (GPT 스타일 + 모드 전환) |
| [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md) | 기술 명세 (ChatManager 아키텍처) |
| [QUICK_START.md](QUICK_START.md) | 빠른 참조 가이드 |
| [README.md](README.md) | 프로젝트 개요 |

---

## 핵심 설계 원칙

1. **페르소나는 초대 후에만 존재** - 사용자가 부르지 않으면 등장하지 않음
2. **대화 공간은 항상 1개** - 채팅 영역만 대화 공간, 패널은 관리용
3. **상태 전환 시 시스템 메시지** - 사용자가 맥락을 놓치지 않도록
4. **컨텍스트 바로 현재 상태 항시 표시** - 지금 누구와 대화 중인지 명확히

---

**마지막 업데이트**: 2026-02-03
**버전**: 2.0.0 (대화 UI 리디자인 완료)
**상태**: Ready for Handover
