# Phase CLI-1: 순수 로직 구현 (LLM 없이) - 개발지시서

- 발행일: 2025-11-05
- PM: 프로젝트 매니저 (일정 탐정)
- Phase: CLI-1
- 상태: 발행
- 예상 소요: 10-14일
- 담당자: 기술 개발자

---

## 1. Phase 목표

트리 구조 대화 시스템의 핵심 알고리즘(트리 자료구조, LCA, 경로 전환, 체크포인트)을 Python CLI로 구현하고, LLM 없이 명령어만으로 모든 기능이 완벽히 동작하는지 검증합니다. 이 Phase가 완료되면 시스템의 핵심 로직이 검증되며, 이후 LLM 연결과 UI 구축은 이 로직 위에 "껍데기"를 씌우는 작업이 됩니다.

---

## 2. 핵심 작업 (5개 모듈)

### 2.1 트리 자료구조 (`cli/tree.py`)

**목표**: 대화 노드를 트리 구조로 관리하는 자료구조 구현

**클래스 설계**:

```python
class Node:
    """대화 노드"""
    def __init__(self, id: str, parent_id: str | None, content: str, role: str):
        self.id = id
        self.parent_id = parent_id
        self.content = content
        self.role = role  # 'user' 또는 'assistant'
        self.children_ids = []
        self.created_at = datetime.now()
        self.meta = {}  # 추가 메타데이터 (태그, 점수 등)

class Tree:
    """대화 트리"""
    def __init__(self, root_id: str = 'root'):
        self.root_id = root_id
        self.nodes = {}  # {node_id: Node}
        self.active_path_ids = [root_id]  # 현재 활성 경로

    def add_node(self, node: Node) -> bool:
        """노드 추가 (검증 포함)"""
        # 부모 존재 확인, 순환 참조 차단
        pass

    def get_node(self, node_id: str) -> Node | None:
        """노드 조회"""
        pass

    def get_path(self, node_id: str) -> list[str]:
        """루트 → node_id 경로 반환"""
        # parent_id를 따라 올라가며 경로 구성
        pass

    def get_children(self, node_id: str) -> list[Node]:
        """자식 노드 목록 반환"""
        pass

    def get_depth(self, node_id: str) -> int:
        """노드의 깊이 반환 (루트는 0)"""
        pass
```

**구현 요구사항**:
- [ ] 노드 추가 시 부모 노드 존재 여부 검증
- [ ] 순환 참조 차단 (A → B → A 같은 경우)
- [ ] 경로 조회 시 캐싱 고려 (성능 최적화, 선택사항)
- [ ] 트리 출력 함수 (`print_tree()`) - ASCII 아트로 시각화

**UI 계약 주석**:
```python
# UI에서는:
# - 사용자가 노드 클릭 → get_path(clicked_node_id) 호출
# - 반환된 경로로 ChatView 렌더링
```

---

### 2.2 LCA 알고리즘 (`cli/lca.py`)

**목표**: 두 노드의 최저 공통 조상(LCA) 계산

**함수 설계**:

```python
def find_lca_linear(tree: Tree, node1_id: str, node2_id: str) -> str | None:
    """
    선형 방법으로 LCA 계산

    알고리즘:
    1. 두 노드의 경로를 각각 구한다 (루트 → 노드)
    2. 두 경로를 비교하며 마지막 공통 노드를 찾는다

    시간 복잡도: O(h), h는 트리 높이

    Returns:
        LCA 노드 ID 또는 None (노드가 존재하지 않으면)

    UI 계약:
        - 사용자가 현재 경로 A→B→D에서 F를 클릭 시
        - find_lca_linear(tree, 'D', 'F') 호출
        - LCA가 'B'라면, 경로는 A→B→F로 재구성
    """
    pass

def find_lca_with_depth(tree: Tree, node1_id: str, node2_id: str) -> str | None:
    """
    깊이 정규화 방법으로 LCA 계산 (선택사항, 성능 개선)

    알고리즘:
    1. 두 노드의 깊이를 계산
    2. 깊이가 깊은 노드를 얕은 쪽과 같은 깊이로 올림
    3. 동시에 부모로 올라가며 처음 만나는 지점이 LCA

    시간 복잡도: O(h)
    """
    pass
```

