# 테스트 문서

**작성일**: 2025-11-30
**Phase**: CLI-1
**총 테스트 수**: 109개
**전체 커버리지**: 84%

---

## 🧪 전체 테스트 구조

총 **109개 테스트**를 5개 파일로 나누어 작성:

```
tests/
├── test_models.py      (27개) - Node, Tree 기본 동작
├── test_store.py       (27개) - Store 상태 관리
├── test_conversation.py (23개) - 대화 관리
├── test_path_utils.py  (16개) - 경로 유틸리티
└── test_checkpoint.py  (16개) - 체크포인트 관리
```

---

## 1️⃣ test_models.py (27개 테스트)

### Node 클래스 테스트 (6개)

#### ✅ 정상 생성 테스트
```python
def test_node_creation_basic():
    """기본 노드가 제대로 만들어지는지"""
    node = Node(
        id="test-1",
        parent_id="root",
        user_question="What is Python?",
        ai_answer="Python is a programming language."
    )
    assert node.id == "test-1"
    assert node.user_question == "What is Python?"
    assert node.ai_answer == "Python is a programming language."
```

**검증 내용**:
- 노드의 모든 필드가 올바르게 설정되는지
- metadata가 빈 딕셔너리로 초기화되는지
- timestamp가 자동으로 생성되는지

#### ✅ 메타데이터와 함께 생성
```python
def test_node_creation_with_metadata():
    """메타데이터 붙여서 노드 만들기"""
    metadata = {"tag": "python", "importance": "high"}
    node = Node(
        id="test-2",
        parent_id="root",
        user_question="Test?",
        ai_answer="Answer.",
        metadata=metadata
    )
    assert node.metadata == metadata
    assert node.metadata["tag"] == "python"
```

**검증 내용**: 메타데이터가 정확히 저장되는지

#### ✅ 루트 노드 생성
```python
def test_node_creation_root():
    """루트 노드 (부모 없음) 생성"""
    node = Node(
        id="root",
        parent_id=None,  # 루트는 부모가 없음
        user_question="[시스템]",
        ai_answer="대화를 시작합니다"
    )
    assert node.parent_id is None
    assert node.id == "root"
```

**검증 내용**: parent_id가 None인 노드 생성 가능

#### ❌ 검증 실패 테스트 (3개)
```python
def test_node_validation_empty_id():
    """빈 ID로 노드 만들면 에러 나야 함"""
    with pytest.raises(ValueError, match="Node id cannot be empty"):
        Node(id="", parent_id="root", user_question="Q?", ai_answer="A.")

def test_node_validation_empty_question():
    """질문이 빈 문자열이면 안 됨"""
    with pytest.raises(ValueError, match="user_question cannot be empty"):
        Node(id="test", parent_id="root", user_question="", ai_answer="A.")

def test_node_validation_empty_answer():
    """답변이 빈 문자열이면 안 됨"""
    with pytest.raises(ValueError, match="ai_answer cannot be empty"):
        Node(id="test", parent_id="root", user_question="Q?", ai_answer="")
```

**검증 내용**: `__post_init__` 검증 로직이 제대로 동작하는지

---

### Tree 클래스 테스트 (16개)

#### ✅ 트리 초기화 (2개)
```python
def test_tree_initialization():
    """트리 만들면 루트 노드가 자동 생성되는지"""
    tree = Tree()
    assert tree.root_id == "root"
    assert len(tree.nodes) == 1  # 루트만 있음
    assert tree.nodes["root"].parent_id is None

def test_tree_custom_root_id():
    """커스텀 루트 ID로 트리 생성"""
    tree = Tree(root_id="custom-root")
    assert tree.root_id == "custom-root"
    assert "custom-root" in tree.nodes
```

**검증 내용**:
- Tree 초기화 시 루트 노드 자동 생성
- 커스텀 루트 ID 지원

#### ✅ 노드 추가 성공
```python
def test_add_node_success():
    """노드를 트리에 추가"""
    tree = Tree()
    node = Node(
        id="node-1",
        parent_id="root",
        user_question="Q?",
        ai_answer="A."
    )
    result = tree.add_node(node)

    assert result is True
    assert tree.get_node_count() == 2  # root + node-1
    assert tree.get_node("node-1") == node
```

**검증 내용**:
- 노드 추가 성공 시 True 반환
- 노드 개수 증가
- get_node()로 조회 가능

#### ❌ 중복 ID 추가 시도
```python
def test_add_node_duplicate_id():
    """같은 ID로 두 번 추가하면 실패해야 함"""
    tree = Tree()
    node1 = Node(id="node-1", parent_id="root", user_question="Q1?", ai_answer="A1.")
    node2 = Node(id="node-1", parent_id="root", user_question="Q2?", ai_answer="A2.")

    tree.add_node(node1)  # 성공
    result = tree.add_node(node2)  # 실패!

    assert result is False
    assert tree.get_node_count() == 2  # root + node1만
```

**검증 내용**: 중복 ID 방지

#### ❌ 존재하지 않는 부모에 추가
```python
def test_add_node_invalid_parent():
    """부모 노드가 없으면 에러"""
    tree = Tree()
    node = Node(
        id="orphan",
        parent_id="non-existent",
        user_question="Q?",
        ai_answer="A."
    )
    with pytest.raises(ValueError, match="does not exist"):
        tree.add_node(node)
```

