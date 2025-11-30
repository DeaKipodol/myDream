# Phase CLI-1: 순수 로직 구현 (LLM 없이) - 개발지시서 v2.0

- 발행일: 2025-11-05 (v1.0) → **2025-11-09 (v2.0)**
- PM: 프로젝트 매니저 (일정 탐정)
- Phase: CLI-1
- 상태: **v2.0 발행**
- 예상 소요: 10-14일
- 담당자: 기술 개발자

---

## ⚠️ v2.0 주요 변경사항

| 항목 | v1.0 (11/05) | v2.0 (11/09) | 변경 사유 |
|------|-------------|-------------|----------|
| **Node 구조** | `role` + `content` | `user_question` + `ai_answer` | 노드생성논의 최종 결정 |
| **노드 생성** | 수동 (`create_node`) | 자동 (`ask` 시 생성) | 노드생성논의 최종 결정 |
| **LCA 알고리즘** | 필수 구현 | ❌ 제거 (CLI-3로 연기) | Option C 채택 |
| **경로 전환** | LCA 기반 | 단순 역추적 | 복잡도 75% 감소 |
| **체크포인트** | "저장" 개념 | "이름표" 개념 | 노드생성논의 최종 결정 |
| **Store 클래스** | 없음 | 추가 (필수) | 아키텍처 팀 권고 |
| **shelves** | 별도 버퍼 관리 | 제거 (트리에 자동 보존) | 단순화 |

---

## 📚 참조 문서 (필수 확인)

### 노드 구조 결정
| 문서 | 위치 | 핵심 내용 | 참조 라인 |
|------|------|----------|----------|
| 노드생성논의_1_논리전개.md | `docs/공통문서/` | 1턴=1노드 최종 결정 | Lines 126-133 |
| 노드생성논의_2_핵심이슈.md | `docs/공통문서/` | 자동 생성, 버퍼 제거 | Lines 91-121 |
| 노드생성논의_3_개념기술정리.md | `docs/공통문서/` | /save=이름표, /goto=이동 | Lines 456-474 |

### LCA 결정
| 문서 | 위치 | 핵심 내용 | 참조 라인 |
|------|------|----------|----------|
| LCA_의사결정_가이드.md | `docs/PM_관리/PM_보고서/` | Option C 채택 | Lines 638-687 |
| 아키텍처_팀_의견서.md | `docs/아키텍처설계/설계완료보고/` | Option C 승인 | 전체 |

### 아키텍처 검토
| 문서 | 위치 | 핵심 내용 | 참조 라인 |
|------|------|----------|----------|
| 아키텍처_검토서_CLI-1.md | `docs/아키텍처설계/설계완료보고/` | Store 클래스 필수 | Lines 389-423 |

---

## 1. Phase 목표

트리 구조 대화 시스템의 핵심 알고리즘(트리 자료구조, **단순 경로 전환**, 체크포인트)을 Python CLI로 구현하고, LLM 없이 명령어만으로 모든 기능이 완벽히 동작하는지 검증합니다.

### 핵심 검증 항목
- ✅ 1턴 = 1노드 자동 생성
- ✅ 트리 구조 정상 동작
- ✅ 경로 전환 (단순 역추적)
- ✅ 체크포인트 (이름표) 기능
- ❌ LCA 알고리즘 (CLI-3로 연기)
- ❌ 병합 기능 (CLI-3로 연기)

---

## 2. 핵심 작업 (5개 모듈)

### 2.1 트리 자료구조 (`core/models.py`)

**목표**: 대화 노드를 트리 구조로 관리

**Node 클래스** (노드생성논의_3 기반):

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict
from uuid import uuid4

@dataclass
class Node:
    """
    대화 노드 (1턴 = 1노드)

    v2.0 핵심 변경:
    - role + content → user_question + ai_answer
    - 연속 user 노드 문제 원천 차단
    - 의미적 완결성 (1노드 = 1대화턴)
    """
    id: str
    parent_id: Optional[str]
    user_question: str          # 사용자 질문
    ai_answer: str              # AI 응답
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict = field(default_factory=dict)  # 체크포인트 이름 등


def create_node(
    parent_id: Optional[str],
    user_question: str,
    ai_answer: str,
    metadata: Optional[Dict] = None
) -> Node:
    """새 노드 생성 (내부 함수, 직접 호출 금지)"""
    return Node(
        id=str(uuid4()),
        parent_id=parent_id,
        user_question=user_question,
        ai_answer=ai_answer,
        metadata=metadata or {}
    )