**구현 요구사항**:
- [ ] 선형 방법 (`find_lca_linear`) 필수 구현
- [ ] 엣지 케이스 처리:
  - 두 노드 중 하나가 존재하지 않음 → None 반환
  - 두 노드가 동일 → 해당 노드 반환
  - 한 노드가 다른 노드의 조상 → 조상 노드 반환
- [ ] 단위 테스트 필수 (최소 5개 시나리오)

---

### 2.3 경로 전환 로직 (`cli/path_switch.py`)

**목표**: LCA를 기반으로 활성 경로 전환

**함수 설계**:

```python
def switch_path(tree: Tree, target_node_id: str) -> dict:
    """
    활성 경로를 target_node_id로 전환

    알고리즘:
    1. 현재 활성 경로의 리프 노드와 target_node_id의 LCA 계산
    2. 루트 → LCA 경로 (prefix)
    3. LCA → target_node_id 경로 (suffix, LCA 중복 제거)
    4. prefix + suffix = 새 활성 경로
    5. 기존 분기는 보존 영역(shelves)으로 표시

    Args:
        tree: Tree 객체
        target_node_id: 전환할 목표 노드 ID

    Returns:
        {
            'active_path_ids': [...],  # 새 활성 경로
            'lca_node_id': '...',      # LCA 노드
            'shelved_path_ids': [...]  # 보존 영역으로 이동된 경로
        }

    UI 계약:
        - 사용자가 트리 뷰에서 노드 클릭 시 호출
        - 반환된 active_path_ids로 ChatView 재렌더링
        - shelved_path_ids는 보존 스레드 패널에 표시
    """
    current_leaf_id = tree.active_path_ids[-1]

    # LCA 계산
    lca_id = find_lca_linear(tree, current_leaf_id, target_node_id)

    # prefix + suffix 계산
    # ...

    # 활성 경로 업데이트
    tree.active_path_ids = new_path

    return {
        'active_path_ids': new_path,
        'lca_node_id': lca_id,
        'shelved_path_ids': old_branch
    }
```

**구현 요구사항**:
- [ ] 경로 전환 시 트리 구조 변경 없음 (활성 경로만 재작성)
- [ ] 보존 영역 관리 (shelves 리스트에 이전 분기 기록)
- [ ] 엣지 케이스 처리:
  - 동일 노드 클릭 → no-op (변경 없음)
  - 루트 클릭 → 활성 경로를 [root_id]로 초기화
- [ ] 단위 테스트 필수 (최소 7개 시나리오)

---

### 2.4 체크포인트 시스템 (`cli/checkpoint.py`)

**목표**: 특정 시점의 활성 경로를 스냅샷으로 저장하고 복원

**클래스 설계**:

