"""
경로 관련 유틸리티 함수.

이 모듈은 경로 표시, 분석, 비교 등의 유틸리티 기능을 제공합니다.
"""

from typing import List, Optional, Tuple
from core.models import Node, Tree
from core.store import Store


def format_path(path: List[Node], show_indices: bool = True) -> str:
    """
    노드 경로를 읽기 쉬운 문자열로 포맷팅합니다.

    Args:
        path: Node 객체 리스트
        show_indices: 인덱스 표시 여부

    Returns:
        포맷팅된 경로 문자열

    Example:
        >>> path = [root_node, node1, node2]
        >>> print(format_path(path))
        [0] root
        [1] Python이 뭐야? → Python은...
        [2] 특징은? → 간결하고...
    """
    if not path:
        return "[빈 경로]"

    lines = []
    for idx, node in enumerate(path):
        if node.id == 'root':
            prefix = f"[{idx}] " if show_indices else ""
            lines.append(f"{prefix}root")
        else:
            prefix = f"[{idx}] " if show_indices else "  "
            q_preview = node.user_question[:30]
            a_preview = node.ai_answer[:30]
            lines.append(f"{prefix}{q_preview} → {a_preview}")

    return "\n".join(lines)


def find_branch_points(tree: Tree, path_ids: List[str]) -> List[str]:
    """
    경로 내에서 분기 포인트(자식이 2개 이상인 노드)를 찾습니다.

    Args:
        tree: Tree 객체
        path_ids: 노드 ID 리스트

    Returns:
        분기 포인트 노드 ID 리스트

    Example:
        >>> branch_points = find_branch_points(tree, ['root', 'node1', 'node2'])
        >>> 'root' in branch_points  # root has 2+ children
        True
    """
    branch_points = []

    for node_id in path_ids:
        children = tree.get_children(node_id)
        if len(children) >= 2:
            branch_points.append(node_id)

    return branch_points


def get_path_summary(store: Store) -> dict:
    """
    현재 경로에 대한 요약 정보를 반환합니다.

    Args:
        store: Store 객체

    Returns:
        경로 요약 정보 딕셔너리

    Example:
        >>> summary = get_path_summary(store)
        >>> summary['depth']  # 3
        >>> summary['has_branches']  # True
    """
    path = store.get_active_path()
    path_ids = store.active_path_ids

    branch_points = find_branch_points(store.tree, path_ids)

    return {
        'depth': len(path) - 1,  # 루트 제외
        'total_nodes': len(path),
        'has_branches': len(branch_points) > 0,
        'branch_count': len(branch_points),
        'current_node_id': store.get_current_node_id(),
        'path_ids': path_ids.copy()
    }


def compare_paths(path1_ids: List[str], path2_ids: List[str]) -> dict:
    """
    두 경로를 비교하여 공통 조상과 분기 지점을 찾습니다.

    Args:
        path1_ids: 첫 번째 경로의 노드 ID 리스트
        path2_ids: 두 번째 경로의 노드 ID 리스트

    Returns:
        비교 결과 딕셔너리

    Example:
        >>> result = compare_paths(['root', 'A', 'B'], ['root', 'A', 'C'])
        >>> result['common_ancestor']  # 'A'
        >>> result['diverge_index']  # 2
    """
    # 공통 접두사 찾기
    common_length = 0
    min_length = min(len(path1_ids), len(path2_ids))

    for i in range(min_length):
        if path1_ids[i] == path2_ids[i]:
            common_length += 1
        else:
            break

    common_ancestor = path1_ids[common_length - 1] if common_length > 0 else None
    diverge_index = common_length

    return {
        'common_ancestor': common_ancestor,
        'diverge_index': diverge_index,
        'common_path': path1_ids[:common_length],
        'path1_unique': path1_ids[common_length:],
        'path2_unique': path2_ids[common_length:]
    }


def get_siblings(tree: Tree, node_id: str) -> List[Node]:
    """
    노드의 형제 노드들을 반환합니다.

    Args:
        tree: Tree 객체
        node_id: 노드 ID

    Returns:
        형제 노드 리스트 (자기 자신 제외)

    Example:
        >>> siblings = get_siblings(tree, 'node-A')
        >>> len(siblings)  # 2 (node-B, node-C)
    """
    node = tree.get_node(node_id)
    if not node or node.parent_id is None:
        return []

    # 부모의 모든 자식 가져오기
    all_siblings = tree.get_children(node.parent_id)

    # 자기 자신 제외
    return [sibling for sibling in all_siblings if sibling.id != node_id]


