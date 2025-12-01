"""
애플리케이션 상태를 관리하는 Store 클래스.

이 모듈은 대화 트리와 현재 활성 경로, 체크포인트를 관리합니다.
"""

from typing import Dict, List, Optional

from core.models import Node, Tree, create_node


class Store:
    """
    애플리케이션의 전역 상태를 관리하는 클래스.

    Store는 다음을 관리합니다:
    - Tree 객체 (모든 노드 저장)
    - active_path_ids (현재 활성 경로)
    - checkpoints (이름표 시스템)

    설계 원칙:
    - Tree 객체 분리로 SRP 준수
    - active_path_ids로 O(1) 현재 노드 조회
    - reset()으로 테스트 격리 지원
    """

    def __init__(self):
        """Store 초기화 - 새로운 트리와 루트 경로 생성."""
        self.tree: Tree = Tree(root_id="root")
        self.active_path_ids: List[str] = ["root"]
        self.checkpoints: Dict[str, str] = {}

    def reset(self):
        """
        Store를 초기 상태로 리셋합니다.

        테스트 격리를 위해 사용됩니다.
        모든 상태를 초기화하고 새로운 트리를 생성합니다.
        """
        self.tree = Tree(root_id="root")
        self.active_path_ids = ["root"]
        self.checkpoints.clear()

    def get_current_node_id(self) -> str:
        """
        현재 활성 노드의 ID를 반환합니다.

        Returns:
            active_path_ids의 마지막 요소 (현재 노드 ID)
        """
        return self.active_path_ids[-1]

    def get_current_node(self) -> Optional[Node]:
        """
        현재 활성 노드를 반환합니다.

        Returns:
            현재 노드 객체, 없으면 None
        """
        return self.tree.get_node(self.get_current_node_id())

    def add_node(
        self, user_question: str, ai_answer: str, metadata: Optional[Dict] = None
    ) -> Node:
        """
        현재 노드의 자식으로 새 노드를 추가하고 활성 경로를 업데이트합니다.

        Args:
            user_question: 사용자 질문
            ai_answer: AI 응답
            metadata: 선택적 메타데이터

        Returns:
            생성된 Node 객체

        Raises:
            ValueError: 부모 노드가 존재하지 않는 경우
        """
        current_id = self.get_current_node_id()

        # 새 노드 생성
        new_node = create_node(
            parent_id=current_id,
            user_question=user_question,
            ai_answer=ai_answer,
            metadata=metadata,
        )

        # 트리에 추가
        success = self.tree.add_node(new_node)
        if not success:
            raise ValueError(f"Failed to add node {new_node.id}")

        # 활성 경로 업데이트
        self.active_path_ids.append(new_node.id)

        return new_node

    def get_active_path(self) -> List[Node]:
        """
        현재 활성 경로의 모든 노드를 반환합니다.

        Returns:
            루트부터 현재 노드까지의 Node 리스트
        """
        nodes = []
        for node_id in self.active_path_ids:
            node = self.tree.get_node(node_id)
            if node:
                nodes.append(node)
        return nodes

    def switch_to_node(self, target_node_id: str) -> bool:
        """
        다른 노드로 경로를 전환합니다 (단순 역추적 방식).

        Args:
            target_node_id: 전환할 대상 노드의 ID

        Returns:
            전환 성공 시 True, 실패 시 False
        """
        if not self.tree.node_exists(target_node_id):
            return False

        # 대상 노드에서 루트까지의 경로를 가져옴
        path_to_root = self.tree.get_path_to_root(target_node_id)

        # 경로를 뒤집어서 루트->대상 순서로 변경
        self.active_path_ids = list(reversed(path_to_root))

        return True

    def save_checkpoint(self, name: str) -> bool:
        """
        현재 노드에 이름표(체크포인트)를 저장합니다.

        Args:
            name: 체크포인트 이름

        Returns:
            저장 성공 시 True, 이미 존재하면 False
        """
        if name in self.checkpoints:
            return False

        self.checkpoints[name] = self.get_current_node_id()
        return True

    def load_checkpoint(self, name: str) -> bool:
        """
        저장된 체크포인트로 이동합니다.

        Args:
            name: 체크포인트 이름

        Returns:
            이동 성공 시 True, 체크포인트가 없으면 False
        """
        if name not in self.checkpoints:
            return False

        target_node_id = self.checkpoints[name]
        return self.switch_to_node(target_node_id)

    def list_checkpoints(self) -> Dict[str, str]:
        """
        모든 체크포인트 목록을 반환합니다.

        Returns:
            {이름: 노드ID} 딕셔너리
        """
        return self.checkpoints.copy()

    def delete_checkpoint(self, name: str) -> bool:
        """
        체크포인트를 삭제합니다.

        Args:
            name: 삭제할 체크포인트 이름

        Returns:
            삭제 성공 시 True, 없으면 False
        """
        if name not in self.checkpoints:
            return False

        del self.checkpoints[name]
        return True

    def get_children_of_current(self) -> List[Node]:
        """
        현재 노드의 모든 자식 노드를 반환합니다.

        Returns:
            자식 노드 리스트
        """
        current_id = self.get_current_node_id()
        return self.tree.get_children(current_id)

    def get_tree_stats(self) -> Dict[str, int]:
        """
        트리 통계를 반환합니다.

        Returns:
            통계 정보 딕셔너리
        """
        return {
            "total_nodes": self.tree.get_node_count(),
            "path_depth": len(self.active_path_ids),
            "checkpoints": len(self.checkpoints),
        }