```python
class Checkpoint:
    """체크포인트 (스냅샷)"""
    def __init__(self, checkpoint_id: str, active_path_ids: list[str], reason: str):
        self.checkpoint_id = checkpoint_id
        self.active_path_ids = active_path_ids.copy()  # 불변성 보장
        self.timestamp = datetime.now()
        self.reason = reason
        self.snapshot_hash = self._compute_hash()

    def _compute_hash(self) -> str:
        """무결성 검증을 위한 해시 계산"""
        content = '|'.join(self.active_path_ids)
        return hashlib.sha256(content.encode()).hexdigest()[:8]

class CheckpointManager:
    """체크포인트 관리"""
    def __init__(self):
        self.checkpoints = {}  # {checkpoint_id: Checkpoint}
        self.checkpoint_counter = 0

    def create_checkpoint(self, tree: Tree, reason: str = 'manual') -> Checkpoint:
        """체크포인트 생성"""
        checkpoint_id = f'cp_{self.checkpoint_counter}'
        self.checkpoint_counter += 1

        checkpoint = Checkpoint(
            checkpoint_id=checkpoint_id,
            active_path_ids=tree.active_path_ids,
            reason=reason
        )
        self.checkpoints[checkpoint_id] = checkpoint
        return checkpoint

    def restore_checkpoint(self, tree: Tree, checkpoint_id: str) -> bool:
        """체크포인트 복원"""
        if checkpoint_id not in self.checkpoints:
            return False

        checkpoint = self.checkpoints[checkpoint_id]

        # 무결성 검증 (선택사항)
        # ...

        tree.active_path_ids = checkpoint.active_path_ids.copy()
        return True

    def list_checkpoints(self) -> list[Checkpoint]:
        """체크포인트 목록 반환 (시간 역순)"""
        return sorted(self.checkpoints.values(), key=lambda cp: cp.timestamp, reverse=True)
```

**구현 요구사항**:
- [ ] 체크포인트 생성 시 활성 경로의 깊은 복사 (불변성)
- [ ] 스냅샷 해시 계산 (무결성 검증용, 선택사항)
- [ ] 체크포인트 목록 조회 (시간 역순 정렬)
- [ ] 단위 테스트 필수 (최소 5개 시나리오)

**UI 계약 주석**:
```python
# UI에서는:
# - 사용자가 "체크포인트 생성" 버튼 클릭 → create_checkpoint() 호출
# - 체크포인트 패널에서 체크포인트 클릭 → restore_checkpoint() 호출
# - 복원 후 ChatView를 복원된 active_path_ids로 재렌더링
```

---

### 2.5 CLI REPL 인터페이스 (`cli/cli.py`)

**목표**: 사용자가 명령어로 시스템을 조작할 수 있는 대화형 인터페이스 제공

**명령어 목록**:

```bash
# 노드 관리
> create_node <parent_id> <content> <role>
  예: create_node root "안녕하세요" user
  설명: 새 노드 생성

> show_tree
  설명: 트리 구조 출력 (ASCII 아트)

> show_node <node_id>
  설명: 특정 노드의 상세 정보 출력

# 경로 관리
> switch_path <target_node_id>
  예: switch_path node_5
  설명: 활성 경로를 target_node_id로 전환

> show_active_path
  설명: 현재 활성 경로 출력 (A → B → D 형식)

> show_context
  설명: 현재 활성 경로의 대화 내용 출력 (컨텍스트 블록)

# 체크포인트 관리
> create_checkpoint [reason]
  예: create_checkpoint "경로 전환 전"
  설명: 현재 상태를 체크포인트로 저장

> list_checkpoints
  설명: 체크포인트 목록 출력

> restore_checkpoint <checkpoint_id>
  예: restore_checkpoint cp_0
  설명: 체크포인트로 복원

# 보존 영역
> show_shelves
  설명: 보존 영역에 있는 비활성 분기 목록 출력

# 유틸리티
> help
  설명: 명령어 도움말 출력

> exit
  설명: CLI 종료
```

**구현 예시**:

