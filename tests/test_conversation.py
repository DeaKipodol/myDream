"""
ConversationManager 테스트.
"""

import pytest

from core.conversation import ConversationManager
from core.store import Store


class TestConversationManagerInit:
    """ConversationManager 초기화 테스트."""

    def test_init_with_default_store(self):
        """기본 Store로 초기화."""
        cm = ConversationManager()

        assert cm.store is not None
        assert isinstance(cm.store, Store)

    def test_init_with_custom_store(self):
        """커스텀 Store로 초기화."""
        custom_store = Store()
        cm = ConversationManager(store=custom_store)

        assert cm.store is custom_store


class TestTurn:
    """대화 턴 기능 테스트 (1턴 = 1노드)."""

    def test_turn_creates_node(self):
        """turn() 호출 시 노드가 생성되는지 확인."""
        cm = ConversationManager()

        node = cm.turn("Python이 뭐야?", "Python은 프로그래밍 언어입니다.")

        assert node is not None
        assert node.user_question == "Python이 뭐야?"
        assert node.ai_answer == "Python은 프로그래밍 언어입니다."

    def test_multiple_turns(self):
        """여러 턴을 연속으로 수행."""
        cm = ConversationManager()

        node1 = cm.turn("Q1?", "A1.")
        node2 = cm.turn("Q2?", "A2.")
        node3 = cm.turn("Q3?", "A3.")

        # 총 4개 노드 (root + 3)
        assert cm.store.tree.get_node_count() == 4
        assert cm.store.get_current_node_id() == node3.id

    def test_turn_with_metadata(self):
        """메타데이터와 함께 턴 수행."""
        cm = ConversationManager()
        metadata = {"tag": "important", "priority": "high"}

        node = cm.turn("Q?", "A.", metadata=metadata)

        assert node.metadata == metadata


class TestGetConversationHistory:
    """대화 이력 조회 테스트."""

    def test_history_empty_initially(self):
        """초기에는 대화 이력이 비어있음."""
        cm = ConversationManager()
        history = cm.get_conversation_history()

        assert history == []

    def test_history_after_turns(self):
        """턴 수행 후 이력 확인."""
        cm = ConversationManager()

        cm.turn("첫 번째 질문?", "첫 번째 답변.")
        cm.turn("두 번째 질문?", "두 번째 답변.")

        history = cm.get_conversation_history()

        assert len(history) == 2
        assert history[0] == ("첫 번째 질문?", "첫 번째 답변.")
        assert history[1] == ("두 번째 질문?", "두 번째 답변.")

    def test_history_excludes_root(self):
        """루트 노드는 이력에서 제외됨."""
        cm = ConversationManager()
        cm.turn("Q?", "A.")

        history = cm.get_conversation_history()

        # 루트는 포함되지 않음
        assert len(history) == 1
        assert history[0][0] != "[시스템]"


class TestGetFullContext:
    """전체 대화 맥락 조회 테스트."""

    def test_full_context_empty(self):
        """대화 없을 때 맥락."""
        cm = ConversationManager()
        context = cm.get_full_context()

        assert context == "[대화 없음]"

    def test_full_context_with_conversation(self):
        """대화 있을 때 맥락 포맷팅."""
        cm = ConversationManager()
        cm.turn("안녕?", "안녕하세요!")
        cm.turn("잘 지내?", "네, 잘 지냅니다!")

        context = cm.get_full_context()

        assert "[1] 사용자: 안녕?" in context
        assert "    AI: 안녕하세요!" in context
        assert "[2] 사용자: 잘 지내?" in context
        assert "    AI: 네, 잘 지냅니다!" in context


class TestBranching:
    """대화 분기 테스트."""

    def test_branch_from_checkpoint(self):
        """체크포인트에서 분기."""
        cm = ConversationManager()

        node1 = cm.turn("Q1?", "A1.")
        cm.store.save_checkpoint("cp1")

        cm.turn("Q2?", "A2.")
        cm.turn("Q3?", "A3.")

        # cp1로 돌아가기
        success = cm.branch_from_checkpoint("cp1")

        assert success is True
        assert cm.store.get_current_node_id() == node1.id

        # 새 분기 시작
        node4 = cm.turn("Q4?", "A4.")

        # node1의 자식이 2개 (node2, node4)
        children = cm.store.tree.get_children(node1.id)
        assert len(children) == 2

    def test_branch_from_node(self):
        """특정 노드에서 분기."""
        cm = ConversationManager()

        node1 = cm.turn("Q1?", "A1.")
        cm.turn("Q2?", "A2.")

        # node1로 돌아가기
        success = cm.branch_from_node(node1.id)

        assert success is True
        assert cm.store.get_current_node_id() == node1.id

    def test_branch_from_invalid_checkpoint(self):
        """존재하지 않는 체크포인트에서 분기 시도."""
        cm = ConversationManager()

        success = cm.branch_from_checkpoint("non-existent")

        assert success is False


