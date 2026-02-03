# 대화 UI 리디자인 - Git 커밋 계획

> 작성일: 2026-02-03
> 참조: `/docs/git/관리_전략.md`

---

## 1. 문서 읽기 순서 (완료)

### 1단계: Git 규칙 확인
- [x] `/docs/git/관리_전략.md` - 커밋 메시지 규칙, 브랜치 전략
- [x] `/docs/git/레포지토리_분류.md` - 공개/프라이빗 분류 기준
- [x] `/.gitignore` - 현재 제외 항목 확인

### 2단계: 디자인 문서 확인
- [x] `/design/chat-ui-redesign.md` - 기획서 (4인 UX 토론 결과)
- [x] `/design/chat-ui-implementation-report.md` - 구현 완료 보고서
- [x] `/design/chat-ui-analysis.md` - 분석서
- [x] `/design/UX토론_디자인변화_히스토리.md` - 토론 히스토리

### 3단계: 프론트엔드 작업 문서 확인
- [x] `/docs/_3_현재작업폴더/초기개발/FrontEnd /완료한부분/chat-ui-redesign-implementation.md`
- [x] `/docs/_3_현재작업폴더/초기개발/FrontEnd /_현재_작업.md`

---

## 2. 현재 Git 상태 분석

### 커밋 대상 분류

| 구분 | 파일 | 공개 여부 | 커밋 여부 |
|------|------|----------|----------|
| Untracked | `core/errors.py` | ✅ 공개 | ✅ 커밋 |
| Untracked | `core/exceptions.py` | ✅ 공개 | ✅ 커밋 |
| Modified | `docs/_2_기능명세/*.md` | ✅ 공개 | ✅ 커밋 |
| Modified | `docs/온보딩_가이드.md` | ✅ 공개 | ✅ 커밋 |
| Untracked | `docs/conventions_and_scaling_guide.md` | ✅ 공개 | ✅ 커밋 |
| Modified | `.gitignore` | ✅ 공개 | ✅ 커밋 |
| (gitignore) | `design/` | 🔒 프라이빗 | ❌ 제외 |
| (gitignore) | `ai-thinking-workspace /` | 🔒 프라이빗 | ❌ 제외 |
| (gitignore) | `docs/_3_현재작업폴더/` | 🔒 프라이빗 | ❌ 제외 |

---

## 3. 커밋 계획 (4개 커밋)

### Commit 1: .gitignore 업데이트 (design/ 프라이빗 추가)

**Type**: `chore`
**Scope**: `config`

**커밋 메시지**:
```
chore(config): .gitignore에 design/ 폴더 추가

- design/ 폴더를 프라이빗으로 분류
- 설계 문서는 프라이빗 레포에서 관리

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**명령어**:
```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
chore(config): .gitignore에 design/ 폴더 추가

- design/ 폴더를 프라이빗으로 분류
- 설계 문서는 프라이빗 레포에서 관리

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Commit 2: 에러/예외 처리 모듈 추가

**Type**: `feat`
**Scope**: `core`

**커밋 메시지**:
```
feat(core): 에러 및 예외 처리 모듈 추가

추가된 파일:
- core/errors.py (에러 정의)
- core/exceptions.py (예외 클래스)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**명령어**:
```bash
git add core/errors.py core/exceptions.py
git commit -m "$(cat <<'EOF'
feat(core): 에러 및 예외 처리 모듈 추가

추가된 파일:
- core/errors.py (에러 정의)
- core/exceptions.py (예외 클래스)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Commit 3: 기능 명세 문서 업데이트

**Type**: `docs`
**Scope**: `features`

**커밋 메시지**:
```
docs(features): 기능 명세 문서 업데이트

수정된 문서:
- docs/_2_기능명세/기능_구현_상태.md
- docs/_2_기능명세/다중_에이전트_관점_명세.md
- docs/_2_기능명세/크로스노드_컨텍스트_참조_명세.md

대화 UI 리디자인 관련 내용 반영

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**명령어**:
```bash
git add "docs/_2_기능명세/"
git commit -m "$(cat <<'EOF'
docs(features): 기능 명세 문서 업데이트