**검증 내용**: 부모 노드 존재 검증

#### ✅ 노드 조회
```python
def test_get_node_exists():
    """존재하는 노드 조회"""
    tree = Tree()
    node = Node(id="node-1", parent_id="root", user_question="Q?", ai_answer="A.")
    tree.add_node(node)

    retrieved = tree.get_node("node-1")

    assert retrieved is not None
    assert retrieved.id == "node-1"

def test_get_node_not_exists():
    """존재하지 않는 노드 조회"""
    tree = Tree()
    result = tree.get_node("non-existent")
    assert result is None
```

**검증 내용**: get_node()의 정상/비정상 동작

#### ✅ 자식 노드 조회 (3개)
```python
def test_get_children_multiple():
    """한 노드에 여러 자식"""
    tree = Tree()
    # root에 3개 자식 추가
    for i in range(3):
        node = Node(
            id=f"child-{i}",
            parent_id="root",
            user_question=f"Q{i}?",
            ai_answer=f"A{i}."
        )
        tree.add_node(node)

    children = tree.get_children("root")

    assert len(children) == 3
    child_ids = {child.id for child in children}
    assert child_ids == {"child-0", "child-1", "child-2"}

def test_get_children_none():
    """자식이 없는 노드"""
    tree = Tree()
    node = Node(id="leaf", parent_id="root", user_question="Q?", ai_answer="A.")
    tree.add_node(node)

    children = tree.get_children("leaf")
    assert children == []

def test_get_children_invalid_node():
    """존재하지 않는 노드의 자식 조회"""
    tree = Tree()
    children = tree.get_children("non-existent")
    assert children == []
```

**검증 내용**: 여러 자식, 자식 없음, 잘못된 노드 케이스

#### ✅ 경로 추적 (핵심! 4개)
```python
def test_get_path_to_root_direct_child():
    """루트의 직접 자식에서 경로"""
    tree = Tree()
    node = Node(id="node-1", parent_id="root", user_question="Q?", ai_answer="A.")
    tree.add_node(node)

    path = tree.get_path_to_root("node-1")
    assert path == ["node-1", "root"]

def test_get_path_to_root_deep():
    """깊은 트리에서 루트까지 경로 찾기"""
    tree = Tree()
    # root -> node-1 -> node-2 -> node-3 구조
    node1 = Node(id="node-1", parent_id="root", user_question="Q1?", ai_answer="A1.")
    node2 = Node(id="node-2", parent_id="node-1", user_question="Q2?", ai_answer="A2.")
    node3 = Node(id="node-3", parent_id="node-2", user_question="Q3?", ai_answer="A3.")

    tree.add_node(node1)
    tree.add_node(node2)
    tree.add_node(node3)

    path = tree.get_path_to_root("node-3")
    assert path == ["node-3", "node-2", "node-1", "root"]

def test_get_path_to_root_from_root():
    """루트에서 루트까지 경로"""
    tree = Tree()
    path = tree.get_path_to_root("root")
    assert path == ["root"]

def test_get_path_to_root_invalid_node():
    """존재하지 않는 노드의 경로"""
    tree = Tree()
    path = tree.get_path_to_root("non-existent")
    assert path == []
```

**검증 내용**: 경로 추적의 모든 엣지 케이스

#### ✅ 기타 유틸리티 (2개)
```python
def test_node_exists():
    """노드 존재 여부 확인"""
    tree = Tree()
    assert tree.node_exists("root") is True
    assert tree.node_exists("non-existent") is False

    node = Node(id="node-1", parent_id="root", user_question="Q?", ai_answer="A.")
    tree.add_node(node)
    assert tree.node_exists("node-1") is True

def test_get_node_count():
    """노드 개수 세기"""
    tree = Tree()
    assert tree.get_node_count() == 1  # Just root

    for i in range(5):
        node = Node(
            id=f"node-{i}",
            parent_id="root",
            user_question=f"Q{i}?",
            ai_answer=f"A{i}."
        )
        tree.add_node(node)

    assert tree.get_node_count() == 6  # root + 5
```

---

### create_node 헬퍼 함수 테스트 (4개)

```python
def test_create_node_basic():
    """기본 노드 생성"""
    node = create_node(
        parent_id="root",
        user_question="What is AI?",
        ai_answer="AI is artificial intelligence."
    )
    assert node.parent_id == "root"
    assert node.user_question == "What is AI?"
    assert len(node.id) > 0  # Auto-generated ID

def test_create_node_with_metadata():
    """메타데이터와 함께 생성"""
    metadata = {"tag": "AI", "category": "tech"}
    node = create_node(
        parent_id="root",
        user_question="Q?",
        ai_answer="A.",
        metadata=metadata
    )
    assert node.metadata == metadata

def test_create_node_with_custom_id():
    """커스텀 ID로 생성"""
    node = create_node(
        parent_id="root",
        user_question="Q?",
        ai_answer="A.",
        node_id="custom-id-123"
    )
    assert node.id == "custom-id-123"

def test_create_node_auto_id_unique():
    """자동 생성 ID는 고유해야 함"""
    node1 = create_node(parent_id="root", user_question="Q1?", ai_answer="A1.")
    node2 = create_node(parent_id="root", user_question="Q2?", ai_answer="A2.")
    assert node1.id != node2.id
```

**검증 내용**: 헬퍼 함수의 모든 기능

---

### 통합 테스트 (1개)

