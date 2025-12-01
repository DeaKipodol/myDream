"""
대화 트리 시스템의 핵심 모델.

이 모듈은 대화 노드와 트리를 표현하는 기본 데이터 구조를 포함합니다.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class Node:
    """
    트리 내에서 하나의 대화 턴을 표현하는 노드.

    각 노드는 하나의 Q&A 쌍을 포함하며, 부모 노드에 대한 링크를 유지하여
    트리 구조를 구현합니다.

    Attributes:
        id: 노드의 고유 식별자
        parent_id: 부모 노드의 ID (루트의 경우 None)
        user_question: 사용자의 질문/입력
        ai_answer: AI의 응답
        metadata: 추가 메타데이터 (태그 등)
        timestamp: 노드 생성 시각
    """

    id: str
    parent_id: Optional[str]
    user_question: str
    ai_answer: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        """초기화 후 노드 데이터 유효성 검증."""
        if not self.id:
            raise ValueError("Node id cannot be empty")
        if not self.user_question:
            raise ValueError("user_question cannot be empty")
        if not self.ai_answer:
            raise ValueError("ai_answer cannot be empty")


class Tree:
    """
    대화 트리 구조를 관리하는 클래스.

    이 클래스는 노드 관리, 경로 추적, 트리 순회를 포함한 트리 연산을 캡슐화합니다.
    모든 노드에 대한 단일 진실 공급원(single source of truth)을 유지합니다.

    설계 원칙: 단일 책임 원칙(SRP) - Tree 클래스는 트리 로직만 담당하며,
    애플리케이션 상태는 담당하지 않습니다.
    """

    def __init__(self, root_id: str = "root"):
        """
        루트 노드를 가진 새로운 대화 트리를 초기화합니다.

        Args:
            root_id: 루트 노드에 사용할 ID (기본값: 'root')
        """
        self.root_id = root_id
        self.nodes: Dict[str, Node] = {}

        # 루트 노드 생성
        self.nodes[root_id] = Node(
            id=root_id,
            parent_id=None,
            user_question="[시스템]",
            ai_answer="대화를 시작합니다",
            metadata={"type": "root"},
        )

    def add_node(self, node: Node) -> bool:
        """
        트리에 새 노드를 추가합니다.

        Args:
            node: 추가할 노드

        Returns:
            노드가 성공적으로 추가되면 True, 노드 ID가 이미 존재하면 False

        Raises:
            ValueError: parent_id가 트리에 존재하지 않는 경우 (루트 제외)
        """
        if node.id in self.nodes:
            return False

        # 부모 노드 존재 여부 검증 (루트 제외)
        if node.parent_id is not None and node.parent_id not in self.nodes:
            raise ValueError(f"Parent node '{node.parent_id}' does not exist")

        self.nodes[node.id] = node
        return True

    def get_node(self, node_id: str) -> Optional[Node]:
        """
        ID로 노드를 조회합니다.

        Args:
            node_id: 조회할 노드의 ID

        Returns:
            노드를 찾으면 해당 노드, 없으면 None
        """
        return self.nodes.get(node_id)

    def get_children(self, node_id: str) -> List[Node]:
        """
        노드의 모든 직접 자식 노드를 가져옵니다.

        Args:
            node_id: 부모 노드의 ID

        Returns:
            자식 노드 리스트 (없으면 빈 리스트)
        """
        if node_id not in self.nodes:
            return []

        return [node for node in self.nodes.values() if node.parent_id == node_id]

    def get_path_to_root(self, node_id: str) -> List[str]:
        """
        노드에서 루트까지의 경로를 가져옵니다.

        Args:
            node_id: 시작 노드의 ID

        Returns:
            node_id에서 루트까지의 노드 ID 리스트 (포함)
            node_id가 존재하지 않으면 빈 리스트
        """
        if node_id not in self.nodes:
            return []

        path = []
        current_id = node_id

        while current_id is not None:
            path.append(current_id)
            current_node = self.nodes.get(current_id)
            if current_node is None:
                break
            current_id = current_node.parent_id

        return path

    def node_exists(self, node_id: str) -> bool:
        """
        노드가 트리에 존재하는지 확인합니다.

        Args:
            node_id: 확인할 노드의 ID

        Returns:
            노드가 존재하면 True, 없으면 False
        """
        return node_id in self.nodes

    def get_node_count(self) -> int:
        """
        트리의 전체 노드 개수를 가져옵니다.

        Returns:
            루트를 포함한 노드 개수
        """
        return len(self.nodes)


def create_node(
    parent_id: str,
    user_question: str,
    ai_answer: str,
    metadata: Optional[Dict[str, Any]] = None,
    node_id: Optional[str] = None,
) -> Node:
    """
    자동 생성된 ID를 가진 새 노드를 생성하는 헬퍼 함수.

    Args:
        parent_id: 부모 노드의 ID
        user_question: 사용자의 질문
        ai_answer: AI의 답변
        metadata: 선택적 메타데이터 딕셔너리
        node_id: 선택적 커스텀 노드 ID (제공하지 않으면 자동 생성)

    Returns:
        새로운 Node 인스턴스
    """
    if node_id is None:
        node_id = str(uuid.uuid4())

    if metadata is None:
        metadata = {}

    return Node(
        id=node_id,
        parent_id=parent_id,
        user_question=user_question,
        ai_answer=ai_answer,
        metadata=metadata,
    )
