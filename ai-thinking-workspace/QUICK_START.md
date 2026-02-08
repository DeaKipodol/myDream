# 빠른 참조 가이드 - AI 생각 작업공간

## 5분 안에 시작하기

### 1단계: 서버 실행 (30초)
```bash
cd ai-thinking-workspace
python3 -m http.server 3000
```

### 2단계: 브라우저 열기 (10초)
```
http://localhost:3000
```

### 3단계: 기능 테스트 (4분)

| 테스트 | 방법 |
|--------|------|
| **1:1 대화** | 메시지 입력 → 사용자(오른쪽 버블) + AI(좌측 블록) |
| **전문가 초대** | AI 응답 하단 "🎭 전문가에게 물어보기" 클릭 |
| **페르소나 모드** | 전문가 선택 → 색상별 말풍선 응답 |
| **1:1 복귀** | 컨텍스트 바 "🤖 1:1 전환" 클릭 |

---

## 핵심 3가지 기능

### 1️⃣ GPT 스타일 레이아웃

```
사용자 메시지       →   오른쪽 정렬 버블
AI 응답            →   좌측 🤖 아이콘 + 전체 너비 블록
액션 버튼          →   복사, 좋아요, 분기, 전문가에게 물어보기
```

**파일**: `js/chat.js` - `renderStandardMessage()`

### 2️⃣ 페르소나 모드 (전문가 토론)

```
전문가 초대 → 시스템 메시지 → 전문가별 말풍선 응답
🎯 마케터: 파란색 좌측바
📊 분석가: 초록색 좌측바
😈 비평가: 빨간색 좌측바
```

**파일**: `js/chat.js` - `renderPersonaMessage()`

### 3️⃣ 컨텍스트 바 + 모드 전환

```
Standard 모드  →  🤖 AI와 대화 중
Persona 모드   →  🎭 마케터, 분석가와 토론 중  [🤖 1:1 전환]
```

**파일**: `js/chat.js` - `updateContextBar()`

---

## 파일별 역할

| 파일 | 역할 | 중요도 |
|------|------|--------|
| `index.html` | UI 구조 (HTML) | ⭐⭐ |
| `css/style.css` | 전체 스타일 (GPT 레이아웃, 말풍선) | ⭐⭐⭐ |
| `js/chat.js` | **핵심 로직** (모드 전환, 메시지 렌더링) | ⭐⭐⭐ |
| `js/panel.js` | 전문가 관리 (초대/해제) | ⭐⭐⭐ |
| `js/app.js` | 앱 제어 (엣지 독, 패널 토글) | ⭐⭐ |
| `js/data.js` | 샘플 데이터 | ⭐ |
| `js/tree.js` | 트리 렌더링 | ⭐ |

---

## ChatManager 상태

```javascript
chatManager.chatMode      // 'standard' | 'persona'
chatManager.activeExperts // 초대된 전문가 배열
```

---

## 흔한 수정 사항

### Q: 전문가 색상 변경하고 싶어요
```javascript
// js/data.js - perspectives 배열에서
{ id: 'marketer', emoji: '🎯', name: '마케터', color: '#3b82f6' }
```

### Q: 컨텍스트 바 텍스트 변경
```javascript
// js/chat.js - updateContextBar()에서
textEl.textContent = 'AI와 대화 중';
```

### Q: 액션 버튼 추가/삭제
```javascript
// js/chat.js - renderStandardMessage()에서 message-actions 수정
```

### Q: 시스템 메시지 스타일 변경
```css
/* css/style.css - .system-message 수정 */
```

---

## 디버깅 팁

### 콘솔에서 상태 확인 (F12 > Console)

```javascript
// 현재 모드 확인
chatManager.chatMode         // 'standard' 또는 'persona'

// 초대된 전문가 확인
chatManager.activeExperts    // [{id, emoji, name, color}, ...]

// 수동으로 모드 전환
chatManager.switchToStandardMode()
chatManager.switchToPersonaMode([전문가객체])

// 전문가 선택 팝업 열기
chatManager.showExpertSelector()
```

### 주요 이벤트 흐름

