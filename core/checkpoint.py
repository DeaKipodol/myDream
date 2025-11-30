"""
체크포인트(이름표) 관리 유틸리티.

이 모듈은 체크포인트 생성, 검증, 분석 등의 유틸리티 기능을 제공합니다.
"""

from typing import List, Dict, Optional
from datetime import datetime
from core.store import Store
from core.models import Node


def validate_checkpoint_name(name: str) -> tuple[bool, Optional[str]]:
    """
    체크포인트 이름의 유효성을 검증합니다.

    Args:
        name: 검증할 체크포인트 이름

    Returns:
        (유효 여부, 에러 메시지) 튜플

    Example:
        >>> valid, error = validate_checkpoint_name("cp1")
        >>> valid  # True
        >>> valid, error = validate_checkpoint_name("")
        >>> valid  # False
        >>> error  # "이름이 비어있습니다"
    """
    if not name:
        return False, "이름이 비어있습니다"

    if len(name) > 50:
        return False, "이름이 너무 깁니다 (최대 50자)"

    # 특수문자 제한 (공백, 특수기호 허용하지 않음)
    if not name.replace('_', '').replace('-', '').isalnum():
        return False, "영문, 숫자, 언더스코어(_), 하이픈(-)만 사용 가능합니다"

    return True, None


def suggest_checkpoint_name(node: Node, existing_names: List[str]) -> str:
    """
    노드 내용을 기반으로 체크포인트 이름을 제안합니다.

    Args:
        node: 노드 객체
        existing_names: 기존 체크포인트 이름 리스트

    Returns:
        제안된 체크포인트 이름

    Example:
        >>> name = suggest_checkpoint_name(node, ['cp1', 'cp2'])
        >>> name  # 'Python이_뭐야'
    """
    # 질문에서 키워드 추출 (첫 10자)
    base_name = node.user_question[:10].strip()

    # 특수문자를 언더스코어로 변경
    base_name = ''.join(c if c.isalnum() or c in ('_', '-') else '_' for c in base_name)

    # 중복 체크 및 번호 붙이기
    if base_name not in existing_names:
        return base_name

    counter = 1
    while f"{base_name}_{counter}" in existing_names:
        counter += 1

    return f"{base_name}_{counter}"


def get_checkpoint_info(store: Store, checkpoint_name: str) -> Optional[dict]:
    """
    체크포인트의 상세 정보를 반환합니다.

    Args:
        store: Store 객체
        checkpoint_name: 체크포인트 이름

    Returns:
        체크포인트 정보 딕셔너리, 없으면 None

    Example:
        >>> info = get_checkpoint_info(store, "cp1")
        >>> info['node_id']  # 'abc-123'
        >>> info['depth']  # 2
    """
    checkpoints = store.list_checkpoints()
    if checkpoint_name not in checkpoints:
        return None

    node_id = checkpoints[checkpoint_name]
    node = store.tree.get_node(node_id)
    if not node:
        return None

    path = store.tree.get_path_to_root(node_id)
    children = store.tree.get_children(node_id)

    return {
        'name': checkpoint_name,
        'node_id': node_id,
        'depth': len(path) - 1,  # 루트 제외
        'user_question': node.user_question,
        'ai_answer': node.ai_answer[:50],  # 미리보기
        'children_count': len(children),
        'timestamp': node.timestamp,
        'has_branches': len(children) >= 2
    }


def list_checkpoints_detailed(store: Store) -> List[dict]:
    """
    모든 체크포인트의 상세 정보를 반환합니다.

    Args:
        store: Store 객체

    Returns:
        체크포인트 정보 딕셔너리 리스트 (이름순 정렬)

    Example:
        >>> checkpoints = list_checkpoints_detailed(store)
        >>> for cp in checkpoints:
        ...     print(f"{cp['name']}: {cp['user_question']}")
    """
    result = []

    for name in sorted(store.list_checkpoints().keys()):
        info = get_checkpoint_info(store, name)
        if info:
            result.append(info)

    return result


def find_checkpoint_by_node(store: Store, node_id: str) -> Optional[str]:
    """
    특정 노드를 가리키는 체크포인트를 찾습니다.

    Args:
        store: Store 객체
        node_id: 노드 ID

    Returns:
        체크포인트 이름, 없으면 None

    Example:
        >>> name = find_checkpoint_by_node(store, 'node-abc')
        >>> name  # 'checkpoint-1'
    """
    checkpoints = store.list_checkpoints()

    for name, cp_node_id in checkpoints.items():
        if cp_node_id == node_id:
            return name

    return None