```

**구현 요구사항**:
- [ ] Node 클래스 정의 (dataclass 사용)
- [ ] create_node 함수 (ID 자동 생성)
- [ ] 순환 참조 방지 검증

---

### 2.2 Tree 클래스 (`core/models.py`)

**목표**: 트리 로직을 별도 클래스로 분리 (단일 책임 원칙)

> ✅ **기술총괄 Option A 채택**: Tree 객체 분리 방식

```python
from typing import Dict, List, Optional
from datetime import datetime

class Tree:
    """대화 트리

    특징:
    - 노드는 즉시 추가되며 삭제되지 않음
    - 모든 분기 자동 보존
    """
    def __init__(self, root_id: str = 'root'):
        self.root_id = root_id
        self.nodes: Dict[str, Node] = {}

        # 루트 노드 생성
        self.nodes[root_id] = Node(
            id=root_id,
            parent_id=None,
            user_question="[시스템]",
            ai_answer="대화를 시작합니다",
            metadata={"type": "root"}
        )

    def add_node(self, node: Node) -> bool:
        """노드 추가 (검증 포함)"""
        if node.parent_id and node.parent_id not in self.nodes:
            raise ValueError(f"부모 노드 {node.parent_id}가 존재하지 않습니다")

        if node.id in self.nodes:
            raise ValueError(f"노드 {node.id}가 이미 존재합니다")

        self.nodes[node.id] = node
        return True

    def get_path_to_root(self, node_id: str) -> List[str]:
        """루트 → node_id 경로 반환 (단순 역추적)"""
        path = []
        current_id = node_id

        while current_id is not None:
            node = self.nodes.get(current_id)
            if not node:
                raise ValueError(f"노드 {current_id}를 찾을 수 없습니다")

            path.insert(0, node.id)
            current_id = node.parent_id

        return path

    def get_children(self, node_id: str) -> List[Node]:
        """자식 노드 목록"""
        return [
            node for node in self.nodes.values()
            if node.parent_id == node_id
        ]
```

---

### 2.3 상태 관리 (`core/store.py`)

**목표**: 전역 상태를 Store 클래스로 캡슐화

> ✅ **아키텍처 팀 필수 권고사항 + 기술총괄 Option A**

```python
from typing import Dict, List
from core.models import Tree

class Store:
    """
    전역 상태 컨테이너

    기술총괄 Option A 반영:
    - Tree 객체 분리 (단일 책임 원칙)
    - active_path_ids로 경로 전체 추적 (O(1) 조회)
    - 웹 전환 시 리팩토링 0줄
    """
    def __init__(self):
        self.tree: Tree = Tree(root_id='root')
        self.active_path_ids: List[str] = ['root']
        self.checkpoints: Dict[str, str] = {}  # {name: node_id}

    def reset(self):
        """테스트용 초기화"""
        self.tree = Tree(root_id='root')
        self.active_path_ids = ['root']
        self.checkpoints.clear()

    def get_current_node_id(self) -> str:
        """현재 활성 경로의 마지막 노드"""
        return self.active_path_ids[-1]

# 전역 인스턴스
store = Store()
```

**구현 요구사항**:
- [ ] Tree 클래스 필수 구현 (트리 로직 담당)
- [ ] Store 클래스 필수 구현 (상태 컨테이너)
- [ ] 모든 상태 접근은 `store.xxx`를 통해서만
- [ ] reset() 메서드로 테스트 간 격리

---

### 2.4 자동 노드 생성 (`core/conversation.py`)

**목표**: 매 대화 턴마다 자동으로 노드 생성

> ✅ **노드생성논의 핵심 결정**: 모든 턴은 자동으로 노드 생성

```python
from core.store import store
from core.models import Node, create_node

def handle_conversation_turn(user_input: str) -> Node:
    """
    대화 턴 처리 및 자동 노드 생성

    노드생성논의 최종 결정:
    - 버퍼 없음 (즉시 노드 생성)
    - /save는 "저장"이 아니라 "이름표 붙이기"

    알고리즘:
    1. 현재 노드 ID 확인 (parent가 됨)
    2. AI 응답 생성 (Phase CLI-1에서는 더미)
    3. 새 노드 생성
    4. 트리에 추가
    5. active_path_ids 업데이트
    """
    # 1. 부모 노드 확인 (active_path_ids의 마지막)
    parent_id = store.get_current_node_id()

    # 2. AI 응답 생성 (Phase CLI-1: 더미)
    ai_response = generate_dummy_response(user_input)

    # 3. 새 노드 생성
    new_node = create_node(
        parent_id=parent_id,
        user_question=user_input,
        ai_answer=ai_response
    )

    # 4. 트리에 추가
    store.tree.add_node(new_node)

    # 5. active_path_ids에 새 노드 추가
    store.active_path_ids.append(new_node.id)

    return new_node