수정된 문서:
- docs/_2_기능명세/기능_구현_상태.md
- docs/_2_기능명세/다중_에이전트_관점_명세.md
- docs/_2_기능명세/크로스노드_컨텍스트_참조_명세.md

대화 UI 리디자인 관련 내용 반영

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Commit 4: 가이드 문서 업데이트

**Type**: `docs`
**Scope**: (없음)

**커밋 메시지**:
```
docs: 온보딩 및 컨벤션 가이드 업데이트

수정/추가된 문서:
- docs/온보딩_가이드.md (업데이트)
- docs/conventions_and_scaling_guide.md (신규)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**명령어**:
```bash
git add "docs/온보딩_가이드.md" "docs/conventions_and_scaling_guide.md"
git commit -m "$(cat <<'EOF'
docs: 온보딩 및 컨벤션 가이드 업데이트

수정/추가된 문서:
- docs/온보딩_가이드.md (업데이트)
- docs/conventions_and_scaling_guide.md (신규)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## 4. 전체 실행 순서

```bash
# 0. 현재 브랜치 확인 (develop에 있어야 함)
git branch

# 1. .gitignore 업데이트 (design/ 프라이빗 추가)
git add .gitignore
git commit -m "chore(config): .gitignore에 design/ 폴더 추가 ..."

# 2. 에러/예외 모듈 커밋
git add core/errors.py core/exceptions.py
git commit -m "feat(core): 에러 및 예외 처리 모듈 추가 ..."

# 3. 기능 명세 업데이트 커밋
git add "docs/_2_기능명세/"
git commit -m "docs(features): 기능 명세 문서 업데이트 ..."

# 4. 가이드 문서 커밋
git add "docs/온보딩_가이드.md" "docs/conventions_and_scaling_guide.md"
git commit -m "docs: 온보딩 및 컨벤션 가이드 업데이트 ..."

# 5. 원격에 푸시
git push origin develop
```

---

## 5. 주의사항

### ⚠️ 커밋 제외 대상

다음 파일/폴더는 `.gitignore`에 포함되어 **커밋하지 않음**:

| 경로 | 이유 |
|------|------|
| `design/` | 프라이빗 전용 (UI/UX 설계 문서) |
| `ai-thinking-workspace /` | 프라이빗 전용 (프론트엔드 프로토타입) |
| `docs/_3_현재작업폴더/` | 프라이빗 전용 (작업 중 문서) |
| `docs/_4_이전작업폴더/` | 프라이빗 전용 (아카이브) |

### ✅ 프라이빗 레포에서 관리되는 항목

1. **설계 문서** (`design/` 내부):
   - `chat-ui-redesign.md` - 대화 UI 리디자인 기획서
   - `chat-ui-implementation-report.md` - 구현 완료 보고서
   - 기타 UX 토론 히스토리

2. **프론트엔드 코드** (`ai-thinking-workspace /` 내부):
   - `js/chat.js`, `js/panel.js`, `js/app.js`, `js/data.js`
   - `css/style.css`
   - `index.html`

이 파일들은 **프라이빗 레포지토리**에서 별도로 관리됩니다.

---

## 6. 커밋 후 확인

```bash
# 커밋 히스토리 확인
git log --oneline -5

# 예상 결과:
# abc1234 docs: 온보딩 및 컨벤션 가이드 업데이트
# def5678 docs(features): 기능 명세 문서 업데이트
# ghi9012 feat(core): 에러 및 예외 처리 모듈 추가
# jkl3456 docs(design): 대화 UI 리디자인 기획 및 설계 문서 추가
```

---

## 7. 다음 단계 (선택)

1. **PR 생성**: develop → main (대화 UI 리디자인 Phase 완료 시)
2. **프라이빗 레포 동기화**: 프론트엔드 코드 커밋 (myDream-private)
3. **태그 생성**: v0.2.0 (기능 릴리즈 시)

---

**최종 업데이트**: 2026-02-03
**작성자**: Claude Opus 4.5