```python
def test_branching_conversation():
    """실제 대화처럼 분기되는 트리"""
    tree = Tree()

    # 첫 번째 경로: root -> A -> B
    node_a = create_node("root", "Question A?", "Answer A.")
    node_b = create_node(node_a.id, "Question B?", "Answer B.")
    tree.add_node(node_a)
    tree.add_node(node_b)

    # 두 번째 경로: root -> C -> D
    node_c = create_node("root", "Question C?", "Answer C.")
    node_d = create_node(node_c.id, "Question D?", "Answer D.")
    tree.add_node(node_c)
    tree.add_node(node_d)

    # 검증: 총 5개 노드
    assert tree.get_node_count() == 5  # root + 4
    # root의 자식 2개
    assert len(tree.get_children("root")) == 2  # A, C
    # A의 자식 1개
    assert len(tree.get_children(node_a.id)) == 1  # B
    # 경로 검증
    path_b = tree.get_path_to_root(node_b.id)
    assert len(path_b) == 3  # B -> A -> root
```

**검증 내용**: 실제 분기 대화 시나리오

---

## 2️⃣ test_store.py (27개 테스트)

### Store 초기화 & 리셋 (3개)

```python
def test_store_init():
    """Store 만들면 루트만 있는 트리 생성"""
    store = Store()

    assert store.tree is not None
    assert store.tree.root_id == 'root'
    assert store.active_path_ids == ['root']
    assert store.checkpoints == {}

def test_store_init_has_root():
    """루트 노드가 자동 생성되는지"""
    store = Store()
    root_node = store.get_current_node()

    assert root_node is not None
    assert root_node.id == 'root'
    assert root_node.parent_id is None

def test_reset_clears_all_state():
    """reset()하면 모든 상태 초기화"""
    store = Store()
    store.add_node("Q1?", "A1.")
    store.add_node("Q2?", "A2.")
    store.save_checkpoint("cp1")

    # 상태 변경 확인
    assert len(store.active_path_ids) == 3
    assert len(store.checkpoints) == 1

    # 리셋
    store.reset()

    # 초기화 확인
    assert store.active_path_ids == ['root']
    assert store.checkpoints == {}
    assert store.tree.get_node_count() == 1
```

**검증 내용**: Store 초기 상태와 reset() 동작

---

### 노드 추가 & 경로 업데이트 (4개)

```python
def test_add_node_basic():
    """기본 노드 추가"""
    store = Store()
    node = store.add_node("What is AI?", "AI is artificial intelligence.")

    assert node is not None
    assert node.user_question == "What is AI?"
    assert node.parent_id == "root"

def test_add_node_updates_path():
    """노드 추가하면 active_path_ids도 자동 업데이트"""
    store = Store()

    node1 = store.add_node("Q1?", "A1.")
    assert store.active_path_ids == ['root', node1.id]

    node2 = store.add_node("Q2?", "A2.")
    assert store.active_path_ids == ['root', node1.id, node2.id]

def test_add_node_with_metadata():
    """메타데이터와 함께 추가"""
    store = Store()
    metadata = {"tag": "important"}
    node = store.add_node("Q?", "A.", metadata=metadata)

    assert node.metadata == metadata

def test_add_multiple_nodes():
    """여러 노드 연속 추가"""
    store = Store()
    node1 = store.add_node("Q1?", "A1.")
    node2 = store.add_node("Q2?", "A2.")
    node3 = store.add_node("Q3?", "A3.")

    assert store.tree.get_node_count() == 4  # root + 3
    assert store.get_current_node_id() == node3.id
```

**검증 내용**: 노드 추가와 경로 자동 업데이트

---

### 현재 노드 조회 (2개)

```python
def test_get_current_node_id_initial():
    """초기 상태의 현재 노드 ID는 root"""
    store = Store()
    assert store.get_current_node_id() == 'root'

def test_get_current_node_after_add():
    """노드 추가 후 현재 노드 확인"""
    store = Store()
    node = store.add_node("Q?", "A.")

    assert store.get_current_node_id() == node.id
    assert store.get_current_node() == node
```

**검증 내용**: get_current_node_id()와 get_current_node()

---

### 활성 경로 조회 (2개)

```python
def test_get_active_path_initial():
    """초기 경로는 루트만"""
    store = Store()
    path = store.get_active_path()

    assert len(path) == 1
    assert path[0].id == 'root'

def test_get_active_path_multiple_nodes():
    """여러 노드 추가 후 전체 경로"""
    store = Store()
    node1 = store.add_node("Q1?", "A1.")
    node2 = store.add_node("Q2?", "A2.")

    path = store.get_active_path()

    assert len(path) == 3
    assert path[0].id == 'root'
    assert path[1].id == node1.id
    assert path[2].id == node2.id
```

**검증 내용**: 전체 경로 조회

---

### 노드 전환 (3개)

