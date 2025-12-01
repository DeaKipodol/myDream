"""
트리 시각화 모듈.

대화 트리를 다양한 형식으로 시각화하여 출력합니다.
"""

from typing import Dict, List, Optional, Set

from core.models import Node, Tree
from core.store import Store


def visualize_tree(
    store: Store,
    highlight_path: bool = True,
    show_checkpoints: bool = True,
    max_depth: Optional[int] = None,
) -> str:
    """
    대화 트리를 ASCII 아트로 시각화합니다.

    Args:
        store: Store 객체
        highlight_path: 현재 활성 경로 강조 여부
        show_checkpoints: 체크포인트 표시 여부
        max_depth: 최대 표시 깊이 (None이면 전체)

    Returns:
        시각화된 트리 문자열

    Example:
        >>> output = visualize_tree(store)
        >>> print(output)
        🌱 ROOT
        ├── [1] abc-123 Python이란?
        │   └── [2] def-456 변수는?
        └── [1] ghi-789 Java란?
    """
    tree = store.tree
    active_ids = set(store.active_path_ids) if highlight_path else set()
    checkpoints = store.list_checkpoints() if show_checkpoints else {}
    checkpoint_map = {node_id: name for name, node_id in checkpoints.items()}

    lines = []
    lines.append("🌳 대화 트리")
    lines.append("=" * 60)
    lines.append("")

    # 루트부터 시작하여 재귀적으로 렌더링
    _render_node(
        tree=tree,
        node_id="root",
        lines=lines,
        prefix="",
        is_last=True,
        active_ids=active_ids,
        checkpoint_map=checkpoint_map,
        current_depth=0,
        max_depth=max_depth,
    )

    return "\n".join(lines)


def _render_node(
    tree: Tree,
    node_id: str,
    lines: List[str],
    prefix: str,
    is_last: bool,
    active_ids: Set[str],
    checkpoint_map: Dict[str, str],
    current_depth: int,
    max_depth: Optional[int],
):
    """
    노드를 재귀적으로 렌더링합니다.

    Args:
        tree: Tree 객체
        node_id: 현재 노드 ID
        lines: 출력 라인 리스트
        prefix: 현재 줄의 접두사 (들여쓰기)
        is_last: 마지막 자식 노드인지 여부
        active_ids: 활성 경로 노드 ID 집합
        checkpoint_map: 노드 ID → 체크포인트 이름 매핑
        current_depth: 현재 깊이
        max_depth: 최대 깊이
    """
    # 최대 깊이 체크
    if max_depth is not None and current_depth > max_depth:
        return

    node = tree.get_node(node_id)
    if not node:
        return

    # 현재 노드 렌더링
    connector = "└── " if is_last else "├── "
    active_marker = "👉 " if node_id in active_ids else ""
    checkpoint_marker = ""
    if node_id in checkpoint_map:
        checkpoint_marker = f" 📌{checkpoint_map[node_id]}"

    if node_id == "root":
        line = f"🌱 ROOT{checkpoint_marker}"
    else:
        node_id_short = node_id[:8]
        question_preview = node.user_question[:40]
        if len(node.user_question) > 40:
            question_preview += "..."
        line = f"{prefix}{connector}{active_marker}[{current_depth}] {node_id_short}... - {question_preview}{checkpoint_marker}"

    lines.append(line)

    # 자식 노드 렌더링
    children = tree.get_children(node_id)
    if not children:
        return

    for i, child_node in enumerate(children):
        is_last_child = i == len(children) - 1

        # 다음 레벨 접두사 계산
        if node_id == "root":
            next_prefix = ""
        else:
            if is_last:
                next_prefix = prefix + "    "
            else:
                next_prefix = prefix + "│   "

        _render_node(
            tree=tree,
            node_id=child_node.id,
            lines=lines,
            prefix=next_prefix,
            is_last=is_last_child,
            active_ids=active_ids,
            checkpoint_map=checkpoint_map,
            current_depth=current_depth + 1,
            max_depth=max_depth,
        )


def visualize_path(store: Store, show_content: bool = False) -> str:
    """
    현재 활성 경로를 시각화합니다.

    Args:
        store: Store 객체
        show_content: 노드 내용(질문/답변) 표시 여부

    Returns:
        시각화된 경로 문자열

    Example:
        >>> output = visualize_path(store, show_content=True)
        >>> print(output)
        📍 현재 활성 경로 (깊이: 2)

        [0] 🌱 ROOT

        [1] abc-123
        Q: Python이란?
        A: Python은 프로그래밍 언어입니다.
    """
    path = store.get_active_path()
    lines = []

    lines.append(f"📍 현재 활성 경로 (깊이: {len(path) - 1})")
    lines.append("=" * 60)
    lines.append("")

    for i, node in enumerate(path):
        if node.id == "root":
            lines.append(f"[{i}] 🌱 ROOT")
        else:
            node_id_short = node.id[:8]
            lines.append(f"[{i}] {node_id_short}...")

            if show_content:
                lines.append(f"Q: {node.user_question}")
                lines.append(f"A: {node.ai_answer}")

        lines.append("")

    return "\n".join(lines)


