"""
대화 관리 모듈 - 자동 노드 생성 기능.

이 모듈은 Store를 래핑하여 대화 턴마다 자동으로 노드를 생성합니다.
핵심 원칙: 1턴 = 1노드
"""

from typing import Optional, Dict
from core.store import Store
from core.models import Node


class ConversationManager:
    """
    대화를 관리하고 자동으로 노드를 생성하는 클래스.

    매 대화 턴(사용자 질문 + AI 응답)마다 자동으로 새 노드를 생성합니다.
    Store의 상위 레이어로서 대화 중심의 인터페이스를 제공합니다.
    """

    def __init__(self, store: Optional[Store] = None):
        """
        ConversationManager 초기화.

        Args:
            store: 사용할 Store 인스턴스 (None이면 새로 생성)
        """
        self.store = store if store is not None else Store()

    def turn(
        self,
        user_question: str,
        ai_answer: str,
        metadata: Optional[Dict] = None
    ) -> Node:
        """
        대화 턴을 수행하고 자동으로 노드를 생성합니다.

        1턴 = 1노드 원칙에 따라, 이 메서드를 호출할 때마다
        새로운 노드가 현재 위치에 자동 추가됩니다.

        Args:
            user_question: 사용자의 질문
            ai_answer: AI의 응답
            metadata: 선택적 메타데이터

        Returns:
            생성된 Node 객체

        Example:
            >>> cm = ConversationManager()
            >>> node1 = cm.turn("Python이 뭐야?", "Python은 프로그래밍 언어입니다.")
            >>> node2 = cm.turn("특징은?", "간결하고 읽기 쉽습니다.")
        """
        return self.store.add_node(user_question, ai_answer, metadata)

    def get_conversation_history(self) -> list[tuple[str, str]]:
        """
        현재 활성 경로의 대화 이력을 반환합니다.

        Returns:
            (사용자 질문, AI 응답) 튜플의 리스트 (루트 제외)

        Example:
            >>> cm = ConversationManager()
            >>> cm.turn("Q1?", "A1.")
            >>> cm.turn("Q2?", "A2.")
            >>> history = cm.get_conversation_history()
            >>> len(history)  # 2
        """
        path = self.store.get_active_path()

        # 루트 노드 제외
        conversation_nodes = [node for node in path if node.id != 'root']

        return [
            (node.user_question, node.ai_answer)
            for node in conversation_nodes
        ]

    def get_full_context(self) -> str:
        """
        현재까지의 전체 대화 맥락을 문자열로 반환합니다.

        Returns:
            대화 이력을 포맷팅한 문자열

        Example:
            >>> cm = ConversationManager()
            >>> cm.turn("안녕?", "안녕하세요!")
            >>> print(cm.get_full_context())
            [1] 사용자: 안녕?
                AI: 안녕하세요!
        """
        history = self.get_conversation_history()

        if not history:
            return "[대화 없음]"

        lines = []
        for idx, (question, answer) in enumerate(history, 1):
            lines.append(f"[{idx}] 사용자: {question}")
            lines.append(f"    AI: {answer}")

        return "\n".join(lines)

    def branch_from_checkpoint(self, checkpoint_name: str) -> bool:
        """
        체크포인트로 이동하여 새로운 대화 분기를 시작합니다.

        Args:
            checkpoint_name: 이동할 체크포인트 이름

        Returns:
            이동 성공 시 True, 실패 시 False

        Example:
            >>> cm = ConversationManager()
            >>> cm.turn("Q1?", "A1.")
            >>> cm.store.save_checkpoint("cp1")
            >>> cm.turn("Q2?", "A2.")
            >>> cm.branch_from_checkpoint("cp1")  # cp1로 돌아가서 새 분기 시작
            True
        """
        return self.store.load_checkpoint(checkpoint_name)

    def branch_from_node(self, node_id: str) -> bool:
        """
        특정 노드로 이동하여 새로운 대화 분기를 시작합니다.

        Args:
            node_id: 이동할 노드의 ID

        Returns:
            이동 성공 시 True, 실패 시 False

        Example:
            >>> cm = ConversationManager()
            >>> node1 = cm.turn("Q1?", "A1.")
            >>> cm.turn("Q2?", "A2.")
            >>> cm.branch_from_node(node1.id)  # node1로 돌아가서 새 분기
            True
        """
        return self.store.switch_to_node(node_id)

    def get_current_node(self) -> Optional[Node]:
        """
        현재 위치의 노드를 반환합니다.

        Returns:
            현재 Node 객체
        """
        return self.store.get_current_node()

    def get_branch_points(self) -> list[Node]:
        """
        현재 경로에서 분기가 가능한 노드들을 반환합니다.

        분기 가능 = 자식이 2개 이상 있는 노드

        Returns:
            분기 가능한 노드 리스트

        Example:
            >>> cm = ConversationManager()
            >>> node1 = cm.turn("Q1?", "A1.")
            >>> cm.branch_from_node("root")
            >>> node2 = cm.turn("Q2?", "A2.")
            >>> # root에 2개 자식 -> 분기 포인트
            >>> branch_points = cm.get_branch_points()
            >>> len(branch_points)  # 1 (root)
        """
        path = self.store.get_active_path()
        branch_points = []

        for node in path:
            children = self.store.tree.get_children(node.id)
            if len(children) >= 2:
                branch_points.append(node)

        return branch_points

    def get_stats(self) -> Dict:
        """
        대화 통계를 반환합니다.

        Returns:
            통계 정보 딕셔너리

        Example:
            >>> cm = ConversationManager()
            >>> cm.turn("Q?", "A.")
            >>> stats = cm.get_stats()
            >>> stats['total_turns']  # 1
        """
        tree_stats = self.store.get_tree_stats()

        # 루트 제외한 실제 대화 턴 수
        total_turns = tree_stats['total_nodes'] - 1

        return {
            'total_turns': total_turns,
            'current_depth': tree_stats['path_depth'] - 1,  # 루트 제외
            'total_nodes': tree_stats['total_nodes'],
            'checkpoints': tree_stats['checkpoints']
        }

    def reset(self):
        """
        대화를 초기화합니다.

        모든 노드와 체크포인트가 삭제되고 새로운 대화가 시작됩니다.
        """
        self.store.reset()