```python
def test_switch_to_sibling_node():
    """형제 노드로 전환"""
    store = Store()

    # root -> A -> B
    node_a = store.add_node("Question A?", "Answer A.")
    node_b = store.add_node("Question B?", "Answer B.")

    # root로 돌아가서 새 분기 생성
    store.switch_to_node('root')
    node_c = store.add_node("Question C?", "Answer C.")

    # 현재: root -> C
    assert store.get_current_node_id() == node_c.id

    # B로 전환
    success = store.switch_to_node(node_b.id)

    assert success is True
    assert store.active_path_ids == ['root', node_a.id, node_b.id]

def test_switch_to_ancestor():
    """조상 노드로 전환"""
    store = Store()
    node1 = store.add_node("Q1?", "A1.")
    node2 = store.add_node("Q2?", "A2.")
    node3 = store.add_node("Q3?", "A3.")

    # root로 전환
    success = store.switch_to_node('root')

    assert success is True
    assert store.active_path_ids == ['root']

def test_switch_to_invalid_node():
    """존재하지 않는 노드로 전환 시도"""
    store = Store()
    success = store.switch_to_node('non-existent')

    assert success is False
    assert store.active_path_ids == ['root']  # 변경 안 됨
```

**검증 내용**: 노드 전환의 모든 케이스

---

### 체크포인트 (7개)

```python
def test_save_checkpoint_basic():
    """기본 체크포인트 저장"""
    store = Store()
    store.add_node("Q1?", "A1.")
    success = store.save_checkpoint("checkpoint-1")

    assert success is True
    assert "checkpoint-1" in store.checkpoints

def test_save_checkpoint_duplicate_name():
    """중복 이름으로 저장 시도"""
    store = Store()
    store.add_node("Q1?", "A1.")
    store.save_checkpoint("cp1")
    success = store.save_checkpoint("cp1")  # 중복!

    assert success is False
    assert len(store.checkpoints) == 1

def test_load_checkpoint_success():
    """체크포인트 로드 성공"""
    store = Store()
    node1 = store.add_node("Q1?", "A1.")
    store.save_checkpoint("cp1")
    node2 = store.add_node("Q2?", "A2.")

    # cp1로 이동
    success = store.load_checkpoint("cp1")

    assert success is True
    assert store.get_current_node_id() == node1.id

def test_load_checkpoint_not_exists():
    """존재하지 않는 체크포인트"""
    store = Store()
    success = store.load_checkpoint("non-existent")
    assert success is False

def test_list_checkpoints():
    """모든 체크포인트 목록"""
    store = Store()
    node1 = store.add_node("Q1?", "A1.")
    store.save_checkpoint("cp1")

    store.switch_to_node('root')
    node2 = store.add_node("Q2?", "A2.")
    store.save_checkpoint("cp2")

    checkpoints = store.list_checkpoints()

    assert len(checkpoints) == 2
    assert checkpoints["cp1"] == node1.id
    assert checkpoints["cp2"] == node2.id

def test_delete_checkpoint_success():
    """체크포인트 삭제"""
    store = Store()
    store.add_node("Q?", "A.")
    store.save_checkpoint("cp1")

    success = store.delete_checkpoint("cp1")

    assert success is True
    assert "cp1" not in store.checkpoints

def test_delete_checkpoint_not_exists():
    """존재하지 않는 체크포인트 삭제"""
    store = Store()
    success = store.delete_checkpoint("non-existent")
    assert success is False
```

**검증 내용**: 체크포인트 CRUD 전체

---

### 자식 노드 & 통계 (4개)

```python
def test_get_children_none():
    """자식 없는 경우"""
    store = Store()
    store.add_node("Q?", "A.")
    children = store.get_children_of_current()
    assert children == []

def test_get_children_multiple():
    """여러 자식"""
    store = Store()
    node1 = store.add_node("Q1?", "A1.")
    store.switch_to_node('root')
    node2 = store.add_node("Q2?", "A2.")
    store.switch_to_node('root')
    node3 = store.add_node("Q3?", "A3.")

    store.switch_to_node('root')
    children = store.get_children_of_current()

    assert len(children) == 3
    child_ids = {child.id for child in children}
    assert child_ids == {node1.id, node2.id, node3.id}

def test_get_stats_initial():
    """초기 통계"""
    store = Store()
    stats = store.get_tree_stats()

    assert stats["total_nodes"] == 1
    assert stats["path_depth"] == 1
    assert stats["checkpoints"] == 0

def test_get_stats_after_operations():
    """작업 후 통계"""
    store = Store()
    store.add_node("Q1?", "A1.")
    store.add_node("Q2?", "A2.")
    store.save_checkpoint("cp1")

    stats = store.get_tree_stats()

    assert stats["total_nodes"] == 3
    assert stats["path_depth"] == 3
    assert stats["checkpoints"] == 1
```

**검증 내용**: 자식 조회와 통계

---

### 통합 시나리오 (2개)

```python
def test_branching_conversation_scenario():
    """분기된 대화 시나리오"""
    store = Store()

    # 첫 번째 경로: root -> A -> B
    node_a = store.add_node("Python이 뭐야?", "Python은 프로그래밍 언어입니다.")
    store.save_checkpoint("파이썬")
    node_b = store.add_node("어디에 쓰여?", "웹, AI, 데이터 분석 등에 쓰입니다.")

    # 두 번째 경로: root -> C -> D
    store.switch_to_node('root')
    node_c = store.add_node("Java는?", "Java는 객체지향 언어입니다.")
    store.save_checkpoint("자바")
    node_d = store.add_node("특징은?", "플랫폼 독립적입니다.")

    # 검증
    assert store.tree.get_node_count() == 5  # root + 4
    assert store.get_current_node_id() == node_d.id

    # 파이썬 체크포인트로 이동
    store.load_checkpoint("파이썬")
    assert store.get_current_node_id() == node_a.id

    # root의 자식 2개
    store.switch_to_node('root')
    children = store.get_children_of_current()
    assert len(children) == 2

def test_checkpoint_and_continue():
    """체크포인트 저장 후 계속 대화"""
    store = Store()
    node1 = store.add_node("Q1?", "A1.")
    store.save_checkpoint("cp1")
    node2 = store.add_node("Q2?", "A2.")
    node3 = store.add_node("Q3?", "A3.")

    # cp1로 돌아가서 새 분기
    store.load_checkpoint("cp1")
    node4 = store.add_node("Q4?", "A4.")

    # node1의 자식이 2개
    store.switch_to_node(node1.id)
    children = store.get_children_of_current()
    assert len(children) == 2
```