def find_path_between(tree: Tree, from_id: str, to_id: str) -> Optional[List[str]]:
    """
    두 노드 사이의 경로를 찾습니다 (공통 조상을 통해).

    Args:
        tree: Tree 객체
        from_id: 시작 노드 ID
        to_id: 목표 노드 ID

    Returns:
        from_id에서 to_id까지의 노드 ID 리스트, 찾을 수 없으면 None

    Example:
        >>> path = find_path_between(tree, 'node-B', 'node-D')
        >>> # ['node-B', 'node-A', 'root', 'node-C', 'node-D']
    """
    if not tree.node_exists(from_id) or not tree.node_exists(to_id):
        return None

    # 각 노드에서 루트까지의 경로
    path_from_to_root = tree.get_path_to_root(from_id)
    path_to_to_root = tree.get_path_to_root(to_id)

    # 공통 조상 찾기
    common_ancestors = set(path_from_to_root) & set(path_to_to_root)
    if not common_ancestors:
        return None

    # 가장 가까운 공통 조상 (LCA)
    # path_from_to_root에서 가장 먼저 나오는 것이 가장 가까운 조상
    lca = None
    for node_id in path_from_to_root:
        if node_id in common_ancestors:
            lca = node_id
            break

    if lca is None:
        return None

    # from -> LCA 경로
    lca_index_from = path_from_to_root.index(lca)
    path_up = path_from_to_root[:lca_index_from]

    # LCA -> to 경로 (역순이므로 뒤집어야 함)
    lca_index_to = path_to_to_root.index(lca)
    path_down = list(reversed(path_to_to_root[:lca_index_to]))

    # 전체 경로 = up + [LCA] + down
    return path_up + [lca] + path_down


def get_tree_visualization_data(tree: Tree, root_id: str = 'root') -> List[dict]:
    """
    트리 시각화를 위한 데이터를 생성합니다.

    Args:
        tree: Tree 객체
        root_id: 시작 노드 ID

    Returns:
        각 노드의 레벨과 정보를 담은 딕셔너리 리스트

    Example:
        >>> data = get_tree_visualization_data(tree)
        >>> data[0]  # {'node_id': 'root', 'level': 0, 'children_count': 2, ...}
    """
    result = []

    def traverse(node_id: str, level: int):
        """재귀적으로 트리를 순회합니다."""
        node = tree.get_node(node_id)
        if not node:
            return

        children = tree.get_children(node_id)

        result.append({
            'node_id': node_id,
            'level': level,
            'children_count': len(children),
            'user_question': node.user_question,
            'ai_answer': node.ai_answer,
            'is_leaf': len(children) == 0,
            'has_branches': len(children) >= 2
        })

        for child in children:
            traverse(child.id, level + 1)

    traverse(root_id, 0)
    return result


def get_leaf_nodes(tree: Tree) -> List[Node]:
    """
    트리의 모든 리프 노드(자식이 없는 노드)를 반환합니다.

    Args:
        tree: Tree 객체

    Returns:
        리프 노드 리스트

    Example:
        >>> leaves = get_leaf_nodes(tree)
        >>> all(len(tree.get_children(leaf.id)) == 0 for leaf in leaves)
        True
    """
    leaves = []

    for node_id, node in tree.nodes.items():
        children = tree.get_children(node_id)
        if len(children) == 0:
            leaves.append(node)

    return leaves


def get_path_depth(tree: Tree, node_id: str) -> int:
    """
    노드의 깊이(루트로부터의 거리)를 반환합니다.

    Args:
        tree: Tree 객체
        node_id: 노드 ID

    Returns:
        깊이 (루트는 0)

    Example:
        >>> depth = get_path_depth(tree, 'node-3')
        >>> depth  # 3 (root -> node1 -> node2 -> node3)
    """
    path = tree.get_path_to_root(node_id)
    return len(path) - 1 if path else -1