```python
def main():
    """CLI REPL 메인 루프"""
    tree = Tree(root_id='root')
    tree.add_node(Node(id='root', parent_id=None, content='대화 시작', role='system'))

    checkpoint_manager = CheckpointManager()
    shelves = []  # 보존 영역

    print("AI 고민상담 트리 구조 시스템 CLI")
    print("명령어 목록: help")

    while True:
        try:
            command = input("\n> ").strip()

            if not command:
                continue

            parts = command.split()
            cmd = parts[0]

            if cmd == 'exit':
                break
            elif cmd == 'help':
                print_help()
            elif cmd == 'create_node':
                handle_create_node(tree, parts[1:])
            elif cmd == 'show_tree':
                handle_show_tree(tree)
            elif cmd == 'switch_path':
                result = switch_path(tree, parts[1])
                print(f"활성 경로 전환: {' → '.join(result['active_path_ids'])}")
                if result['shelved_path_ids']:
                    shelves.append(result['shelved_path_ids'])
            elif cmd == 'show_active_path':
                print(' → '.join(tree.active_path_ids))
            elif cmd == 'create_checkpoint':
                reason = ' '.join(parts[1:]) if len(parts) > 1 else 'manual'
                cp = checkpoint_manager.create_checkpoint(tree, reason)
                print(f"체크포인트 생성: {cp.checkpoint_id} ({cp.reason})")
            elif cmd == 'restore_checkpoint':
                if checkpoint_manager.restore_checkpoint(tree, parts[1]):
                    print(f"체크포인트 복원: {parts[1]}")
                else:
                    print("체크포인트를 찾을 수 없습니다.")
            else:
                print(f"알 수 없는 명령어: {cmd}")

        except Exception as e:
            print(f"에러: {e}")

if __name__ == '__main__':
    main()
```

**구현 요구사항**:
- [ ] REPL 기본 구조 (입력 → 파싱 → 실행 → 출력)
- [ ] 명령어 파싱 (공백으로 분리, 따옴표 내부는 하나의 인자로)
- [ ] 에러 처리 (잘못된 명령어, 인자 부족 등)
- [ ] 도움말 출력 (`help` 명령어)
- [ ] 트리 시각화 (ASCII 아트, 선택사항이지만 강력 권장)

---

## 3. 테스트 전략

### 3.1 단위 테스트 (`tests/`)

**파일 구조**:
```
tests/
├── test_tree.py           # 트리 자료구조 테스트
├── test_lca.py            # LCA 알고리즘 테스트
├── test_path_switch.py    # 경로 전환 테스트
├── test_checkpoint.py     # 체크포인트 테스트
└── test_cli.py            # CLI 명령어 테스트 (선택사항)
```

**테스트 시나리오 예시 (`test_path_switch.py`)**:

```python
import pytest
from cli.tree import Tree, Node
from cli.path_switch import switch_path

def test_switch_to_sibling():
    """형제 노드로 전환 (A→B→D → A→B→F)"""
    tree = Tree('A')
    tree.add_node(Node('A', None, 'root', 'system'))
    tree.add_node(Node('B', 'A', 'B', 'user'))
    tree.add_node(Node('D', 'B', 'D', 'assistant'))
    tree.add_node(Node('F', 'B', 'F', 'assistant'))
    tree.active_path_ids = ['A', 'B', 'D']

    result = switch_path(tree, 'F')

    assert result['active_path_ids'] == ['A', 'B', 'F']
    assert result['lca_node_id'] == 'B'
    assert result['shelved_path_ids'] == ['D']

def test_switch_to_different_branch():
    """다른 분기로 전환 (A→B→D → A→C→G)"""
    tree = Tree('A')
    # ... 노드 추가
    tree.active_path_ids = ['A', 'B', 'D']

    result = switch_path(tree, 'G')

    assert result['active_path_ids'] == ['A', 'C', 'G']
    assert result['lca_node_id'] == 'A'
    assert set(result['shelved_path_ids']) == {'B', 'D'}

def test_switch_to_same_node():
    """동일 노드 클릭 (no-op)"""
    tree = Tree('A')
    # ... 노드 추가
    tree.active_path_ids = ['A', 'B', 'D']

    result = switch_path(tree, 'D')

    assert result['active_path_ids'] == ['A', 'B', 'D']
    assert result['shelved_path_ids'] == []
```

**테스트 커버리지 목표**:
- [ ] 핵심 함수 100% 커버리지
- [ ] 엣지 케이스 포함 (최소 5개 시나리오/모듈)
- [ ] pytest로 모든 테스트 실행 가능 (`pytest tests/`)

---