def generate_dummy_response(user_input: str) -> str:
    """더미 AI 응답 생성 (Phase CLI-1 전용)"""
    return f"[더미 응답] '{user_input}'에 대한 AI 답변입니다."
```

**구현 요구사항**:
- [ ] handle_conversation_turn 함수 구현
- [ ] 더미 응답 생성기
- [ ] Phase CLI-2에서 실제 LLM으로 교체 가능한 구조

---

### 2.5 경로 전환 (`core/path_utils.py`)

**목표**: 단순 역추적으로 활성 경로 계산

> ⚠️ **v2.0 변경**: LCA 없음, 단순 parent_id 역추적

```python
from typing import List
from core.store import store
from core.models import Node

def get_context_path(target_node_id: str) -> List[Node]:
    """
    루트에서 target_node_id까지의 경로 반환

    알고리즘 (단순 역추적):
    1. target_node_id에서 시작
    2. parent_id를 따라 루트까지 올라감
    3. 경로 반전 (루트가 인덱스 0)

    시간 복잡도: O(h), h = 트리 높이
    """
    path = []
    current_id = target_node_id

    while current_id is not None:
        node = store.tree.nodes.get(current_id)
        if node is None:
            raise ValueError(f"Node not found: {current_id}")
        path.append(node)
        current_id = node.parent_id

    return list(reversed(path))


def goto_node(target_node_id: str) -> List[Node]:
    """
    경로 전환 (goto 명령어용)

    알고리즘:
    1. 대상 노드 존재 확인
    2. active_path_ids 업데이트 (Tree.get_path_to_root 활용)
    3. 새 경로 반환

    다음 대화는 target_node_id의 자식으로 분기됨
    """
    if target_node_id not in store.tree.nodes:
        raise ValueError(f"Node not found: {target_node_id}")

    # active_path_ids 갱신 (Tree 메서드 활용)
    store.active_path_ids = store.tree.get_path_to_root(target_node_id)
    return get_context_path(target_node_id)


def get_context_for_llm(target_node_id: str) -> List[dict]:
    """
    LLM API 호출용 컨텍스트 생성 (Phase CLI-2 대비)

    Node(user_question, ai_answer) → ChatGPT API 형식 변환
    """
    path = get_context_path(target_node_id)
    messages = []

    for node in path:
        messages.append({"role": "user", "content": node.user_question})
        messages.append({"role": "assistant", "content": node.ai_answer})

    return messages
```

**구현 요구사항**:
- [ ] get_context_path (단순 역추적)
- [ ] goto_node (경로 전환)
- [ ] get_context_for_llm (CLI-2 대비)
- [ ] 단위 테스트 5개 이상

---

### 2.6 체크포인트 - 이름표 시스템 (`core/checkpoint.py`)

**목표**: 특정 노드에 이름표 붙이기

> ⚠️ **v2.0 의미 변경**: "저장" → "이름표 붙이기"

```python
from core.store import store
from core.path_utils import goto_node

def save_checkpoint(name: str) -> bool:
    """
    현재 노드에 이름표 붙이기

    노드생성논의 최종 결정:
    - 노드는 이미 자동 생성되어 있음
    - /save는 단순히 이름 → node_id 매핑
    - "저장"이 아니라 "이름표 붙이기"
    """
    current_id = store.get_current_node_id()
    if not store.active_path_ids:
        print("❌ 현재 노드가 없습니다. 먼저 대화를 시작하세요.")
        return False

    store.checkpoints[name] = current_id
    print(f"✅ '{name}' 이름표를 현재 노드에 붙였습니다.")
    return True


def goto_checkpoint(name: str) -> bool:
    """
    이름표로 경로 전환

    알고리즘:
    1. checkpoints에서 node_id 조회
    2. goto_node 호출
    """
    if name not in store.checkpoints:
        print(f"❌ '{name}' 이름표를 찾을 수 없습니다.")
        return False

    target_id = store.checkpoints[name]
    goto_node(target_id)
    print(f"✅ '{name}' 위치로 이동했습니다.")
    return True


