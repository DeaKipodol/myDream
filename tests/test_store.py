"""
Store 클래스에 대한 테스트.
"""

import pytest
from core.store import Store
from core.models import Node


class TestStoreInitialization:
    """Store 초기화 테스트."""

    def test_store_init(self):
        """Store가 올바르게 초기화되는지 확인."""
        store = Store()

        assert store.tree is not None
        assert store.tree.root_id == 'root'
        assert store.active_path_ids == ['root']
        assert store.checkpoints == {}

    def test_store_init_has_root(self):
        """Store 초기화 시 루트 노드가 생성되는지 확인."""
        store = Store()

        root_node = store.get_current_node()
        assert root_node is not None
        assert root_node.id == 'root'
        assert root_node.parent_id is None


class TestStoreReset:
    """Store reset 기능 테스트."""

    def test_reset_clears_all_state(self):
        """reset()이 모든 상태를 초기화하는지 확인."""
        store = Store()

        # 노드 추가
        store.add_node("Q1?", "A1.")
        store.add_node("Q2?", "A2.")
        store.save_checkpoint("cp1")

        # 상태가 변경됨
        assert len(store.active_path_ids) == 3  # root + 2 nodes
        assert len(store.checkpoints) == 1

        # 리셋
        store.reset()

        # 초기 상태로 복원됨
        assert store.active_path_ids == ['root']
        assert store.checkpoints == {}
        assert store.tree.get_node_count() == 1  # root only


class TestAddNode:
    """노드 추가 기능 테스트."""

    def test_add_node_basic(self):
        """기본 노드 추가 테스트."""
        store = Store()

        node = store.add_node("What is AI?", "AI is artificial intelligence.")

        assert node is not None
        assert node.user_question == "What is AI?"
        assert node.ai_answer == "AI is artificial intelligence."
        assert node.parent_id == "root"

    def test_add_node_updates_path(self):
        """노드 추가 시 active_path_ids가 업데이트되는지 확인."""
        store = Store()

        node1 = store.add_node("Q1?", "A1.")
        assert store.active_path_ids == ['root', node1.id]

        node2 = store.add_node("Q2?", "A2.")
        assert store.active_path_ids == ['root', node1.id, node2.id]

    def test_add_node_with_metadata(self):
        """메타데이터와 함께 노드를 추가."""
        store = Store()
        metadata = {"tag": "important"}

        node = store.add_node("Q?", "A.", metadata=metadata)

        assert node.metadata == metadata

    def test_add_multiple_nodes(self):
        """여러 노드를 연속으로 추가."""
        store = Store()

        node1 = store.add_node("Q1?", "A1.")
        node2 = store.add_node("Q2?", "A2.")
        node3 = store.add_node("Q3?", "A3.")

        assert store.tree.get_node_count() == 4  # root + 3
        assert store.get_current_node_id() == node3.id


class TestGetCurrentNode:
    """현재 노드 조회 테스트."""

    def test_get_current_node_id_initial(self):
        """초기 상태의 현재 노드 ID는 'root'."""
        store = Store()

        assert store.get_current_node_id() == 'root'

    def test_get_current_node_after_add(self):
        """노드 추가 후 현재 노드 확인."""
        store = Store()
        node = store.add_node("Q?", "A.")

        assert store.get_current_node_id() == node.id
        assert store.get_current_node() == node


class TestGetActivePath:
    """활성 경로 조회 테스트."""

    def test_get_active_path_initial(self):
        """초기 경로는 루트만 포함."""
        store = Store()
        path = store.get_active_path()

        assert len(path) == 1
        assert path[0].id == 'root'

    def test_get_active_path_multiple_nodes(self):
        """여러 노드 추가 후 전체 경로 확인."""
        store = Store()

        node1 = store.add_node("Q1?", "A1.")
        node2 = store.add_node("Q2?", "A2.")

        path = store.get_active_path()

        assert len(path) == 3
        assert path[0].id == 'root'
        assert path[1].id == node1.id
        assert path[2].id == node2.id


class TestSwitchToNode:
    """노드 전환 테스트."""

    def test_switch_to_sibling_node(self):
        """형제 노드로 전환."""
        store = Store()

        # root -> A -> B
        node_a = store.add_node("Question A?", "Answer A.")
        node_b = store.add_node("Question B?", "Answer B.")

        # root로 돌아가서 새 분기 생성
        store.switch_to_node('root')
        node_c = store.add_node("Question C?", "Answer C.")

        # 현재는 root -> C
        assert store.get_current_node_id() == node_c.id

        # B로 전환
        success = store.switch_to_node(node_b.id)

        assert success is True
        assert store.active_path_ids == ['root', node_a.id, node_b.id]

    def test_switch_to_ancestor(self):
        """조상 노드로 전환."""
        store = Store()

        node1 = store.add_node("Q1?", "A1.")
        node2 = store.add_node("Q2?", "A2.")
        node3 = store.add_node("Q3?", "A3.")

        # 현재: root -> 1 -> 2 -> 3
        # root로 전환
        success = store.switch_to_node('root')

        assert success is True
        assert store.active_path_ids == ['root']

    def test_switch_to_invalid_node(self):
        """존재하지 않는 노드로 전환 시도."""
        store = Store()

        success = store.switch_to_node('non-existent')

        assert success is False
        assert store.active_path_ids == ['root']  # 변경되지 않음


