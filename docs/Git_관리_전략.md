# Git 관리 전략

## 1. 커밋 vs PR 구분 기준

### 커밋 (Commit)
- **즉시 커밋 대상**: 단일 기능/버그 수정 완료 시
- **커밋 단위**: 1개의 논리적 변경사항 = 1개의 커밋
- **예시**:
  - 단일 버그 수정
  - 단일 기능 추가
  - 단일 문서 작성/수정
  - 테스트 코드 추가
  - 리팩토링

### PR (Pull Request)
- **PR 생성 대상**: 여러 커밋을 포함하는 큰 작업 단위
- **PR 단위**: 1개의 완결된 기능 또는 Phase
- **예시**:
  - 새로운 Phase 완료 (여러 커밋 포함)
  - 대규모 리팩토링 (여러 커밋 포함)
  - 여러 관련 기능을 묶은 릴리즈

### 원칙
- 작은 변경도 커밋은 자주 한다
- PR은 완결된 기능 단위로 묶어서 만든다
- main 브랜치에 직접 커밋하지 않고 feature 브랜치를 사용한다

---

## 2. 커밋 메시지 전략

### Conventional Commits 규칙 사용

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type 분류
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 변경 (코드 변경 없음)
- `style`: 코드 포맷팅, 세미콜론 누락 등 (로직 변경 없음)
- `refactor`: 코드 리팩토링 (기능 변경 없음)
- `test`: 테스트 코드 추가/수정
- `chore`: 빌드 프로세스, 도구 설정 등
- `perf`: 성능 개선
- `ci`: CI 설정 변경
- `revert`: 이전 커밋 되돌리기

### Scope 예시
- `core`: 핵심 비즈니스 로직 (models, store, conversation 등)
- `cli`: CLI 인터페이스
- `test`: 테스트 관련
- `docs`: 문서
- `config`: 설정 파일

### Subject 작성 규칙
- 50자 이내로 간결하게
- 명령형으로 작성 ("추가했음" ✗ → "추가" ✓)
- 마침표 없이 작성
- 한글로 작성 (팀 컨벤션)

### 예시
```bash
feat(core): 체크포인트 자동 생성 기능 추가
fix(cli): 노드 전환 시 경로 계산 오류 수정
docs: Git 관리 전략 문서 작성
refactor(core): Store 클래스 메서드 분리
test(core): ConversationManager 테스트 케이스 추가
```

### Co-Authored-By 규칙
- AI와 협업한 커밋에는 Co-Authored-By 추가:
```
feat(core): 새 기능 추가

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## 3. 브랜치 전략

### 브랜치 구조

```
main (공개 레포지토리 메인 브랜치)
├── develop (개발 통합 브랜치)
│   ├── feature/기능명 (기능 개발 브랜치)
│   ├── fix/버그명 (버그 수정 브랜치)
│   └── docs/문서명 (문서 작업 브랜치)
└── release/버전 (릴리즈 준비 브랜치)
```

### 브랜치 종류

1. **main**: 안정적인 공개 버전
   - 직접 커밋 금지
   - release 브랜치에서만 병합
   - 태그로 버전 관리

2. **develop**: 개발 통합 브랜치
   - feature 브랜치들이 병합되는 곳
   - 기능 완성 후 테스트 완료된 코드만 병합

3. **feature/**: 기능 개발 브랜치
   - naming: `feature/기능명`
   - 예: `feature/checkpoint-auto-create`
   - develop에서 분기, develop으로 병합

4. **fix/**: 버그 수정 브랜치
   - naming: `fix/버그명`
   - 예: `fix/path-calculation-error`
   - develop에서 분기, develop으로 병합

5. **docs/**: 문서 작업 브랜치
   - naming: `docs/문서명`
   - 예: `docs/git-strategy`
   - develop에서 분기, develop으로 병합

6. **release/**: 릴리즈 준비 브랜치
   - naming: `release/v버전`
   - 예: `release/v1.0.0`
   - develop에서 분기, main으로 병합

### 브랜치 생성 및 작업 플로우

```bash
# 1. feature 브랜치 생성 및 작업
git checkout develop
git pull origin develop
git checkout -b feature/새기능

# 작업 및 커밋
git add .
git commit -m "feat(core): 새 기능 추가"

# 2. 원격에 푸시
git push -u origin feature/새기능

# 3. PR 생성 (GitHub에서)
# develop <- feature/새기능

# 4. 리뷰 후 병합
# 병합 후 로컬 브랜치 정리
git checkout develop
git pull origin develop
git branch -d feature/새기능
```

### Hotfix 플로우 (긴급 버그 수정)
```bash
# main에서 직접 분기
git checkout main
git checkout -b hotfix/긴급버그

# 수정 및 커밋
git commit -m "fix: 긴급 버그 수정"

# main과 develop 양쪽에 병합
git checkout main
git merge hotfix/긴급버그
git checkout develop
git merge hotfix/긴급버그
```

---

## 4. .gitignore 규칙

### 현재 .gitignore에 추가할 항목

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
*.so
.Python

# 환경 변수
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# 테스트
.pytest_cache/
.coverage
htmlcov/
.tox/

# 프라이빗 폴더 (공개 레포지토리에서 제외)
What_I_wanted/
ai-thinking-workspace */
docs/_3_현재작업폴더/
docs/_4_이전작업폴더/
docs/특허/
docs/현재작업폴더/
.claude/

# 임시 파일
*.tmp
*.log
*.bak
.DS_Store

# 빌드 결과물
dist/
build/
*.egg-info/
```