### 3.2 수동 테스트 시나리오

**시나리오 1: 기본 트리 생성 및 경로 전환**

```bash
# 1. CLI 시작
$ python cli/cli.py

# 2. 노드 생성
> create_node root "첫 질문" user
> create_node node_1 "답변 1" assistant
> create_node node_1 "추가 질문" user
> create_node node_2 "답변 2" assistant

# 3. 트리 출력
> show_tree
Tree:
  root
  └── node_1 (첫 질문)
      ├── node_2 (추가 질문)
      │   └── node_3 (답변 2)
      └── ...

# 4. 경로 전환
> switch_path node_1
활성 경로 전환: root → node_1

# 5. 체크포인트 생성
> create_checkpoint "전환 전"
체크포인트 생성: cp_0 (전환 전)

# 6. 복원 테스트
> restore_checkpoint cp_0
체크포인트 복원: cp_0
```

**PM이 직접 테스트할 항목**:
- [ ] 트리 시각화가 올바른가?
- [ ] 경로 전환이 예상대로 동작하는가?
- [ ] 체크포인트 복원 후 상태가 정확한가?

---

## 4. 작업 우선순위

### Week 1 (1-5일)
1. **최우선**: `tree.py` 구현 (Node, Tree 클래스)
2. `lca.py` 구현 (선형 방법)
3. 단위 테스트 작성 (`test_tree.py`, `test_lca.py`)

### Week 2 (6-10일)
1. `path_switch.py` 구현
2. `checkpoint.py` 구현
3. 단위 테스트 작성 (`test_path_switch.py`, `test_checkpoint.py`)

### Week 3 (11-14일, 버퍼)
1. `cli.py` 구현 (REPL 인터페이스)
2. 통합 테스트 (모든 명령어 동작 확인)
3. 문서 작성 (`README_CLI.md`)
4. PM 검토 및 피드백 반영

---

## 5. 완료 기준 (Definition of Done)

### 필수 조건
- [ ] 모든 명령어가 예상대로 동작 (최소 10개 명령어)
- [ ] 단위 테스트 100% 통과 (pytest)
- [ ] 엣지 케이스 처리 완료 (순환 참조, 존재하지 않는 노드 등)
- [ ] `README_CLI.md` 작성 완료 (사용법, 명령어 목록)

### 검증 방법
1. **자동 테스트**:
   ```bash
   $ pytest tests/ -v --cov=cli --cov-report=term-missing
   ```
   - 모든 테스트 통과
   - 커버리지 80% 이상

2. **수동 테스트**:
   - PM이 제공한 시나리오 실행
   - 예상 출력과 실제 출력 비교

3. **PM 검토**:
   - 코드 리뷰 (가독성, 주석, 테스트)
   - 데모 (CLI 실행 화면 공유)
   - 이슈 피드백 반영

---

## 6. 기술 제약사항

### 6.1 사용 기술
- **언어**: Python 3.10 이상
- **의존성**: 표준 라이브러리만 사용 (추가 패키지 설치 금지)
  - `datetime`, `hashlib`, `json` 등
- **테스트**: pytest만 허용 (추가 테스트 프레임워크 금지)

### 6.2 데이터 저장
- Phase CLI-1에서는 **메모리 내 자료구조만 사용**
- 파일 저장은 CLI-2 이후 (JSON 형식 권장)
- DB 연결은 금지 (CLI-3 이후)

### 6.3 성능 목표
- 경로 전환: < 10ms (노드 수 100개 기준)
- LCA 계산: < 5ms (트리 깊이 20 기준)
- 트리 출력: < 100ms (노드 수 100개 기준)

---

## 7. 디렉토리 구조