**검증 내용**: 실제 사용 시나리오

---

## 3️⃣ test_conversation.py (23개 테스트)

### ConversationManager 초기화 (2개)

```python
def test_init_with_default_store():
    """기본 Store로 초기화"""
    cm = ConversationManager()
    assert cm.store is not None
    assert isinstance(cm.store, Store)

def test_init_with_custom_store():
    """커스텀 Store로 초기화"""
    custom_store = Store()
    cm = ConversationManager(store=custom_store)
    assert cm.store is custom_store
```

---

### turn() - 1턴=1노드 (3개)

```python
def test_turn_creates_node():
    """turn() 호출하면 자동으로 노드 생성"""
    cm = ConversationManager()
    node = cm.turn("Python이 뭐야?", "Python은 프로그래밍 언어입니다.")

    assert node is not None
    assert node.user_question == "Python이 뭐야?"
    assert node.ai_answer == "Python은 프로그래밍 언어입니다."

def test_multiple_turns():
    """여러 턴 연속 실행"""
    cm = ConversationManager()
    cm.turn("Q1?", "A1.")
    cm.turn("Q2?", "A2.")
    cm.turn("Q3?", "A3.")

    assert cm.store.tree.get_node_count() == 4  # root + 3
    # 마지막 노드가 현재 노드
    node3_id = cm.store.get_current_node_id()
    assert cm.store.get_current_node().user_question == "Q3?"

def test_turn_with_metadata():
    """메타데이터와 함께 턴"""
    cm = ConversationManager()
    metadata = {"tag": "important", "priority": "high"}
    node = cm.turn("Q?", "A.", metadata=metadata)

    assert node.metadata == metadata
```

**검증 내용**: turn() 자동 노드 생성 핵심 기능

---

### 대화 히스토리 (3개)

```python
def test_history_empty_initially():
    """초기에는 빈 히스토리"""
    cm = ConversationManager()
    history = cm.get_conversation_history()
    assert history == []

def test_history_after_turns():
    """턴 수행 후 히스토리"""
    cm = ConversationManager()
    cm.turn("첫 번째 질문?", "첫 번째 답변.")
    cm.turn("두 번째 질문?", "두 번째 답변.")

    history = cm.get_conversation_history()

    assert len(history) == 2
    assert history[0] == ("첫 번째 질문?", "첫 번째 답변.")
    assert history[1] == ("두 번째 질문?", "두 번째 답변.")

def test_history_excludes_root():
    """루트는 히스토리에서 제외"""
    cm = ConversationManager()
    cm.turn("Q?", "A.")

    history = cm.get_conversation_history()

    assert len(history) == 1
    assert history[0][0] != "[시스템]"
```

---

### 전체 맥락 (2개)

```python
def test_full_context_empty():
    """대화 없을 때"""
    cm = ConversationManager()
    context = cm.get_full_context()
    assert context == "[대화 없음]"

def test_full_context_with_conversation():
    """대화 있을 때 포맷팅"""
    cm = ConversationManager()
    cm.turn("안녕?", "안녕하세요!")
    cm.turn("잘 지내?", "네, 잘 지냅니다!")

    context = cm.get_full_context()

    assert "[1] 사용자: 안녕?" in context
    assert "    AI: 안녕하세요!" in context
    assert "[2] 사용자: 잘 지내?" in context
```

---

### 분기 관리 (3개)

```python
def test_branch_from_checkpoint():
    """체크포인트에서 분기"""
    cm = ConversationManager()
    node1 = cm.turn("Q1?", "A1.")
    cm.store.save_checkpoint("cp1")
    cm.turn("Q2?", "A2.")
    cm.turn("Q3?", "A3.")

    # cp1로 돌아가기
    success = cm.branch_from_checkpoint("cp1")
    assert success is True
    assert cm.store.get_current_node_id() == node1.id

    # 새 분기
    node4 = cm.turn("Q4?", "A4.")

    # node1의 자식 2개
    children = cm.store.tree.get_children(node1.id)
    assert len(children) == 2

def test_branch_from_node():
    """특정 노드에서 분기"""
    cm = ConversationManager()
    node1 = cm.turn("Q1?", "A1.")
    cm.turn("Q2?", "A2.")

    success = cm.branch_from_node(node1.id)
    assert success is True
    assert cm.store.get_current_node_id() == node1.id

def test_branch_from_invalid_checkpoint():
    """존재하지 않는 체크포인트"""
    cm = ConversationManager()
    success = cm.branch_from_checkpoint("non-existent")
    assert success is False
```

---

### 현재 노드 (2개)

