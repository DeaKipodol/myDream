# Phase 1: 접근성 긴급 수정

**상태**: ✅ 완료
**예상 시간**: 30분
**우선순위**: 🔴 Critical
**목표**: WCAG AA 준수, 법적 리스크 제거

---

## 📋 체크리스트

### Task 1.1: 포커스 인디케이터 추가 (10분)
- [x] `style.css` 맨 아래에 포커스 스타일 추가
- [ ] Tab 키로 전체 UI 순회 테스트
- [ ] 모든 인터랙티브 요소 포커스 링 확인

**파일**: `ai-thinking-workspace /css/style.css`
**위치**: 맨 아래 (라인 996 이후)

**적용한 코드**:
```css
/* 키보드 접근성 - 포커스 상태 */
*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
/* ... (전체 코드는 작업계획 참조) */
```

---

### Task 1.2: 터치 타겟 크기 수정 (10분)
- [ ] 패널 닫기 버튼: 24px → 44px
- [ ] 트리 노드: ~30px → 44px
- [ ] 분기 버튼: ~27px → 36px
- [ ] Chrome DevTools로 크기 측정

**수정 위치**:
1. `.panel-close-btn` (라인 734-747)
2. `.tree-node-content` (라인 423-431)
3. `.branch-btn` (라인 616-625)

**수정 내용**:
```css
/* 1. 패널 닫기 버튼 */
.panel-close-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  /* ... */
}

/* 2. 트리 노드 */
.tree-node-content {
  padding: 12px 10px;  /* 8px → 12px */
  min-height: 44px;
  /* ... */
}

/* 3. 분기 버튼 */
.branch-btn {
  padding: 10px 14px;  /* 6px → 10px */
  min-height: 36px;
  /* ... */
}
```

---

### Task 1.3: 시맨틱 HTML & ARIA 레이블 (10분)
- [ ] 채팅 입력 영역 수정
- [ ] 패널 닫기 버튼 ARIA 추가
- [ ] 토글 버튼 ARIA 추가
- [ ] `sr-only` CSS 클래스 추가
- [ ] VoiceOver로 테스트

**파일**: `ai-thinking-workspace /index.html`

**수정 위치**:
1. 채팅 입력 (라인 69-76)
2. 패널 닫기 (라인 86)
3. 토글 버튼 (라인 101-112)

**수정 내용**:
```html
<!-- 1. 채팅 입력 -->
<div class="chat-input-area">
  <div class="chat-input-wrapper">
    <label for="chat-input" class="sr-only">메시지 입력</label>
    <input
      type="text"
      class="chat-input"
      id="chat-input"
      placeholder="이 지점에서 이어서 대화하기..."
      aria-label="메시지 입력"
    />
    <button class="send-btn" id="send-btn" aria-label="메시지 전송">
      <span aria-hidden="true">➤</span>
    </button>
  </div>
</div>

<!-- 2. 패널 닫기 -->
<button class="panel-close-btn" id="panel-close-btn" aria-label="패널 닫기">
  <span aria-hidden="true">×</span>
</button>

<!-- 3. 토글 버튼 -->
<button class="toggle-btn" id="toggle-tree" data-panel="sidebar" aria-label="생각 트리 토글">
  <span class="toggle-icon" aria-hidden="true">🌳</span>
  <span class="toggle-label">생각 트리</span>
</button>
<!-- 나머지도 동일 패턴 -->
```

**CSS 추가** (`style.css`):
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## ✅ 완료 기준

- [ ] Tab 키로 전체 UI 탐색 가능
- [ ] 모든 인터랙티브 요소에 포커스 링 표시
- [ ] 모든 터치 타겟 ≥ 44px (DevTools 측정)
- [ ] VoiceOver로 모든 버튼 목적 확인 가능
- [ ] Lighthouse Accessibility 70+점

---

## 🧪 테스트 방법

### 1. 포커스 인디케이터 테스트
```bash
1. 브라우저에서 index.html 열기
2. Tab 키 누르기
3. 포커스가 다음 순서로 이동하는지 확인:
   - 네비게이션 버튼들
   - + 새 작업공간 버튼
   - 트리 노드들
   - 채팅 입력
   - 전송 버튼
   - 토글 버튼들
4. 모든 요소에 골드 색상(--primary) 포커스 링 표시되는지 확인
```

### 2. 터치 타겟 크기 테스트
```bash
1. Chrome DevTools 열기 (F12)
2. Device Mode (Cmd+Shift+M)
3. iPhone 12 Pro 선택
4. 각 버튼 클릭:
   - 패널 닫기 버튼 (×)
   - 트리 노드들
   - 분기 버튼들
5. Elements 탭에서 크기 확인:
   - Computed → width/height 확인
   - ≥ 44px 인지 검증
```

### 3. 스크린 리더 테스트
```bash
# Mac VoiceOver
1. Cmd + F5 (VoiceOver 켜기)
2. Tab으로 각 버튼 이동
3. VoiceOver가 읽는 내용 확인:
   - "메시지 전송, 버튼" (O)
   - "버튼" (X - ARIA 없음)
4. 모든 버튼이 목적을 명확히 알려주는지 확인
```

### 4. Lighthouse 테스트
```bash
1. Chrome DevTools → Lighthouse 탭
2. Categories: Accessibility만 체크
3. Analyze page load
4. 결과 확인:
   - 목표: 70+점
   - Contrast 이슈 확인
   - Touch target 이슈 확인
```

---

## 📝 작업 노트

### 진행 상황
- [x] 2026-01-17 18:05 - Task 1.1 완료 (포커스 인디케이터)
- [x] 2026-01-17 18:10 - Task 1.2 완료 (터치 타겟 크기)
- [x] 2026-01-17 18:15 - Task 1.3 완료 (시맨틱 HTML & ARIA)
- [x] 2026-01-17 18:20 - **Phase 1 완료** ✅

### 발견한 이슈
- (여기에 작업 중 발견한 이슈 기록)

### 변경 사항
- `style.css`: 라인 996 이후에 60줄 추가 (포커스 스타일)

---

## 🔗 관련 문서

- 작업 계획: `작업계획/v1.0_UX개선_디자인_전용.md`
- 다음 단계: `남은작업/Phase2_시각적위계.md`
