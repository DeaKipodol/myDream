# 프로젝트 컨벤션 및 확장 가이드

이 문서는 두 가지를 다룬다:
- **현행 컨벤션**: 지금 코드베이스가 따르는 규칙
- **확장 권고**: 규모가 커졌을 때 구조를 어떻게 발전시킬지

---

## 1. 파일별 책임 맵

현재 `core/`는 flat 구조이며, 각 파일의 역할은 다음과 같다.

### core/models.py — 도메인 모델

트리 대화 구조의 데이터 표현을 담당한다.

| 클래스 | 역할 |
|--------|------|
| `Node` | 대화 1턴(질문+응답). `id`, `parent_id`, `user_question`, `ai_answer` 보유 |
| `Tree` | 노드 컬렉션 관리. 노드 추가, 조회, 자식/루트 탐색 |

- **하는 일**: 데이터 생성, 트리 탐색, 노드 간 관계 질의
- **하지 않는 일**: 상태 변경 판단, 비즈니스 규칙 적용, I/O

### core/store.py — 상태 관리

애플리케이션의 전체 상태를 소유하고 변경한다.

| 클래스 | 역할 |
|--------|------|
| `Store` | `Tree` + `active_path_ids` + `checkpoints`를 소유. 경로 전환, 체크포인트 저장/로드 |

- **하는 일**: 상태 읽기/쓰기, 경로 재계산, 체크포인트 CRUD
- **하지 않는 일**: AI 호출, 사용자 입력 처리, 유효성 검증 로직

### core/conversation.py — 서비스 (비즈니스 로직 진입점)

`Store`를 감싸서 "1턴 = 1노드" 의미론을 제공한다.

| 클래스 | 역할 |
|--------|------|
| `ConversationManager` | 대화 턴 실행(`turn()`), 히스토리 조회, AI 호출 조율 |

- **하는 일**: 턴 실행 흐름 조율 (질문→AI호출→노드생성→경로갱신)
- **하지 않는 일**: 직접 상태 변경 (Store에 위임), 트리 구조 조작

### core/checkpoint.py — 체크포인트 검증 유틸리티

체크포인트 이름 유효성 검증과 목록 조회를 담당하는 순수 함수 모음.

- **하는 일**: 이름 규칙 검증 (`validate_checkpoint_name`), 목록 포매팅
- **하지 않는 일**: 체크포인트 저장/로드 (Store 담당), 상태 변경

### core/path_utils.py — 경로 유틸리티

경로 비교, 분기 감지 등 트리 경로 관련 순수 함수 모음.

- **하는 일**: LCA(최소 공통 조상) 계산, 형제 노드 탐색, 경로 비교
- **하지 않는 일**: 경로 전환 실행 (Store 담당), 상태 변경

### core/ai_client.py — 외부 AI API 연동

OpenAI API 호출을 캡슐화한다.

- **하는 일**: API 키 로드, 메시지 구성, API 호출, 응답 추출
- **하지 않는 일**: 대화 흐름 관리, 노드 생성, 상태 변경

### core/errors.py — 에러 코드

`ErrorCode` enum으로 도메인별 에러 코드를 정의한다.

### core/exceptions.py — 커스텀 예외

`AppError` 기반 예외 계층. 각 예외가 `error_code`를 보유한다.

---

### 호출 흐름 요약

```
사용자 입력
  ↓
cli/cli.py (cmd_* 핸들러)
  ↓ 호출
core/conversation.py (ConversationManager)
  ↓ 위임                    ↓ 호출
core/store.py (Store)     core/ai_client.py
  ↓ 사용
core/models.py (Tree, Node)

보조:
  core/checkpoint.py ← Store, CLI에서 검증용으로 호출
  core/path_utils.py ← Store, CLI에서 경로 분석용으로 호출
  core/errors.py     ← exceptions.py에서 참조
  core/exceptions.py ← 향후 전 계층에서 사용
```

---

## 2. 계층 규칙

- **서비스(`ConversationManager`)**: `Store`를 통해서만 상태에 접근한다.
- **상태 관리(`Store`)**: Tree, active_path, checkpoints를 소유한다.
- **유틸리티(`checkpoint.py`, `path_utils.py`)**: 순수 함수로 유지한다. 부수효과 없음.
- **CLI**: 서비스만 호출한다. `Store` 직접 접근은 읽기 전용만 허용한다.
- **core는 cli에 의존하지 않는다.**

---

## 3. 반환 타입 (DTO) 규칙

| 용도 | 반환 타입 | 예시 |
|------|-----------|------|
| 단일 엔티티 조회 | `Node` 또는 `Optional[Node]` | `store.tree.get_node(id)` |
| 성공/실패 (단순) | `bool` | `store.switch_to(node_id)` |
| 성공/실패 (사유 포함) | `tuple[bool, Optional[str]]` | `validate_checkpoint_name()` |
| 목록 조회 | `List[Node]` 또는 `List[dict]` | `list_checkpoints()` |