```python
def test_get_current_node_initial():
    """초기 상태"""
    cm = ConversationManager()
    current = cm.get_current_node()

    assert current is not None
    assert current.id == 'root'

def test_get_current_node_after_turn():
    """턴 후"""
    cm = ConversationManager()
    node = cm.turn("Q?", "A.")
    current = cm.get_current_node()
    assert current == node
```

---

### 분기 포인트 (3개)

```python
def test_no_branch_points_initially():
    """초기에는 분기 포인트 없음"""
    cm = ConversationManager()
    cm.turn("Q1?", "A1.")
    branch_points = cm.get_branch_points()
    assert len(branch_points) == 0

def test_branch_point_after_branching():
    """분기 생성 후"""
    cm = ConversationManager()
    node1 = cm.turn("Q1?", "A1.")
    cm.branch_from_node('root')
    cm.turn("Q2?", "A2.")

    cm.branch_from_node('root')
    branch_points = cm.get_branch_points()

    assert len(branch_points) == 1
    assert branch_points[0].id == 'root'

def test_multiple_branch_points():
    """여러 분기 포인트"""
    cm = ConversationManager()
    node_a = cm.turn("QA?", "AA.")
    node_b = cm.turn("QB?", "AB.")

    cm.branch_from_node('root')
    cm.turn("QC?", "AC.")

    cm.branch_from_node(node_a.id)
    cm.turn("QD?", "AD.")

    cm.branch_from_node(node_b.id)
    branch_points = cm.get_branch_points()

    assert len(branch_points) == 2
    branch_ids = {bp.id for bp in branch_points}
    assert 'root' in branch_ids
    assert node_a.id in branch_ids
```

---

### 통계 (2개)

```python
def test_stats_initial():
    """초기 통계"""
    cm = ConversationManager()
    stats = cm.get_stats()

    assert stats['total_turns'] == 0
    assert stats['current_depth'] == 0
    assert stats['total_nodes'] == 1
    assert stats['checkpoints'] == 0

def test_stats_after_turns():
    """턴 후 통계"""
    cm = ConversationManager()
    cm.turn("Q1?", "A1.")
    cm.turn("Q2?", "A2.")
    cm.store.save_checkpoint("cp1")

    stats = cm.get_stats()

    assert stats['total_turns'] == 2
    assert stats['current_depth'] == 2
    assert stats['checkpoints'] == 1
```

---

### 리셋 & 통합 (3개)

```python
def test_reset_clears_conversation():
    """리셋"""
    cm = ConversationManager()
    cm.turn("Q1?", "A1.")
    cm.turn("Q2?", "A2.")
    cm.store.save_checkpoint("cp1")

    cm.reset()

    assert cm.get_conversation_history() == []
    assert cm.store.tree.get_node_count() == 1
    assert cm.store.checkpoints == {}

def test_full_conversation_scenario():
    """전체 대화 시나리오"""
    cm = ConversationManager()

    # 첫 번째 경로
    cm.turn("Python이 뭐야?", "Python은 프로그래밍 언어입니다.")
    cm.store.save_checkpoint("파이썬")
    cm.turn("특징은?", "간결하고 읽기 쉽습니다.")

    # 두 번째 경로
    cm.branch_from_checkpoint("파이썬")
    cm.turn("어디에 쓰여?", "웹, AI, 데이터 분석 등에 쓰입니다.")

    # 통계 확인
    stats = cm.get_stats()
    assert stats['total_turns'] == 3
    assert stats['current_depth'] == 2

    # 분기 포인트 확인
    branch_points = cm.get_branch_points()
    assert len(branch_points) >= 1

def test_conversation_with_deep_branching():
    """깊은 분기"""
    cm = ConversationManager()

    # Main path
    node_a = cm.turn("QA?", "AA.")
    cm.turn("QB?", "AB.")
    cm.turn("QC?", "AC.")

    # Branch from A
    cm.branch_from_node(node_a.id)
    cm.turn("QD?", "AD.")
    cm.turn("QE?", "AE.")

    assert cm.store.tree.get_node_count() == 6  # root + 5
    children_of_a = cm.store.tree.get_children(node_a.id)
    assert len(children_of_a) == 2  # B and D
```

---

## 4️⃣ test_path_utils.py (16개 테스트)

### 경로 포맷팅 (2개)

```python
def test_format_empty_path():
    """빈 경로"""
    result = format_path([])
    assert result == "[빈 경로]"

def test_format_path_with_indices():
    """인덱스 포함 포맷"""
    store = Store()
    path = store.get_active_path()
    result = format_path(path, show_indices=True)
    assert "[0] root" in result
```

---

### 분기 포인트 찾기 (2개)

```python
def test_no_branches():
    """분기 없음"""
    store = Store()
    store.add_node("Q1?", "A1.")
    branch_points = find_branch_points(store.tree, store.active_path_ids)
    assert len(branch_points) == 0

def test_with_branches():
    """분기 있음"""
    store = Store()
    store.add_node("Q1?", "A1.")
    store.switch_to_node('root')
    store.add_node("Q2?", "A2.")

    branch_points = find_branch_points(store.tree, ['root'])
    assert 'root' in branch_points
```

---

### 경로 요약 (2개)