def visualize_node_detail(store: Store, node_id: str) -> str:
    """
    특정 노드의 상세 정보를 시각화합니다.

    Args:
        store: Store 객체
        node_id: 노드 ID

    Returns:
        시각화된 노드 상세 정보 문자열

    Example:
        >>> output = visualize_node_detail(store, 'abc-123')
        >>> print(output)
        📄 노드 상세 정보

        ID: abc-123-def-456
        부모 ID: root
        깊이: 1
        ...
    """
    node = store.tree.get_node(node_id)
    if not node:
        return f"❌ 노드 '{node_id}'를 찾을 수 없습니다."

    lines = []
    lines.append("📄 노드 상세 정보")
    lines.append("=" * 60)
    lines.append("")

    lines.append(f"ID: {node.id}")
    lines.append(f"부모 ID: {node.parent_id or 'None (루트)'}")

    # 깊이 계산
    path = store.tree.get_path_to_root(node_id)
    depth = len(path) - 1
    lines.append(f"깊이: {depth}")

    # 자식 노드 정보
    children = store.tree.get_children(node_id)
    lines.append(f"자식 노드 수: {len(children)}")
    if children:
        lines.append("자식 노드 ID:")
        for child in children:
            child_preview = child.user_question[:30]
            lines.append(f"  • {child.id[:8]}... - {child_preview}")

    lines.append("")

    # 체크포인트 확인
    checkpoints = store.list_checkpoints()
    checkpoint_names = [name for name, cp_id in checkpoints.items() if cp_id == node_id]
    if checkpoint_names:
        lines.append(f"체크포인트: {', '.join(checkpoint_names)}")
        lines.append("")

    # 노드 내용
    if node.id != "root":
        lines.append("질문:")
        lines.append(f"  {node.user_question}")
        lines.append("")
        lines.append("답변:")
        lines.append(f"  {node.ai_answer}")
        lines.append("")

    # 메타데이터
    if node.metadata:
        lines.append("메타데이터:")
        for key, value in node.metadata.items():
            lines.append(f"  {key}: {value}")
        lines.append("")

    # 타임스탬프
    lines.append(f"생성 시간: {node.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")

    return "\n".join(lines)


def visualize_siblings(store: Store, node_id: str) -> str:
    """
    특정 노드의 형제 노드를 시각화합니다.

    Args:
        store: Store 객체
        node_id: 노드 ID

    Returns:
        시각화된 형제 노드 정보

    Example:
        >>> output = visualize_siblings(store, 'abc-123')
        >>> print(output)
        👨‍👩‍👧‍👦 형제 노드 (2개)

        • abc-123 - Python이란? (현재)
        • def-456 - Java란?
    """
    node = store.tree.get_node(node_id)
    if not node:
        return f"❌ 노드 '{node_id}'를 찾을 수 없습니다."

    if not node.parent_id:
        return "❌ 루트 노드에는 형제 노드가 없습니다."

    # 부모의 모든 자식 조회
    siblings = store.tree.get_children(node.parent_id)
    if len(siblings) <= 1:
        return "ℹ️  형제 노드가 없습니다."

    lines = []
    lines.append(f"👨‍👩‍👧‍👦 형제 노드 ({len(siblings)}개)")
    lines.append("=" * 60)
    lines.append("")

    for sibling in siblings:
        current_marker = " (👉 현재)" if sibling.id == node_id else ""
        question_preview = sibling.user_question[:40]
        lines.append(f"• {sibling.id[:8]}... - {question_preview}{current_marker}")

    return "\n".join(lines)


def visualize_stats(store: Store) -> str:
    """
    트리 통계를 시각화합니다.

    Args:
        store: Store 객체

    Returns:
        시각화된 통계 정보

    Example:
        >>> output = visualize_stats(store)
        >>> print(output)
        📊 트리 통계

        전체 노드 수: 10
        최대 깊이: 5
        ...
    """
    from core.checkpoint import get_checkpoint_stats
    from core.conversation import ConversationManager
    from core.path_utils import find_branch_points

    conv = ConversationManager(store)
    tree_stats = conv.get_stats()
    cp_stats = get_checkpoint_stats(store)

    # Calculate branch points
    branch_points = find_branch_points(store.tree, store.active_path_ids)
    current_path_length = len(store.active_path_ids)

    lines = []
    lines.append("📊 트리 통계")
    lines.append("=" * 60)
    lines.append("")

    lines.append("[대화 트리]")
    lines.append(f"  전체 노드 수: {tree_stats['total_nodes']}")
    lines.append(f"  현재 경로 길이: {current_path_length}")
    lines.append(f"  현재 깊이: {tree_stats['current_depth']}")
    lines.append(f"  분기 포인트: {len(branch_points)}개")
    lines.append("")

    lines.append("[체크포인트]")
    lines.append(f"  전체 개수: {cp_stats['total_count']}")
    if cp_stats["total_count"] > 0:
        lines.append(f"  평균 깊이: {cp_stats['avg_depth']:.1f}")
        lines.append(f"  최대 깊이: {cp_stats['max_depth']}")
        lines.append(f"  최소 깊이: {cp_stats['min_depth']}")
        lines.append(f"  분기 체크포인트: {cp_stats['branch_points']}개")

    return "\n".join(lines)