def export_checkpoints(store: Store) -> List[dict]:
    """
    체크포인트를 내보내기 형식으로 변환합니다.

    Args:
        store: Store 객체

    Returns:
        내보내기 데이터 리스트

    Example:
        >>> data = export_checkpoints(store)
        >>> # [{'name': 'cp1', 'node_id': 'abc', ...}, ...]
    """
    result = []
    checkpoints = store.list_checkpoints()

    for name, node_id in checkpoints.items():
        node = store.tree.get_node(node_id)
        if node:
            result.append({
                'name': name,
                'node_id': node_id,
                'user_question': node.user_question,
                'ai_answer': node.ai_answer,
                'metadata': node.metadata,
                'timestamp': node.timestamp.isoformat()
            })

    return result


def import_checkpoints(store: Store, data: List[dict]) -> tuple[int, List[str]]:
    """
    체크포인트를 가져옵니다.

    Args:
        store: Store 객체
        data: 내보내기 데이터 리스트

    Returns:
        (성공 개수, 실패한 이름 리스트) 튜플

    Example:
        >>> success, failures = import_checkpoints(store, data)
        >>> success  # 3
        >>> failures  # ['invalid-cp']
    """
    success_count = 0
    failures = []

    for item in data:
        name = item.get('name')
        node_id = item.get('node_id')

        if not name or not node_id:
            failures.append(name or 'unknown')
            continue

        # 노드가 존재하는지 확인
        if not store.tree.node_exists(node_id):
            failures.append(name)
            continue

        # 체크포인트 저장 시도
        if store.save_checkpoint(name):
            # 수동으로 node_id 설정 (이미 다른 노드에 있을 수 있으므로)
            store.checkpoints[name] = node_id
            success_count += 1
        else:
            failures.append(name)

    return success_count, failures


def get_checkpoint_stats(store: Store) -> dict:
    """
    체크포인트 통계를 반환합니다.

    Args:
        store: Store 객체

    Returns:
        통계 정보 딕셔너리

    Example:
        >>> stats = get_checkpoint_stats(store)
        >>> stats['total_count']  # 5
        >>> stats['avg_depth']  # 2.4
    """
    checkpoints = store.list_checkpoints()
    total = len(checkpoints)

    if total == 0:
        return {
            'total_count': 0,
            'avg_depth': 0,
            'max_depth': 0,
            'min_depth': 0,
            'branch_points': 0
        }

    depths = []
    branch_count = 0

    for node_id in checkpoints.values():
        path = store.tree.get_path_to_root(node_id)
        depth = len(path) - 1
        depths.append(depth)

        children = store.tree.get_children(node_id)
        if len(children) >= 2:
            branch_count += 1

    return {
        'total_count': total,
        'avg_depth': sum(depths) / total if total > 0 else 0,
        'max_depth': max(depths) if depths else 0,
        'min_depth': min(depths) if depths else 0,
        'branch_points': branch_count
    }


def cleanup_orphaned_checkpoints(store: Store) -> int:
    """
    존재하지 않는 노드를 가리키는 체크포인트를 삭제합니다.

    Args:
        store: Store 객체

    Returns:
        삭제된 체크포인트 개수

    Example:
        >>> deleted = cleanup_orphaned_checkpoints(store)
        >>> deleted  # 2 (2개의 고아 체크포인트 삭제됨)
    """
    orphaned = []

    for name, node_id in store.list_checkpoints().items():
        if not store.tree.node_exists(node_id):
            orphaned.append(name)

    for name in orphaned:
        store.delete_checkpoint(name)

    return len(orphaned)


def rename_checkpoint(store: Store, old_name: str, new_name: str) -> tuple[bool, Optional[str]]:
    """
    체크포인트 이름을 변경합니다.

    Args:
        store: Store 객체
        old_name: 기존 이름
        new_name: 새 이름

    Returns:
        (성공 여부, 에러 메시지) 튜플

    Example:
        >>> success, error = rename_checkpoint(store, "old", "new")
        >>> success  # True
    """
    # 새 이름 유효성 검증
    valid, error = validate_checkpoint_name(new_name)
    if not valid:
        return False, error

    # 기존 체크포인트 존재 확인
    checkpoints = store.list_checkpoints()
    if old_name not in checkpoints:
        return False, f"체크포인트 '{old_name}'을 찾을 수 없습니다"

    # 새 이름 중복 확인
    if new_name in checkpoints:
        return False, f"체크포인트 '{new_name}'이 이미 존재합니다"

    # 이름 변경
    node_id = checkpoints[old_name]
    store.delete_checkpoint(old_name)
    store.checkpoints[new_name] = node_id

    return True, None