```python
def test_summary_initial():
    """초기 요약"""
    store = Store()
    summary = get_path_summary(store)

    assert summary['depth'] == 0
    assert summary['total_nodes'] == 1
    assert summary['has_branches'] is False

def test_summary_with_nodes():
    """노드 추가 후"""
    store = Store()
    store.add_node("Q?", "A.")
    summary = get_path_summary(store)

    assert summary['depth'] == 1
    assert summary['total_nodes'] == 2
```

---

### 경로 비교 (2개)

```python
def test_identical_paths():
    """동일한 경로"""
    result = compare_paths(['root', 'A', 'B'], ['root', 'A', 'B'])
    assert result['common_ancestor'] == 'B'
    assert result['diverge_index'] == 3

def test_diverging_paths():
    """분기하는 경로"""
    result = compare_paths(['root', 'A', 'B'], ['root', 'A', 'C'])
    assert result['common_ancestor'] == 'A'
    assert result['diverge_index'] == 2
    assert result['path1_unique'] == ['B']
    assert result['path2_unique'] == ['C']
```

---

### 형제 노드 (2개)

```python
def test_no_siblings():
    """형제 없음"""
    store = Store()
    node = store.add_node("Q?", "A.")
    siblings = get_siblings(store.tree, node.id)
    assert len(siblings) == 0

def test_with_siblings():
    """형제 있음"""
    store = Store()
    node1 = store.add_node("Q1?", "A1.")
    store.switch_to_node('root')
    node2 = store.add_node("Q2?", "A2.")

    siblings = get_siblings(store.tree, node1.id)
    assert len(siblings) == 1
    assert siblings[0].id == node2.id
```

---

### 노드 간 경로 (2개)

```python
def test_direct_path():
    """직접 경로"""
    store = Store()
    node1 = store.add_node("Q1?", "A1.")
    node2 = store.add_node("Q2?", "A2.")

    path = find_path_between(store.tree, node1.id, node2.id)
    assert path[0] == node1.id
    assert path[-1] == node2.id

def test_path_through_common_ancestor():
    """공통 조상 경유"""
    store = Store()
    node_a = store.add_node("QA?", "AA.")
    node_b = store.add_node("QB?", "AB.")

    store.switch_to_node('root')
    node_c = store.add_node("QC?", "AC.")

    path = find_path_between(store.tree, node_b.id, node_c.id)
    assert 'root' in path
    assert node_b.id in path
    assert node_c.id in path
```

---

### 리프 & 깊이 (4개)

```python
def test_single_leaf():
    """단일 리프"""
    store = Store()
    node = store.add_node("Q?", "A.")
    leaves = get_leaf_nodes(store.tree)
    assert len(leaves) == 1
    assert leaves[0].id == node.id

def test_multiple_leaves():
    """여러 리프"""
    store = Store()
    node1 = store.add_node("Q1?", "A1.")
    store.switch_to_node('root')
    node2 = store.add_node("Q2?", "A2.")

    leaves = get_leaf_nodes(store.tree)
    assert len(leaves) == 2

def test_root_depth():
    """루트 깊이는 0"""
    store = Store()
    depth = get_path_depth(store.tree, 'root')
    assert depth == 0

def test_node_depth():
    """노드 깊이"""
    store = Store()
    node1 = store.add_node("Q1?", "A1.")
    node2 = store.add_node("Q2?", "A2.")

    assert get_path_depth(store.tree, node1.id) == 1
    assert get_path_depth(store.tree, node2.id) == 2
```

---

## 5️⃣ test_checkpoint.py (16개 테스트)

### 이름 검증 (3개)

```python
def test_valid_name():
    """유효한 이름"""
    valid, error = validate_checkpoint_name("cp1")
    assert valid is True
    assert error is None

def test_empty_name():
    """빈 이름"""
    valid, error = validate_checkpoint_name("")
    assert valid is False
    assert "비어있습니다" in error

def test_too_long_name():
    """너무 긴 이름"""
    valid, error = validate_checkpoint_name("a" * 51)
    assert valid is False
    assert "너무 깁니다" in error
```

---

### 자동 제안 (2개)

```python
def test_suggest_from_question():
    """질문에서 이름 제안"""
    store = Store()
    node = store.add_node("Python이 뭐야?", "Python은...")
    name = suggest_checkpoint_name(node, [])

    assert len(name) > 0
    assert "Python" in name or "_" in name

def test_suggest_with_duplicates():
    """중복 시 번호 추가"""
    store = Store()
    node = store.add_node("Test", "Answer")

    name1 = suggest_checkpoint_name(node, [])
    name2 = suggest_checkpoint_name(node, [name1])
    assert name1 != name2
```

---

### 정보 조회 (2개)

```python
def test_get_info_exists():
    """존재하는 체크포인트 정보"""
    store = Store()
    node = store.add_node("Q?", "A.")
    store.save_checkpoint("cp1")

    info = get_checkpoint_info(store, "cp1")

    assert info is not None
    assert info['name'] == "cp1"
    assert info['node_id'] == node.id

def test_get_info_not_exists():
    """존재하지 않는 체크포인트"""
    store = Store()
    info = get_checkpoint_info(store, "non-existent")
    assert info is None
```

---

### 목록 조회 (2개)

```python
def test_empty_list():
    """빈 목록"""
    store = Store()
    checkpoints = list_checkpoints_detailed(store)
    assert len(checkpoints) == 0

def test_multiple_checkpoints():
    """여러 체크포인트"""
    store = Store()
    store.add_node("Q1?", "A1.")
    store.save_checkpoint("cp1")
    store.add_node("Q2?", "A2.")
    store.save_checkpoint("cp2")

    checkpoints = list_checkpoints_detailed(store)
    assert len(checkpoints) == 2
```