---

## 5. 프라이빗/공개 레포지토리 분류 기준

### 🔒 프라이빗 레포지토리에만 포함할 내용

#### 1. 사업 계획 및 전략 문서
- `What_I_wanted/` - 비전, 미션, 마케팅 전략
- `docs/특허/` - 특허 명세서, 특허 관련 문서

#### 2. 내부 작업 과정 문서
- `docs/_3_현재작업폴더/` - 현재 진행 중인 PM, 아키텍처 작업
- `docs/_4_이전작업폴더/` - 이전 Phase 작업 기록
- `docs/현재작업폴더/` - 현재 작업 임시 폴더
- `ai-thinking-workspace */` - AI 사고 과정 기록

#### 3. 민감 정보
- `.env` - API 키 등 환경 변수
- `.claude/` - Claude 설정 (개인 워크플로우)

#### 4. 개인 메모 및 실험
- 프롬프트 실험 기록
- 개인적인 아이디어 노트

### 🌐 공개 레포지토리에 포함할 내용

#### 1. 소스 코드
- `core/` - 핵심 비즈니스 로직
- `cli/` - CLI 인터페이스
- `tests/` - 테스트 코드

#### 2. 공개 문서
- `README.md` - 프로젝트 소개
- `CLAUDE.md` - Claude Code 가이드
- `LICENSE` - 라이선스
- `requirements.txt` - 의존성 목록
- `docs/ADDITIONAL_REQUIREMENTS.md` - 추가 요구사항
- `docs/_1_공통문서/` - 공개 가능한 공통 문서
- `docs/_2_기능명세/` - 기능 명세서

#### 3. 개발 도구 설정
- `.gitignore`
- `pytest.ini`
- CI/CD 설정 파일

---

## 6. 레포지토리 운영 방법

### 방법 A: 두 개의 독립적인 레포지토리 (권장)

```
myDream-public/          (공개 레포지토리)
├── core/
├── cli/
├── tests/
├── README.md
└── docs/
    ├── _1_공통문서/
    └── _2_기능명세/

myDream-private/         (프라이빗 레포지토리)
├── core/               (심볼릭 링크 or 서브모듈)
├── cli/                (심볼릭 링크 or 서브모듈)
├── tests/              (심볼릭 링크 or 서브모듈)
├── What_I_wanted/
├── ai-thinking-workspace/
└── docs/
    ├── _3_현재작업폴더/
    ├── _4_이전작업폴더/
    └── 특허/
```

**장점**:
- 민감 정보 노출 위험 없음
- 각 레포지토리의 목적이 명확
- 관리가 간단

**단점**:
- 코드 동기화 필요
- 두 레포지토리를 따로 관리해야 함

### 방법 B: 단일 레포지토리 + .gitignore 활용

```
myDream/
├── core/                     (공개)
├── cli/                      (공개)
├── tests/                    (공개)
├── What_I_wanted/           (프라이빗 - .gitignore)
├── ai-thinking-workspace/   (프라이빗 - .gitignore)
└── docs/
    ├── _1_공통문서/         (공개)
    ├── _2_기능명세/         (공개)
    ├── _3_현재작업폴더/     (프라이빗 - .gitignore)
    └── 특허/                (프라이빗 - .gitignore)
```

**장점**:
- 하나의 워크스페이스에서 모든 작업 가능
- 코드와 문서가 항상 동기화됨

**단점**:
- .gitignore 실수로 민감 정보 노출 위험
- 레포지토리 목적이 혼재됨

### 권장: 방법 A (두 개의 독립 레포지토리)

1. **현재 레포지토리 (공개)**: 코드 + 공개 문서
2. **새 프라이빗 레포지토리**: 사업 계획 + 내부 작업 문서

---

## 7. 현재 상태 분석 및 정리 계획

### 현재 Git 상태
- **삭제된 파일 (D)**: 53개 - 주로 이전 PM 관리 문서들
- **Untracked 파일 (??)**:
  - `.claude/` - Claude 설정
  - `What_I_wanted/` - 비전, 사업 계획
  - `ai-thinking-workspace /` - AI 작업 기록
  - `docs/_2_기능명세/` - 기능 명세 (공개 가능)
  - `docs/_3_현재작업폴더/` - 현재 작업 (프라이빗)
  - `docs/_4_이전작업폴더/` - 이전 작업 (프라이빗)
  - `docs/온보딩_가이드.md` - 공개 가능
  - `docs/특허/` - 프라이빗
  - `docs/현재작업폴더/` - 프라이빗

### 정리 방향
1. 삭제된 파일들은 이미 _4_이전작업폴더로 이동됨 → 삭제 확정
2. Untracked 파일 중:
   - **공개 가능**: `docs/_2_기능명세/`, `docs/온보딩_가이드.md`
   - **프라이빗 전용**: 나머지 모두

---

## 8. Git Hook 활용 (선택사항)

### pre-commit hook
- 커밋 전 자동 검사
- 테스트 실패 시 커밋 차단
- 코드 포맷팅 자동 실행

```bash
#!/bin/sh
# .git/hooks/pre-commit

# 테스트 실행
pytest
if [ $? -ne 0 ]; then
    echo "테스트 실패! 커밋을 중단합니다."
    exit 1
fi

# 코드 포맷팅 (black 사용 시)
# black core/ cli/ tests/
```

---

## 참고 자료
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