def list_checkpoints() -> dict:
    """이름표 목록 반환"""
    return store.checkpoints.copy()
```

**구현 요구사항**:
- [ ] save_checkpoint (이름표 붙이기)
- [ ] goto_checkpoint (이름표로 이동)
- [ ] list_checkpoints (목록 조회)
- [ ] 단위 테스트 5개 이상

---

## 3. CLI 명령어 (`cli/commands.py`)

### 명령어 목록 (v2.0)

```bash
# 대화 (자동 노드 생성)
> ask <질문>
  예: ask "취업 준비가 걱정돼요"
  설명: AI에게 질문 → 자동으로 새 노드 생성

# 트리 확인
> tree
  설명: 트리 구조 ASCII 아트로 출력

> path
  설명: 현재 활성 경로 출력

> context
  설명: 현재 경로의 대화 내용 출력

# 경로 이동
> goto <node_id 또는 이름표>
  예: goto abc123
  예: goto "취업고민시작"
  설명: 해당 노드로 이동 (다음 대화는 여기서 분기)

# 이름표 (체크포인트)
> save <이름>
  예: save "취업고민시작"
  설명: 현재 노드에 이름표 붙이기 (저장 아님!)

> checkpoints
  설명: 이름표 목록 출력

# 분기 확인
> branches
  설명: 트리의 모든 분기점 표시

# 유틸리티
> help
> exit
```

### v2.0 변경 요약

| v1.0 명령어 | v2.0 명령어 | 변경 사유 |
|------------|------------|----------|
| `create_node` | ❌ 삭제 | 자동 생성으로 대체 |
| `switch_path` | `goto` | 단순화 |
| `create_checkpoint` | `save` | 의미 변경 (이름표) |
| `restore_checkpoint` | `goto` | 통합 |
| `show_tree` | `tree` | 단축 |
| `show_active_path` | `path` | 단축 |
| `show_context` | `context` | 단축 |
| `show_shelves` | `branches` | 개념 변경 |

---

## 4. 사용자 시나리오

### 시나리오 1: 기본 대화 흐름

```bash
$ python cli/main.py

AI 고민상담 트리 시스템 v2.0
> help
사용 가능한 명령어: ask, tree, path, context, goto, save, checkpoints, branches, help, exit

> ask "취업 준비가 너무 막막해요"
[더미 응답] '취업 준비가 너무 막막해요'에 대한 AI 답변입니다.
✅ 노드 생성됨: node_abc123

> ask "이력서는 어떻게 써야 하나요?"
[더미 응답] '이력서는 어떻게 써야 하나요?'에 대한 AI 답변입니다.
✅ 노드 생성됨: node_def456

> tree
📂 대화 트리
└── node_abc123: "취업 준비가 너무 막막해요"
    └── node_def456: "이력서는 어떻게 써야 하나요?" ← 현재

> path
현재 경로: node_abc123 → node_def456
```

### 시나리오 2: 분기 생성

```bash
# 이전 시나리오 이어서...

> save "이력서질문"
✅ '이력서질문' 이름표를 현재 노드에 붙였습니다.

> goto node_abc123
✅ node_abc123 위치로 이동했습니다.

> ask "면접은 어떻게 준비하나요?"
[더미 응답] '면접은 어떻게 준비하나요?'에 대한 AI 답변입니다.
✅ 노드 생성됨: node_ghi789

> tree
📂 대화 트리
└── node_abc123: "취업 준비가 너무 막막해요"
    ├── node_def456: "이력서는 어떻게 써야 하나요?" [이력서질문]
    └── node_ghi789: "면접은 어떻게 준비하나요?" ← 현재

# 분기 생성됨! abc123에서 두 개의 자식 노드
```

### 시나리오 3: 이름표로 이동

```bash
# 이전 시나리오 이어서...

> checkpoints
이름표 목록:
- "이력서질문" → node_def456

> goto "이력서질문"
✅ '이력서질문' 위치로 이동했습니다.

> path
현재 경로: node_abc123 → node_def456

> ask "자기소개서도 알려주세요"
[더미 응답] '자기소개서도 알려주세요'에 대한 AI 답변입니다.
✅ 노드 생성됨: node_jkl012