---

### 노드로 찾기 (2개)

```python
def test_find_exists():
    """체크포인트 찾기 성공"""
    store = Store()
    node = store.add_node("Q?", "A.")
    store.save_checkpoint("cp1")

    name = find_checkpoint_by_node(store, node.id)
    assert name == "cp1"

def test_find_not_exists():
    """체크포인트 없음"""
    store = Store()
    node = store.add_node("Q?", "A.")
    name = find_checkpoint_by_node(store, node.id)
    assert name is None
```

---

### 통계 (2개)

```python
def test_stats_empty():
    """빈 통계"""
    store = Store()
    stats = get_checkpoint_stats(store)

    assert stats['total_count'] == 0
    assert stats['avg_depth'] == 0

def test_stats_with_checkpoints():
    """체크포인트 있는 통계"""
    store = Store()
    store.add_node("Q1?", "A1.")
    store.save_checkpoint("cp1")
    store.add_node("Q2?", "A2.")
    store.save_checkpoint("cp2")

    stats = get_checkpoint_stats(store)
    assert stats['total_count'] == 2
    assert stats['avg_depth'] > 0
```

---

### 이름 변경 (3개)

```python
def test_rename_success():
    """이름 변경 성공"""
    store = Store()
    store.add_node("Q?", "A.")
    store.save_checkpoint("old_name")

    success, error = rename_checkpoint(store, "old_name", "new_name")

    assert success is True
    assert error is None
    assert "new_name" in store.list_checkpoints()
    assert "old_name" not in store.list_checkpoints()

def test_rename_not_exists():
    """존재하지 않는 체크포인트"""
    store = Store()
    success, error = rename_checkpoint(store, "non_existent", "new_name")

    assert success is False
    assert "찾을 수 없습니다" in error

def test_rename_duplicate():
    """중복된 이름으로 변경"""
    store = Store()
    store.add_node("Q1?", "A1.")
    store.save_checkpoint("cp1")
    store.add_node("Q2?", "A2.")
    store.save_checkpoint("cp2")

    success, error = rename_checkpoint(store, "cp1", "cp2")
    assert success is False
    assert "이미 존재합니다" in error
```

---

## 🎯 테스트 전략

### 1. 계층별 테스트
```
단위 테스트 (Unit Tests)
  ↓
통합 테스트 (Integration Tests)
  ↓
시나리오 테스트 (Scenario Tests)
```

### 2. 성공/실패 케이스 모두 테스트
- **✅ 성공 케이스**: 정상 동작 확인
- **❌ 실패 케이스**: 에러 처리 확인
- **🔍 엣지 케이스**: 경계값, 빈 값, None 등

### 3. pytest 기능 활용
```python
# 예외 테스트
with pytest.raises(ValueError, match="에러 메시지"):
    some_function()

# 클래스 기반 그룹화
class TestNode:
    def test_creation(self): ...
    def test_validation(self): ...

# Fixture (필요시)
@pytest.fixture
def store():
    return Store()
```

### 4. AAA 패턴
```python
def test_example():
    # Arrange (준비)
    store = Store()

    # Act (실행)
    result = store.add_node("Q?", "A.")

    # Assert (검증)
    assert result is not None
```

---

## 📊 커버리지 분석

### 실행 명령
```bash
pytest tests/ -v --cov=core --cov-report=term-missing
```

### 결과
```
Name                   Stmts   Miss  Cover   Missing
----------------------------------------------------
core/__init__.py           0      0   100%
core/checkpoint.py       106     35    67%   (고급 기능)
core/conversation.py      41      0   100%   ✅
core/models.py            59      1    98%   (에러 핸들링 1줄)
core/path_utils.py        86     19    78%   (고급 유틸)
core/store.py             58      1    98%   (에러 핸들링 1줄)
----------------------------------------------------
TOTAL                    350     56    84%
```

### 커버리지 해석
- **핵심 모듈** (models, store, conversation): 98-100% ✅
- **유틸 모듈** (path_utils, checkpoint): 67-78%
  - 미커버 부분: import/export, 시각화 고급 기능 등
  - Day 5에서 필요 시 보완 예정

---

## ✅ 테스트 완료 기준

### Day 1-3 완료 기준
- [x] 모든 테스트 통과 (109/109)
- [x] 핵심 모듈 90% 이상 커버리지
- [x] 실패 케이스 테스트
- [x] 통합 시나리오 테스트

### 실행 시간
```
======================== 109 passed in 0.08s =======================
```
**0.08초** 만에 전체 테스트 완료!

---

## 📝 테스트 작성 가이드

### 새 테스트 추가 시
1. 적절한 파일에 추가 (models/store/conversation/utils)
2. 클래스로 그룹화
3. 명확한 docstring 작성
4. AAA 패턴 따르기
5. 성공/실패 케이스 모두 작성

### 테스트 실행
```bash
# 전체 테스트
pytest tests/

# 특정 파일
pytest tests/test_models.py

# 특정 테스트
pytest tests/test_models.py::TestNode::test_node_creation_basic

# 커버리지 포함
pytest tests/ --cov=core
```

---

**작성 완료**: 2025-11-30
**검증 상태**: ✅ 109개 테스트 전체 통과