class TestGetCurrentNode:
    """현재 노드 조회 테스트."""

    def test_get_current_node_initial(self):
        """초기 상태에서 현재 노드는 root."""
        cm = ConversationManager()
        current = cm.get_current_node()

        assert current is not None
        assert current.id == "root"

    def test_get_current_node_after_turn(self):
        """턴 수행 후 현재 노드."""
        cm = ConversationManager()
        node = cm.turn("Q?", "A.")

        current = cm.get_current_node()

        assert current == node


class TestGetBranchPoints:
    """분기 포인트 조회 테스트."""

    def test_no_branch_points_initially(self):
        """초기에는 분기 포인트 없음."""
        cm = ConversationManager()
        cm.turn("Q1?", "A1.")

        branch_points = cm.get_branch_points()

        assert len(branch_points) == 0

    def test_branch_point_after_branching(self):
        """분기 생성 후 분기 포인트 확인."""
        cm = ConversationManager()

        node1 = cm.turn("Q1?", "A1.")

        # 분기 생성
        cm.branch_from_node("root")
        cm.turn("Q2?", "A2.")

        # root는 분기 포인트
        cm.branch_from_node("root")
        branch_points = cm.get_branch_points()

        assert len(branch_points) == 1
        assert branch_points[0].id == "root"

    def test_multiple_branch_points(self):
        """여러 분기 포인트."""
        cm = ConversationManager()

        # root -> A -> B
        node_a = cm.turn("QA?", "AA.")
        node_b = cm.turn("QB?", "AB.")

        # root -> C (root는 분기 포인트)
        cm.branch_from_node("root")
        cm.turn("QC?", "AC.")

        # A -> D (A는 분기 포인트)
        cm.branch_from_node(node_a.id)
        cm.turn("QD?", "AD.")

        # root -> A -> B 경로로 이동
        cm.branch_from_node(node_b.id)
        branch_points = cm.get_branch_points()

        # root와 A가 분기 포인트
        assert len(branch_points) == 2
        branch_ids = {bp.id for bp in branch_points}
        assert "root" in branch_ids
        assert node_a.id in branch_ids


class TestGetStats:
    """통계 조회 테스트."""

    def test_stats_initial(self):
        """초기 통계."""
        cm = ConversationManager()
        stats = cm.get_stats()

        assert stats["total_turns"] == 0  # 루트 제외
        assert stats["current_depth"] == 0
        assert stats["total_nodes"] == 1  # root만
        assert stats["checkpoints"] == 0

    def test_stats_after_turns(self):
        """턴 수행 후 통계."""
        cm = ConversationManager()

        cm.turn("Q1?", "A1.")
        cm.turn("Q2?", "A2.")
        cm.store.save_checkpoint("cp1")

        stats = cm.get_stats()

        assert stats["total_turns"] == 2
        assert stats["current_depth"] == 2
        assert stats["total_nodes"] == 3
        assert stats["checkpoints"] == 1


class TestReset:
    """리셋 기능 테스트."""

    def test_reset_clears_conversation(self):
        """리셋 시 대화가 초기화됨."""
        cm = ConversationManager()

        cm.turn("Q1?", "A1.")
        cm.turn("Q2?", "A2.")
        cm.store.save_checkpoint("cp1")

        cm.reset()

        assert cm.get_conversation_history() == []
        assert cm.store.tree.get_node_count() == 1
        assert cm.store.checkpoints == {}


class TestConversationIntegration:
    """ConversationManager 통합 시나리오 테스트."""

    def test_full_conversation_scenario(self):
        """전체 대화 시나리오."""
        cm = ConversationManager()

        # 첫 번째 대화 경로
        cm.turn("Python이 뭐야?", "Python은 프로그래밍 언어입니다.")
        cm.store.save_checkpoint("파이썬")
        cm.turn("특징은?", "간결하고 읽기 쉽습니다.")

        # 두 번째 대화 경로
        cm.branch_from_checkpoint("파이썬")
        cm.turn("어디에 쓰여?", "웹, AI, 데이터 분석 등에 쓰입니다.")

        # 통계 확인
        stats = cm.get_stats()
        assert stats["total_turns"] == 3  # 전체 3턴
        assert stats["current_depth"] == 2  # 현재 깊이 2

        # 분기 포인트 확인
        branch_points = cm.get_branch_points()
        assert len(branch_points) >= 1

    def test_conversation_with_deep_branching(self):
        """깊은 분기가 있는 대화."""
        cm = ConversationManager()

        # Main path: root -> A -> B -> C
        node_a = cm.turn("QA?", "AA.")
        cm.turn("QB?", "AB.")
        cm.turn("QC?", "AC.")

        # Branch from A: A -> D -> E
        cm.branch_from_node(node_a.id)
        cm.turn("QD?", "AD.")
        cm.turn("QE?", "AE.")

        # Verify tree structure
        assert cm.store.tree.get_node_count() == 6  # root + 5
        children_of_a = cm.store.tree.get_children(node_a.id)
        assert len(children_of_a) == 2  # B and D