```
myDream/
├── cli/
│   ├── __init__.py
│   ├── cli.py               # REPL 메인
│   ├── tree.py              # 트리 자료구조
│   ├── lca.py               # LCA 알고리즘
│   ├── path_switch.py       # 경로 전환 로직
│   ├── checkpoint.py        # 체크포인트 시스템
│   └── utils.py             # 유틸리티 함수 (선택사항)
├── tests/
│   ├── __init__.py
│   ├── test_tree.py
│   ├── test_lca.py
│   ├── test_path_switch.py
│   ├── test_checkpoint.py
│   └── test_cli.py          # 선택사항
├── docs/
│   └── README_CLI.md        # CLI 사용법 문서
└── requirements.txt         # pytest만 포함
```

---

## 8. 리스크 및 대응

### 리스크 1: LCA 알고리즘 구현 어려움
- **확률**: 중
- **영향**: Phase 지연
- **대응**: 선형 방법 우선 구현, Binary Lifting은 CLI-3 이후로 연기

### 리스크 2: 트리 시각화 구현 복잡도
- **확률**: 중
- **영향**: 개발 시간 증가
- **대응**: 간단한 들여쓰기 방식으로 시작, ASCII 아트는 선택사항

### 리스크 3: 테스트 작성 시간 부족
- **확률**: 높음
- **영향**: 품질 저하
- **대응**: TDD(Test-Driven Development) 방식 권장, 함수 구현 전 테스트 먼저 작성

---

## 9. 커뮤니케이션

### 일일 체크인
- **시간**: 매일 오후 6시
- **방법**: Slack/이메일
- **내용**:
  - 오늘 완성한 기능 (예: `tree.py` 완성)
  - 오늘 발견한 이슈 (예: LCA 계산 시 예외 발생)
  - 내일 작업할 내용 (예: `path_switch.py` 시작)

### 주간 미팅
- **시간**: 매주 금요일 오후 3시
- **시간**: 30분
- **내용**:
  - 데모 (CLI 실행 화면 공유)
  - 블로커 논의
  - 다음 주 계획 조율

### 블로커 보고
- **즉시 보고**: 작업 진행 불가 시 (예: 알고리즘 막힘, 예외 처리 불가)
- **방법**: Slack 긴급 메시지

---

## 10. 참고 자료

### 내부 문서
- **설계서**: `/Users/kimdaegi/Desktop/myDream/plan.md` (섹션 6, 7 참조)
- **개발방향 전환 공지**: `/Users/kimdaegi/Desktop/myDream/docs/PM_관리/PM_개발지시/개발방향_전환_공지.md`

### 외부 참조
- LCA 알고리즘: [GeeksforGeeks - Lowest Common Ancestor](https://www.geeksforgeeks.org/lowest-common-ancestor-binary-tree-set-1/)
- Python 트리 구조: [Real Python - Tree Data Structures](https://realpython.com/python-tree-data-structures/)

---

## 11. 체크리스트 (담당자용)

### Week 1
- [ ] `tree.py` 구현 (Node, Tree 클래스)
- [ ] `lca.py` 구현 (선형 방법)
- [ ] 단위 테스트 작성 (`test_tree.py`, `test_lca.py`)
- [ ] 테스트 100% 통과
- [ ] PM에게 Week 1 완료 보고

### Week 2
- [ ] `path_switch.py` 구현
- [ ] `checkpoint.py` 구현
- [ ] 단위 테스트 작성 (`test_path_switch.py`, `test_checkpoint.py`)
- [ ] 테스트 100% 통과
- [ ] PM에게 Week 2 완료 보고

### Week 3 (버퍼)
- [ ] `cli.py` 구현 (REPL)
- [ ] 통합 테스트 (모든 명령어 동작 확인)
- [ ] `README_CLI.md` 작성
- [ ] PM 검토 및 피드백 반영
- [ ] Phase CLI-1 최종 완료 보고

---

**발행자**: 프로젝트 매니저 (일정 탐정)
**발행일**: 2025-11-05
**다음 검토일**: Week 1 완료 후 (약 5일 후)
**후속 Phase**: CLI-2 (LLM 연결 및 컨텍스트 검증)