향후 API 계층 추가 시 `dataclass` 기반 DTO를 사용한다.

---

## 4. 에러 처리

### 에러 코드 (`core/errors.py`)

| 코드 | 의미 |
|------|------|
| `NODE_001` | 노드를 찾을 수 없음 |
| `NODE_002` | 유효하지 않은 부모 노드 |
| `CP_001` | 유효하지 않은 체크포인트 이름 |
| `CP_002` | 체크포인트를 찾을 수 없음 |
| `CP_003` | 중복된 체크포인트 이름 |
| `PATH_001` | 경로 전환 실패 |
| `AI_001` | AI API 호출 오류 |
| `AI_002` | API 키 누락 |

### 예외 클래스 (`core/exceptions.py`)

```
AppError (base) — error_code 속성 보유
├── NodeError
│   ├── NodeNotFoundError
│   └── NodeValidationError
├── CheckpointError
│   ├── CheckpointNotFoundError
│   └── CheckpointNameError
├── PathError
│   └── PathSwitchError
└── AIClientError
    ├── AIKeyMissingError
    └── AIResponseError
```

현행은 `ValueError` + `bool` 반환. 커스텀 예외 전환은 별도 작업.

---

## 5. 네이밍 컨벤션

PEP 8 기반. 프로젝트 고유 패턴:

| 대상 | 규칙 | 예시 |
|------|------|------|
| 클래스 | PascalCase | `ConversationManager`, `Node` |
| 함수/변수 | snake_case | `get_node`, `active_path_ids` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_MODEL` |
| private | `_` prefix | `_build_path` |
| CLI 핸들러 | `cmd_*` | `cmd_ask`, `cmd_switch` |
| getter | `get_*` | `get_node`, `get_children` |
| validator | `validate_*` | `validate_checkpoint_name` |

---

## 6. 패키지 구조

```
core/           # 비즈니스 로직 (CLI 무관)
cli/            # 사용자 인터페이스
tests/          # 테스트
docs/           # 문서
```

### 신규 파일 추가 기준

- **순수 데이터/로직**: `core/`에 추가
- **CLI 표시/입력**: `cli/`에 추가
- **설정/상수**: `core/`에 추가
- **테스트**: `tests/`에 `test_<모듈명>.py`로 추가

---

## 7. 로깅

현재 `print` 직접 사용. 향후 `logging` 도입 시:

- core: `logging` 사용
- CLI: `print` 허용 (사용자 출력)
- 로그 레벨: DEBUG(개발), INFO(주요 동작), WARNING(복구 가능), ERROR(실패)

---

## 8. 확장 권고 — 규모가 커졌을 때

현재 `core/`는 파일 8개의 flat 구조로, 이 규모에서는 적절하다.
아래는 **파일이 15개 이상으로 늘어나거나, 각 영역에 파일이 3개 이상 될 때** 적용할 구조 권고안이다.

### 권고 폴더 구조

```
core/
├── models/              # 도메인 모델 (Node, Tree + 신규 모델)
│   ├── __init__.py
│   ├── node.py
│   └── tree.py
├── services/            # 비즈니스 로직
│   ├── __init__.py
│   ├── conversation_service.py
│   ├── checkpoint_service.py
│   └── ai_service.py
├── store/               # 상태 관리
│   ├── __init__.py
│   └── store.py
├── dto/                 # 계층 간 반환 타입
│   ├── __init__.py
│   └── responses.py
├── exceptions/          # 에러 코드 + 예외
│   ├── __init__.py
│   ├── error_codes.py
│   └── exceptions.py
├── utils/               # 순수 유틸리티
│   ├── __init__.py
│   └── path_utils.py
└── validators/          # 입력 검증
    ├── __init__.py
    └── checkpoint_validator.py
```

### 전환 기준

| 조건 | 조치 |
|------|------|
| 모델 클래스가 3개 이상 | `core/models/` 폴더 분리 |
| 서비스 역할 파일이 3개 이상 | `core/services/` 폴더 분리 |
| 유틸리티 파일이 3개 이상 | `core/utils/` 폴더 분리 |
| API/웹 계층 추가 | `core/dto/` 폴더 신설, `dataclass` DTO 사용 |
| `ValueError` 제거 완료 | `core/exceptions/` 폴더로 통합 |

### 전환 시 주의사항

- `__init__.py`에서 주요 클래스를 re-export하여 import 경로를 유지한다
  - 예: `from core.models import Node, Tree` 가 계속 동작하도록
- 테스트의 import 경로를 일괄 수정한다
- 한 영역씩 점진적으로 전환한다 (한번에 전부 옮기지 않는다)