```
1. "전문가에게 물어보기" 클릭
   → chat.js: handleAskExpertsAction()
   → chat.js: showExpertSelector()

2. 전문가 선택
   → chat.js: selectExpert(expertId)
   → chat.js: switchToPersonaMode([expert])

3. 패널에서 전문가 초대
   → panel.js: inviteExpert(expertId)
   → chat.js: switchToPersonaMode() 또는 addExpert()

4. 1:1 전환 버튼 클릭
   → chat.js: switchToStandardMode()
```

---

## 시나리오별 테스트

### 시나리오 1: 완전 신규 사용자

```
1. 앱 열기
   → 채팅 영역만 표시 (GPT 스타일)
   → 좌우 엣지 독 표시

2. 질문 입력
   → 사용자: 오른쪽 버블
   → AI: 좌측 블록 + 액션 버튼

✅ GPT와 동일한 경험
```

### 시나리오 2: 전문가 초대 (채팅에서)

```
1. AI 응답 하단 "🎭 전문가에게 물어보기" 클릭
   → 전문가 선택 팝업 표시

2. 전문가 선택 (예: 마케터)
   → 시스템 메시지: "🎭 마케터가 참여했습니다"
   → 컨텍스트 바: "🎭 마케터와 토론 중"

3. 질문 입력
   → 마케터 말풍선으로 응답 (파란색 좌측바)

✅ 페르소나 모드 진입 완료
```

### 시나리오 3: 전문가 초대 (패널에서)

```
1. 우측 엣지 독 클릭 (💡)
   → 미니 메뉴 열림

2. "🎭 조언자" 클릭
   → 패널 열림 + 전문가 목록 표시

3. "초대" 버튼 클릭
   → 시스템 메시지 + 모드 전환

✅ 패널-채팅 양방향 동기화
```

### 시나리오 4: 1:1로 복귀

```
1. 컨텍스트 바 "🤖 1:1 전환" 클릭
   → 시스템 메시지: "🤖 1:1 대화로 돌아갑니다"
   → 컨텍스트 바: "🤖 AI와 대화 중"

2. 다음 질문
   → GPT 스타일 AI 응답

✅ Standard 모드 복귀 완료
```

---

## FAQ

**Q: 전문가가 자동으로 응답해요**
A: chatMode가 'persona'이고 activeExperts가 있으면 자동 응답합니다. 1:1로 돌아가려면 컨텍스트 바에서 전환하세요.

**Q: 패널과 채팅이 동기화 안 돼요**
A: 콘솔에서 `chatManager.activeExperts`와 패널 상태를 비교해보세요.

**Q: 전문가 선택 팝업이 안 떠요**
A: `chatManager.showExpertSelector()`가 직접 호출되는지 확인하세요.

**Q: 시스템 메시지가 안 나와요**
A: `renderSystemMessage()`가 messagesContainer에 추가되는지 확인하세요.

**Q: 컨텍스트 바가 업데이트 안 돼요**
A: `updateContextBar()`가 모드 전환 후 호출되는지 확인하세요.

---

## 관련 문서

| 문서 | 내용 | 읽을 대상 |
|------|------|----------|
| **README.md** | 프로젝트 개요 | 누구나 |
| **HANDOVER.md** | 상세 인수인계 | PM/개발자 |
| **TECHNICAL_SPEC.md** | 기술 명세 | 개발자 |
| **DESIGN_ANALYSIS.md** | 디자인 분석 | 디자이너/PM |
| **이 문서** | 빠른 참조 | 개발자/테스터 |

---

## 체크리스트

### 설정 확인
- [ ] Python 설치됨
- [ ] 포트 3000 사용 가능
- [ ] 최신 브라우저 설치됨

### 기본 기능 테스트
- [ ] 서버 실행 성공
- [ ] 페이지 로드됨
- [ ] 1:1 대화 작동 (GPT 스타일)
- [ ] 전문가 선택 팝업 작동
- [ ] 페르소나 모드 전환 작동
- [ ] 컨텍스트 바 상태 표시
- [ ] 1:1 복귀 작동

### 연동 테스트
- [ ] 패널에서 전문가 초대 → 채팅 모드 전환
- [ ] 채팅에서 전문가 제거 → 패널 갱신
- [ ] 시스템 메시지 정상 표시

---

**마지막 업데이트**: 2026-02-03
**버전**: 2.0.0