> tree
📂 대화 트리
└── node_abc123: "취업 준비가 너무 막막해요"
    ├── node_def456: "이력서는 어떻게 써야 하나요?" [이력서질문]
    │   └── node_jkl012: "자기소개서도 알려주세요" ← 현재
    └── node_ghi789: "면접은 어떻게 준비하나요?"
```

### 시나리오 4: 분기 탐색

```bash
> branches
📊 분기점 목록:
1. node_abc123 (2개 분기)
   ├── → node_def456 (이력서 경로)
   └── → node_ghi789 (면접 경로)

> goto node_ghi789
✅ node_ghi789 위치로 이동했습니다.

> context
=== 현재 대화 컨텍스트 ===
[User] 취업 준비가 너무 막막해요
[AI] [더미 응답] '취업 준비가 너무 막막해요'에 대한 AI 답변입니다.

[User] 면접은 어떻게 준비하나요?
[AI] [더미 응답] '면접은 어떻게 준비하나요?'에 대한 AI 답변입니다.
===========================
```

### 시나리오 5: 깊은 분기에서 다른 분기로 이동

```bash
# 현재: node_abc123 → node_ghi789 (면접 경로)

> ask "모의면접 연습법은?"
✅ 노드 생성됨: node_mno345

> ask "압박면접 대처법은?"
✅ 노드 생성됨: node_pqr678

> path
현재 경로: node_abc123 → node_ghi789 → node_mno345 → node_pqr678

# 이력서 경로로 이동
> goto "이력서질문"
✅ '이력서질문' 위치로 이동했습니다.

> path
현재 경로: node_abc123 → node_def456

> tree
📂 대화 트리
└── node_abc123: "취업 준비가 너무 막막해요"
    ├── node_def456: "이력서는 어떻게..." [이력서질문] ← 현재
    │   └── node_jkl012: "자기소개서도..."
    └── node_ghi789: "면접은 어떻게..."
        └── node_mno345: "모의면접 연습법은?"
            └── node_pqr678: "압박면접 대처법은?"

# 모든 분기가 보존됨! (shelves 버퍼 불필요)
```

---

## 5. 테스트 전략

### 파일 구조

```
tests/
├── test_models.py         # Node, create_node 테스트
├── test_store.py          # Store 클래스 테스트 (격리 검증)
├── test_conversation.py   # 자동 노드 생성 테스트
├── test_path_utils.py     # 경로 전환 테스트
├── test_checkpoint.py     # 이름표 테스트
└── test_scenarios.py      # 통합 시나리오 테스트
```

### 핵심 테스트 케이스

```python
# test_scenarios.py

def test_scenario_1_basic_conversation():
    """시나리오 1: 기본 대화 흐름"""
    store.reset()

    node1 = handle_conversation_turn("취업 준비가 막막해요")
    node2 = handle_conversation_turn("이력서 작성법 알려줘")

    # 루트 노드 + 2개 대화 노드 = 3개 (root 포함)
    assert len(store.tree.nodes) == 3
    assert node2.parent_id == node1.id

    path = get_context_path(node2.id)
    assert len(path) == 3  # root → node1 → node2
    assert path[1].id == node1.id
    assert path[2].id == node2.id


def test_scenario_2_branch_creation():
    """시나리오 2: 분기 생성"""
    store.reset()

    node_a = handle_conversation_turn("질문 A")
    node_b = handle_conversation_turn("질문 B")

    # A로 돌아가서 분기
    goto_node(node_a.id)
    node_c = handle_conversation_turn("질문 C")

    # A의 자식이 2개 (B와 C)
    children = store.tree.get_children(node_a.id)
    assert len(children) == 2

    # B 경로와 C 경로 모두 존재
    path_b = get_context_path(node_b.id)
    path_c = get_context_path(node_c.id)

    assert len(path_b) == 3  # root → A → B
    assert len(path_c) == 3  # root → A → C


def test_scenario_3_checkpoint():
    """시나리오 3: 이름표 사용"""
    store.reset()

    node_a = handle_conversation_turn("질문 A")
    save_checkpoint("시작점")

    node_b = handle_conversation_turn("질문 B")
    node_c = handle_conversation_turn("질문 C")

    # 이름표로 이동
    goto_checkpoint("시작점")
    assert store.get_current_node_id() == node_a.id

    # 새 분기 생성
    node_d = handle_conversation_turn("질문 D")
    assert node_d.parent_id == node_a.id
