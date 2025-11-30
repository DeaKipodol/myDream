# Phase CLI-1 구현계획서 (기술총괄) v2.0

**문서 정보**:
- 작성일: 2025-11-29 (v1.0) → **2025-11-29 (v2.0)**
- 작성자: 기술 총괄자 + PM
- 기반 문서: PM 개발지시서 v2.0 + 노드생성논의 + LCA 의사결정
- 상태: **v2.0 승인됨**
- 예상 소요: **5-7일** (PM-기술총괄 합의)

**작성 목적**:
- PM 개발지시서를 검토하고 실제 구현 가능한 형태로 구체화
- 노드생성논의 문서의 결정사항 반영
- LCA 의사결정 가이드의 Option C 반영
- 아키텍처 검토서의 필수 권고사항 반영

---

## 📋 목차

1. [핵심 변경사항 요약](#1-핵심-변경사항-요약)
2. [데이터 모델 설계](#2-데이터-모델-설계)
3. [핵심 시스템 설계](#3-핵심-시스템-설계)
4. [CLI 명령어 시스템](#4-cli-명령어-시스템)
5. [사용자 시나리오](#5-사용자-시나리오) ← PM 개발지시서 반영
6. [구현 일정](#6-구현-일정)
7. [테스트 전략](#7-테스트-전략)
8. [디렉토리 구조](#8-디렉토리-구조)

---

## 1. 핵심 변경사항 요약

### 1.1 PM 개발지시서 대비 변경사항

| 항목 | PM 개발지시서 v1.0 | 기술총괄 구현계획 | 변경 이유 |
|------|-------------------|------------------|----------|
| **Node 구조** | role + content | user_question + ai_answer | 노드생성논의 최종 결정 |
| **노드 생성** | create_node 명령 (수동) | ask 명령 (자동) | 자동 생성 방식 채택 |
| **LCA 알고리즘** | 필수 구현 | 제외 (CLI-3로 연기) | LCA_의사결정_가이드 Option C |
| **전역 상태** | 전역 변수 | Store 클래스 | 아키텍처 필수 권고 |
| **체크포인트** | 저장 개념 | 이름표 개념 | 노드생성논의 의미 재정의 |
| **파일 구조** | src/ | cli/ + core/ | 웹 재사용성 확보 |
| **예상 일정** | 10-14일 | 3-4일 | 범위 축소 |

### 1.2 근거 문서

**노드 구조 결정**:
- `docs/공통문서/노드생성논의_1_논리전개.md` Lines 126-133
- `docs/공통문서/노드생성논의_2_핵심이슈.md` Lines 91-121
- 결론: 1턴(질문+응답) = 1노드, 자동 생성

**LCA 제외 결정**:
- `docs/PM_관리/PM_보고서/LCA_의사결정_가이드.md` Lines 638-687
- 결론: Phase CLI-1 단순 경로 추적, CLI-3에서 LCA 추가

**Store 클래스**:
- `docs/아키텍처설계/설계완료보고/아키텍처_검토서_CLI-1.md` Lines 79-146
- 결론: 전역 변수 → Store 클래스 (필수)

---

## 2. 데이터 모델 설계

### 2.1 Node 클래스 (`core/models.py`)

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class Node:
    """대화 노드 (1턴 = 1노드)

    노드생성논의 최종 결정 반영:
    - user_question과 ai_answer가 하나의 쌍으로 저장
    - 질문 없는 응답, 응답 없는 질문 방지
    """
    id: str
    parent_id: Optional[str]
    user_question: str          # 사용자 질문
    ai_answer: str              # AI 응답
    created_at: datetime
    metadata: dict = field(default_factory=dict)

    def __post_init__(self):
        """검증"""
        if not self.user_question or not self.ai_answer:
            raise ValueError("질문과 응답은 필수입니다")
```

**핵심 설계 원칙**:
1. 1턴 = user_question + ai_answer 쌍
2. role 필드 없음 (노드 자체가 대화 턴을 의미)
3. LLM 호출 시 변환 함수로 처리

### 2.2 Tree 클래스

```python
from typing import Dict, List, Optional

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
            created_at=datetime.now(),
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
        """루트 → node_id 경로 반환 (단순 역추적)

        LCA 의사결정 Option C:
        - Phase CLI-1에서는 이 함수만 사용
        - LCA 계산 불필요
        """
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

### 2.3 Store 클래스 (`core/store.py`)

```python
from typing import Dict, List
from core.models import Tree

class Store:
    """전역 상태 컨테이너

    아키텍처 필수 권고:
    - 테스트 격리 보장
    - 병렬 테스트 가능
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

---

## 3. 핵심 시스템 설계

### 3.1 자동 노드 생성 시스템 (`core/conversation.py`)

```python
from uuid import uuid4
from datetime import datetime
from core.models import Node
from core.store import store

def handle_conversation_turn(user_input: str) -> Node:
    """대화 턴 처리 및 자동 노드 생성

    노드생성논의 핵심 알고리즘:
    1. 현재 경로의 컨텍스트 생성
    2. AI 응답 생성 (Phase CLI-1: 더미)
    3. 새 노드 자동 생성
    4. 트리에 추가
    5. 활성 경로 업데이트
    """
    # 1. 현재 노드
    current_node_id = store.get_current_node_id()

    # 2. 컨텍스트 생성
    context_path = store.tree.get_path_to_root(current_node_id)
    context_messages = generate_context_messages(context_path)

    # 3. AI 응답 (더미)
    ai_response = call_dummy_llm(context_messages, user_input)

    # 4. 새 노드 자동 생성
    new_node = Node(
        id=f"node_{uuid4().hex[:8]}",
        parent_id=current_node_id,
        user_question=user_input,
        ai_answer=ai_response,
        created_at=datetime.now(),
        metadata={}
    )

    # 5. 트리에 추가
    store.tree.add_node(new_node)

    # 6. 활성 경로 업데이트
    store.active_path_ids.append(new_node.id)

    return new_node

def generate_context_messages(path_node_ids: List[str]) -> List[dict]:
    """경로를 LLM 메시지 형식으로 변환"""
    messages = []

    for node_id in path_node_ids:
        node = store.tree.nodes.get(node_id)
        if not node:
            continue

        messages.append({"role": "user", "content": node.user_question})
        messages.append({"role": "assistant", "content": node.ai_answer})

    return messages

def call_dummy_llm(context: List[dict], user_input: str) -> str:
    """더미 LLM (Phase CLI-1용)"""
    return f"[더미 응답] '{user_input}'에 대한 답변입니다. 컨텍스트 길이: {len(context)}"
```

### 3.2 경로 전환 (`core/path_switch.py`)

```python
from core.store import store

def switch_path(target_node_id: str) -> dict:
    """경로 전환 (단순 역추적)

    LCA 의사결정 Option C:
    - Phase CLI-1에서는 단순 경로 추적만
    - LCA 계산 불필요
    """
    old_path = store.active_path_ids.copy()

    try:
        new_path = store.tree.get_path_to_root(target_node_id)
    except ValueError as e:
        return {
            'old_path_ids': old_path,
            'new_path_ids': old_path,
            'switched': False,
            'error': str(e)
        }

    store.active_path_ids = new_path

    return {
        'old_path_ids': old_path,
        'new_path_ids': new_path,
        'switched': True
    }
```

### 3.3 체크포인트 시스템 (`core/checkpoint.py`)

```python
from core.store import store
from core.path_switch import switch_path

def save_checkpoint(name: str) -> dict:
    """현재 노드에 이름표 붙이기

    노드생성논의 의미 재정의:
    - "저장"이 아니라 "이름표"
    - 노드는 이미 자동 생성되었음
    """
    current_node_id = store.get_current_node_id()
    overwritten = name in store.checkpoints

    store.checkpoints[name] = current_node_id

    return {
        'name': name,
        'node_id': current_node_id,
        'created': True,
        'overwritten': overwritten
    }

def goto_checkpoint(name: str) -> dict:
    """이름표로 경로 전환"""
    if name not in store.checkpoints:
        return {'switched': False, 'error': f"체크포인트 '{name}'을 찾을 수 없습니다"}

    target_node_id = store.checkpoints[name]
    return switch_path(target_node_id)

def list_checkpoints() -> List[dict]:
    """체크포인트 목록"""
    result = []

    for name, node_id in store.checkpoints.items():
        node = store.tree.nodes.get(node_id)
        if not node:
            continue

        result.append({
            'name': name,
            'node_id': node_id,
            'depth': len(store.tree.get_path_to_root(node_id)) - 1,
            'question': node.user_question[:30] + '...' if len(node.user_question) > 30 else node.user_question
        })

    return result
```

---

## 4. CLI 명령어 시스템

### 4.1 명령어 목록

| 명령어 | 인자 | 설명 |
|--------|------|------|
| `ask` | `<질문>` | AI에게 질문 (자동 노드 생성) |
| `goto` | `<node_id/name>` | 경로 전환 |
| `save` | `<name>` | 현재 노드에 이름표 |
| `list` | - | 체크포인트 목록 |
| `tree` | - | 트리 시각화 |
| `path` | - | 현재 활성 경로 |
| `context` | - | 대화 맥락 출력 |
| `help` | - | 도움말 |
| `exit` | - | 종료 |

### 4.2 CLI REPL 메인 루프 (`cli/cli.py`)

```python
from core.store import store
from core.conversation import handle_conversation_turn
from core.path_switch import switch_path
from core.checkpoint import save_checkpoint, goto_checkpoint, list_checkpoints

def main():
    """CLI REPL 메인 루프"""
    print("🌲 AI 고민상담 트리 구조 시스템 CLI")
    print("명령어: help\n")

    while True:
        try:
            current_node_id = store.get_current_node_id()
            command = input(f"[{current_node_id}] > ").strip()

            if not command:
                continue

            parts = command.split(maxsplit=1)
            cmd = parts[0]
            args = parts[1] if len(parts) > 1 else ""

            if cmd == 'exit':
                print("👋 종료합니다")
                break

            elif cmd == 'ask':
                if not args:
                    print("❌ 사용법: ask <질문>")
                    continue

                new_node = handle_conversation_turn(args)
                print(f"\n🤖 {new_node.ai_answer}")
                print(f"✅ 노드 생성: {new_node.id}\n")

            elif cmd == 'goto':
                if not args:
                    print("❌ 사용법: goto <node_id 또는 체크포인트 이름>")
                    continue

                if args in store.checkpoints:
                    result = goto_checkpoint(args)
                else:
                    result = switch_path(args)

                if result['switched']:
                    print(f"✅ 경로 전환: {' → '.join(result['new_path_ids'])}\n")
                else:
                    print(f"❌ {result.get('error', '경로 전환 실패')}\n")

            elif cmd == 'save':
                if not args:
                    print("❌ 사용법: save <이름>")
                    continue

                result = save_checkpoint(args)
                if result['overwritten']:
                    print(f"⚠️  체크포인트 '{args}'를 덮어썼습니다")
                print(f"✅ 체크포인트 '{args}' → {result['node_id']}\n")

            elif cmd == 'list':
                checkpoints = list_checkpoints()
                if not checkpoints:
                    print("📋 체크포인트가 없습니다\n")
                else:
                    print("\n📋 체크포인트 목록:")
                    for cp in checkpoints:
                        print(f"  {cp['name']:15} → {cp['node_id']:15} (깊이 {cp['depth']}): {cp['question']}")
                    print()

            elif cmd == 'tree':
                print_tree()

            elif cmd == 'path':
                print(f"\n📍 활성 경로: {' → '.join(store.active_path_ids)}\n")

            elif cmd == 'context':
                print_context()

            elif cmd == 'help':
                print_help()

            else:
                print(f"❌ 알 수 없는 명령어: {cmd}\n")

        except KeyboardInterrupt:
            print("\n\n👋 종료합니다")
            break
        except Exception as e:
            print(f"❌ 에러: {e}\n")

if __name__ == '__main__':
    main()
```

---

## 5. 사용자 시나리오

> PM 개발지시서 v2.0의 5개 시나리오를 통합

### 시나리오 1: 기본 대화 흐름

```bash
$ python cli/cli.py

🌲 AI 고민상담 트리 구조 시스템 CLI
명령어: help

[root] > ask "취업 준비가 너무 막막해요"

🤖 [더미 응답] '취업 준비가 너무 막막해요'에 대한 답변입니다. 컨텍스트 길이: 2
✅ 노드 생성: node_abc123

[node_abc123] > ask "이력서는 어떻게 써야 하나요?"

🤖 [더미 응답] '이력서는 어떻게 써야 하나요?'에 대한 답변입니다. 컨텍스트 길이: 4
✅ 노드 생성: node_def456

[node_def456] > tree
📂 대화 트리
└── root: [시스템]
    └── node_abc123: "취업 준비가 너무 막막해요"
        └── node_def456: "이력서는 어떻게 써야 하나요?" ← 현재

[node_def456] > path

📍 활성 경로: root → node_abc123 → node_def456
```

**검증 포인트**:
- ask 명령으로 자동 노드 생성
- 프롬프트에 현재 노드 ID 표시
- tree 명령으로 구조 확인
- path 명령으로 활성 경로 확인

---

### 시나리오 2: 분기 생성

```bash
# 이전 시나리오 이어서...

[node_def456] > save "이력서질문"
✅ 체크포인트 '이력서질문' → node_def456

[node_def456] > goto node_abc123
✅ 경로 전환: root → node_abc123

[node_abc123] > ask "면접은 어떻게 준비하나요?"

🤖 [더미 응답] '면접은 어떻게 준비하나요?'에 대한 답변입니다.
✅ 노드 생성: node_ghi789

[node_ghi789] > tree
📂 대화 트리
└── root: [시스템]
    └── node_abc123: "취업 준비가 너무 막막해요"
        ├── node_def456: "이력서는 어떻게..." [이력서질문]
        └── node_ghi789: "면접은 어떻게 준비하나요?" ← 현재

# 분기 생성됨! node_abc123에서 두 개의 자식 노드
```

**검증 포인트**:
- goto로 이전 노드 이동 후 ask로 새 분기 생성
- 체크포인트 이름 트리에 표시
- 현재 노드 마커(←) 정상 동작

---

### 시나리오 3: 이름표로 이동

```bash
# 이전 시나리오 이어서...

[node_ghi789] > list

📋 체크포인트 목록:
  이력서질문       → node_def456     (깊이 2): 이력서는 어떻게 써야 하나요?

[node_ghi789] > goto 이력서질문
✅ 경로 전환: root → node_abc123 → node_def456

[node_def456] > ask "자기소개서도 알려주세요"

🤖 [더미 응답] '자기소개서도 알려주세요'에 대한 답변입니다.
✅ 노드 생성: node_jkl012

[node_jkl012] > tree
📂 대화 트리
└── root: [시스템]
    └── node_abc123: "취업 준비가 너무 막막해요"
        ├── node_def456: "이력서는 어떻게..." [이력서질문]
        │   └── node_jkl012: "자기소개서도 알려주세요" ← 현재
        └── node_ghi789: "면접은 어떻게..."
```

**검증 포인트**:
- 체크포인트 이름으로 goto 가능
- 이동 후 새 대화가 해당 노드의 자식으로 생성
- 기존 분기 보존

---

### 시나리오 4: 분기 탐색

```bash
[node_jkl012] > goto node_ghi789
✅ 경로 전환: root → node_abc123 → node_ghi789

[node_ghi789] > context
=== 현재 대화 컨텍스트 ===
[시스템] 대화를 시작합니다

[User] 취업 준비가 너무 막막해요
[AI] [더미 응답] '취업 준비가 너무 막막해요'에 대한 답변입니다.

[User] 면접은 어떻게 준비하나요?
[AI] [더미 응답] '면접은 어떻게 준비하나요?'에 대한 답변입니다.
===========================

[node_ghi789] > path

📍 활성 경로: root → node_abc123 → node_ghi789
```

**검증 포인트**:
- context 명령으로 현재 경로의 전체 대화 표시
- 다른 분기(이력서 경로)의 대화는 표시되지 않음
- 경로 전환 시 컨텍스트 자동 변경

---

### 시나리오 5: 깊은 분기에서 다른 분기로 이동

```bash
# 면접 경로에서 더 깊이 대화
[node_ghi789] > ask "모의면접 연습법은?"
✅ 노드 생성: node_mno345

[node_mno345] > ask "압박면접 대처법은?"
✅ 노드 생성: node_pqr678

[node_pqr678] > path

📍 활성 경로: root → node_abc123 → node_ghi789 → node_mno345 → node_pqr678

# 이력서 경로로 바로 이동
[node_pqr678] > goto 이력서질문
✅ 경로 전환: root → node_abc123 → node_def456

[node_def456] > path

📍 활성 경로: root → node_abc123 → node_def456

[node_def456] > tree
📂 대화 트리
└── root: [시스템]
    └── node_abc123: "취업 준비가 너무 막막해요"
        ├── node_def456: "이력서는 어떻게..." [이력서질문] ← 현재
        │   └── node_jkl012: "자기소개서도..."
        └── node_ghi789: "면접은 어떻게..."
            └── node_mno345: "모의면접 연습법은?"
                └── node_pqr678: "압박면접 대처법은?"

# 모든 분기가 보존됨! (shelves 버퍼 불필요)
```

**검증 포인트**:
- 깊은 분기에서 다른 분기로 직접 이동 가능
- 모든 분기 자동 보존 (트리 구조 자체가 보존)
- 이동해도 기존 대화 삭제되지 않음
- LCA 없이 단순 경로 추적으로 동작

---

## 6. 구현 일정

### Day 1: 핵심 구조 (6-8시간)

**작업**:
- [ ] `core/models.py`: Node, Tree 클래스
- [ ] `core/store.py`: Store 클래스
- [ ] `core/conversation.py`: 자동 노드 생성
- [ ] `tests/test_models.py`
- [ ] `tests/test_store.py`
- [ ] `tests/test_conversation.py`

**완료 기준**: 단위 테스트 100% 통과

---

### Day 2: 경로 전환 및 체크포인트 (6-8시간)

**작업**:
- [ ] `core/path_switch.py`: switch_path()
- [ ] `core/checkpoint.py`: save, goto, list
- [ ] `tests/test_path_switch.py`
- [ ] `tests/test_checkpoint.py`

**완료 기준**: 단위 테스트 100% 통과, 커버리지 80%+

---

### Day 3: CLI 구현 (6-8시간)

**작업**:
- [ ] `cli/cli.py`: REPL 메인 루프
- [ ] 9개 명령어 구현
- [ ] 트리 시각화
- [ ] 컨텍스트 출력
- [ ] 통합 테스트 (수동)

**완료 기준**: 모든 명령어 정상 동작

---

### Day 4: 테스트 및 문서화 (4-6시간)

**작업**:
- [ ] E2E 시나리오 테스트
- [ ] 버그 수정
- [ ] `README_CLI.md` 작성
- [ ] 코드 주석 보완

**완료 기준**: PM 검토 통과

---

## 7. 테스트 전략

### 7.1 pytest fixtures (`tests/conftest.py`)

```python
import pytest
from core.store import Store

@pytest.fixture
def clean_store():
    """각 테스트마다 새로운 Store 인스턴스"""
    store = Store()
    yield store
    store.reset()
```

### 7.2 핵심 테스트 시나리오

**test_conversation.py**:
```python
def test_auto_node_creation(clean_store):
    """대화 시 자동 노드 생성"""
    assert len(clean_store.tree.nodes) == 1  # root만

    new_node = handle_conversation_turn("안녕하세요")

    assert len(clean_store.tree.nodes) == 2
    assert new_node.user_question == "안녕하세요"
    assert clean_store.active_path_ids == ['root', new_node.id]
```

**test_path_switch.py**:
```python
def test_branch_creation(clean_store):
    """분기 생성"""
    node_a = handle_conversation_turn("질문 A")
    node_b = handle_conversation_turn("질문 B")

    switch_path(node_a.id)
    node_c = handle_conversation_turn("질문 C")

    children = clean_store.tree.get_children(node_a.id)
    assert len(children) == 2
```

---

## 8. 디렉토리 구조

```
myDream/
├── cli/                        # 터미널 전용
│   ├── __init__.py
│   └── cli.py                  # REPL 메인
│
├── core/                       # 웹 재사용 가능
│   ├── __init__.py
│   ├── models.py               # Node, Tree
│   ├── store.py                # Store 클래스
│   ├── conversation.py         # 자동 노드 생성
│   ├── path_switch.py          # 경로 전환
│   └── checkpoint.py           # 체크포인트
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_models.py
│   ├── test_store.py
│   ├── test_conversation.py
│   ├── test_path_switch.py
│   └── test_checkpoint.py
│
├── docs/
│   └── README_CLI.md
│
└── requirements.txt            # pytest만
```

---

## 부록: PM 개발지시서와의 차이점

### 제거한 섹션
- ❌ LCA 알고리즘 (`cli/lca.py`) - CLI-3로 연기
- ❌ shelves 관리 - 자동 보존으로 대체
- ❌ create_node 명령 - ask 명령으로 대체

### 추가한 섹션
- ✅ Store 클래스 (`core/store.py`) - 아키텍처 필수
- ✅ 자동 노드 생성 (`core/conversation.py`) - 노드생성논의 핵심
- ✅ cli/ + core/ 분리 - 웹 재사용성

### 변경한 개념
- **체크포인트**: 저장 → 이름표
- **노드 생성**: 수동 → 자동
- **경로 전환**: LCA 기반 → 단순 역추적

---

**작성 완료**: 2025-11-29
**작성자**: 기술 총괄자
**다음 단계**: PM 검토 및 구현 시작