class TestCheckpoints:
    """체크포인트 기능 테스트."""

    def test_save_checkpoint_basic(self):
        """기본 체크포인트 저장."""
        store = Store()
        store.add_node("Q1?", "A1.")

        success = store.save_checkpoint("checkpoint-1")

        assert success is True
        assert "checkpoint-1" in store.checkpoints

    def test_save_checkpoint_duplicate_name(self):
        """중복된 이름으로 체크포인트 저장 시도."""
        store = Store()
        store.add_node("Q1?", "A1.")

        store.save_checkpoint("cp1")
        success = store.save_checkpoint("cp1")  # 중복

        assert success is False
        assert len(store.checkpoints) == 1

    def test_load_checkpoint_success(self):
        """체크포인트 로드 성공."""
        store = Store()

        node1 = store.add_node("Q1?", "A1.")
        store.save_checkpoint("cp1")

        node2 = store.add_node("Q2?", "A2.")

        # 현재 node2, cp1은 node1을 가리킴
        success = store.load_checkpoint("cp1")

        assert success is True
        assert store.get_current_node_id() == node1.id

    def test_load_checkpoint_not_exists(self):
        """존재하지 않는 체크포인트 로드 시도."""
        store = Store()

        success = store.load_checkpoint("non-existent")

        assert success is False

    def test_list_checkpoints(self):
        """모든 체크포인트 목록 조회."""
        store = Store()

        node1 = store.add_node("Q1?", "A1.")
        store.save_checkpoint("cp1")

        store.switch_to_node('root')
        node2 = store.add_node("Q2?", "A2.")
        store.save_checkpoint("cp2")

        checkpoints = store.list_checkpoints()

        assert len(checkpoints) == 2
        assert "cp1" in checkpoints
        assert "cp2" in checkpoints
        assert checkpoints["cp1"] == node1.id
        assert checkpoints["cp2"] == node2.id

    def test_delete_checkpoint_success(self):
        """체크포인트 삭제 성공."""
        store = Store()
        store.add_node("Q?", "A.")
        store.save_checkpoint("cp1")

        success = store.delete_checkpoint("cp1")

        assert success is True
        assert "cp1" not in store.checkpoints

    def test_delete_checkpoint_not_exists(self):
        """존재하지 않는 체크포인트 삭제 시도."""
        store = Store()

        success = store.delete_checkpoint("non-existent")

        assert success is False


class TestGetChildrenOfCurrent:
    """현재 노드의 자식 조회 테스트."""

    def test_get_children_none(self):
        """자식이 없는 경우."""
        store = Store()
        store.add_node("Q?", "A.")

        children = store.get_children_of_current()

        assert children == []

    def test_get_children_multiple(self):
        """여러 자식이 있는 경우."""
        store = Store()

        # root에 3개 자식 추가
        node1 = store.add_node("Q1?", "A1.")

        store.switch_to_node('root')
        node2 = store.add_node("Q2?", "A2.")

        store.switch_to_node('root')
        node3 = store.add_node("Q3?", "A3.")

        # root로 이동
        store.switch_to_node('root')
        children = store.get_children_of_current()

        assert len(children) == 3
        child_ids = {child.id for child in children}
        assert child_ids == {node1.id, node2.id, node3.id}


class TestGetTreeStats:
    """트리 통계 조회 테스트."""

    def test_get_stats_initial(self):
        """초기 통계."""
        store = Store()
        stats = store.get_tree_stats()

        assert stats["total_nodes"] == 1  # root only
        assert stats["path_depth"] == 1
        assert stats["checkpoints"] == 0

    def test_get_stats_after_operations(self):
        """여러 작업 후 통계."""
        store = Store()

        store.add_node("Q1?", "A1.")
        store.add_node("Q2?", "A2.")
        store.save_checkpoint("cp1")

        stats = store.get_tree_stats()

        assert stats["total_nodes"] == 3  # root + 2
        assert stats["path_depth"] == 3
        assert stats["checkpoints"] == 1


class TestStoreIntegration:
    """Store의 통합 시나리오 테스트."""

    def test_branching_conversation_scenario(self):
        """분기된 대화 시나리오 테스트."""
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

        # 검증: 총 5개 노드 (root + 4)
        assert store.tree.get_node_count() == 5

        # 검증: 현재 위치는 D
        assert store.get_current_node_id() == node_d.id

        # 검증: 파이썬 체크포인트로 이동
        store.load_checkpoint("파이썬")
        assert store.get_current_node_id() == node_a.id

        # 검증: root의 자식은 2개 (A, C)
        store.switch_to_node('root')
        children = store.get_children_of_current()
        assert len(children) == 2

    def test_checkpoint_and_continue(self):
        """체크포인트 저장 후 계속 대화."""
        store = Store()

        node1 = store.add_node("Q1?", "A1.")
        store.save_checkpoint("cp1")

        node2 = store.add_node("Q2?", "A2.")
        node3 = store.add_node("Q3?", "A3.")

        # cp1으로 돌아가서 새 분기 생성
        store.load_checkpoint("cp1")
        node4 = store.add_node("Q4?", "A4.")

        # 검증: node1에 2개 자식 (node2, node4)
        store.switch_to_node(node1.id)
        children = store.get_children_of_current()
        assert len(children) == 2