```

---

## 6. 파일 구조

```
myDream/
├── cli/                      # CLI 전용 (터미널 인터페이스)
│   ├── __init__.py
│   ├── main.py               # CLI 진입점
│   └── commands.py           # CLI 명령어 처리
│
├── core/                     # 핵심 로직 (웹 재사용 가능)
│   ├── __init__.py
│   ├── models.py             # Node 클래스
│   ├── store.py              # Store 클래스 (상태 관리)
│   ├── conversation.py       # 자동 노드 생성
│   ├── path_utils.py         # 경로 전환
│   └── checkpoint.py         # 이름표 시스템
│
├── tests/                    # 테스트
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_store.py
│   ├── test_conversation.py
│   ├── test_path_utils.py
│   ├── test_checkpoint.py
│   └── test_scenarios.py
│
├── data/                     # 데이터 저장 (Phase CLI-2 이후)
│   └── .gitkeep
│
└── docs/
    └── README_CLI.md
```

### 폴더 구조 설계 의도

| 폴더 | 목적 | 웹 재사용 |
|------|------|----------|
| `cli/` | 터미널 UI, 명령어 처리 | ❌ |
| `core/` | 핵심 비즈니스 로직 | ✅ |
| `tests/` | 단위/통합 테스트 | - |

---

## 7. 작업 우선순위

### Day 1-2: 기반 구조
- [ ] `core/models.py` - Node 클래스
- [ ] `core/store.py` - Store 클래스
- [ ] `tests/test_models.py`, `tests/test_store.py`

### Day 3-4: 핵심 로직
- [ ] `core/conversation.py` - 자동 노드 생성
- [ ] `core/path_utils.py` - 경로 전환
- [ ] `tests/test_conversation.py`, `tests/test_path_utils.py`

### Day 5-6: 체크포인트
- [ ] `core/checkpoint.py` - 이름표 시스템
- [ ] `tests/test_checkpoint.py`

### Day 7-10: CLI 구현
- [ ] `cli/commands.py` - 명령어 처리
- [ ] `cli/main.py` - REPL 메인
- [ ] 트리 시각화 (ASCII 아트)

### Day 11-14: 통합 및 마무리
- [ ] `tests/test_scenarios.py` - 시나리오 테스트
- [ ] 버그 수정
- [ ] `README_CLI.md` 문서화
- [ ] PM 검토

---

## 8. 완료 기준 (Definition of Done)

### 필수 조건
- [ ] Node 구조: `user_question` + `ai_answer`
- [ ] Store 클래스 사용 (전역 변수 금지)
- [ ] 자동 노드 생성 (`ask` 명령어)
- [ ] 경로 전환: 단순 역추적 (LCA 없음)
- [ ] 이름표 시스템 (`save`, `goto`)
- [ ] 5개 사용자 시나리오 모두 동작

### 검증 방법
```bash
$ pytest tests/ -v --cov=core --cov=cli --cov-report=term-missing
```
- 모든 테스트 통과
- 커버리지 80% 이상

---

## 9. 제외된 항목 (Phase CLI-3로 연기)

| 항목 | 연기 Phase | 사유 |
|------|-----------|------|
| LCA 알고리즘 | CLI-3 | Option C 채택 |
| 병합 기능 (`/merge`) | CLI-3 | LCA 필요 |
| shelves 자동 관리 | CLI-3 | 현재는 트리에 자동 보존 |
| JSON 파일 저장 | CLI-2 | 핵심 로직 우선 |
| 실제 LLM 연동 | CLI-2 | 핵심 로직 우선 |

---

## 10. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2025-11-05 | 초판 발행 |
| v2.0 | 2025-11-09 | 전면 개정 |

### v2.0 변경 상세

1. **Node 구조**: `role` + `content` → `user_question` + `ai_answer`
2. **노드 생성**: 수동 → 자동 (매 턴마다)
3. **LCA**: 필수 → 제거 (CLI-3로 연기)
4. **체크포인트**: "저장" → "이름표"
5. **Store 클래스**: 추가 (아키텍처 필수 권고)
6. **shelves**: 버퍼 → 제거 (트리에 자동 보존)
7. **명령어**: 단순화 (`ask`, `goto`, `save` 등)
8. **사용자 시나리오**: 5개 추가

---

**발행자**: 프로젝트 매니저 (일정 탐정)
**발행일**: 2025-11-09 (v2.0)
**다음 검토일**: Day 4 완료 후
**후속 Phase**: CLI-2 (LLM 연결 및 컨텍스트 검증)