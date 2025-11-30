"""
path_utils 모듈 테스트.
"""

import pytest
from core.path_utils import (
    format_path, find_branch_points, get_path_summary,
    compare_paths, get_siblings, find_path_between,
    get_leaf_nodes, get_path_depth
)
from core.store import Store
from core.models import create_node


class TestFormatPath:
    """경로 포맷팅 테스트."""

    def test_format_empty_path(self):
        """빈 경로 포맷팅."""
        result = format_path([])
        assert result == "[빈 경로]"

    def test_format_path_with_indices(self):
        """인덱스를 포함한 경로 포맷팅."""
        store = Store()
        path = store.get_active_path()

        result = format_path(path, show_indices=True)

        assert "[0] root" in result


class TestFindBranchPoints:
    """분기 포인트 찾기 테스트."""

    def test_no_branches(self):
        """분기가 없는 경로."""
        store = Store()
        store.add_node("Q1?", "A1.")

        branch_points = find_branch_points(store.tree, store.active_path_ids)

        assert len(branch_points) == 0

    def test_with_branches(self):
        """분기가 있는 경로."""
        store = Store()
        store.add_node("Q1?", "A1.")
        store.switch_to_node('root')
        store.add_node("Q2?", "A2.")

        branch_points = find_branch_points(store.tree, ['root'])

        assert 'root' in branch_points


class TestGetPathSummary:
    """경로 요약 테스트."""

    def test_summary_initial(self):
        """초기 경로 요약."""
        store = Store()
        summary = get_path_summary(store)

        assert summary['depth'] == 0
        assert summary['total_nodes'] == 1
        assert summary['has_branches'] is False

    def test_summary_with_nodes(self):
        """노드 추가 후 요약."""
        store = Store()
        store.add_node("Q?", "A.")

        summary = get_path_summary(store)

        assert summary['depth'] == 1
        assert summary['total_nodes'] == 2


class TestComparePaths:
    """경로 비교 테스트."""

    def test_identical_paths(self):
        """동일한 경로."""
        result = compare_paths(['root', 'A', 'B'], ['root', 'A', 'B'])

        assert result['common_ancestor'] == 'B'
        assert result['diverge_index'] == 3

    def test_diverging_paths(self):
        """분기하는 경로."""
        result = compare_paths(['root', 'A', 'B'], ['root', 'A', 'C'])

        assert result['common_ancestor'] == 'A'
        assert result['diverge_index'] == 2
        assert result['path1_unique'] == ['B']
        assert result['path2_unique'] == ['C']


class TestGetSiblings:
    """형제 노드 조회 테스트."""

    def test_no_siblings(self):
        """형제가 없는 경우."""
        store = Store()
        node = store.add_node("Q?", "A.")

        siblings = get_siblings(store.tree, node.id)

        assert len(siblings) == 0

    def test_with_siblings(self):
        """형제가 있는 경우."""
        store = Store()
        node1 = store.add_node("Q1?", "A1.")
        store.switch_to_node('root')
        node2 = store.add_node("Q2?", "A2.")

        siblings = get_siblings(store.tree, node1.id)

        assert len(siblings) == 1
        assert siblings[0].id == node2.id


class TestFindPathBetween:
    """노드 간 경로 찾기 테스트."""

    def test_direct_path(self):
        """직접 경로."""
        store = Store()
        node1 = store.add_node("Q1?", "A1.")
        node2 = store.add_node("Q2?", "A2.")

        path = find_path_between(store.tree, node1.id, node2.id)

        assert path[0] == node1.id
        assert path[-1] == node2.id

    def test_path_through_common_ancestor(self):
        """공통 조상을 통한 경로."""
        store = Store()
        node_a = store.add_node("QA?", "AA.")
        node_b = store.add_node("QB?", "AB.")

        store.switch_to_node('root')
        node_c = store.add_node("QC?", "AC.")

        path = find_path_between(store.tree, node_b.id, node_c.id)

        assert 'root' in path
        assert node_b.id in path
        assert node_c.id in path


class TestGetLeafNodes:
    """리프 노드 조회 테스트."""

    def test_single_leaf(self):
        """단일 리프."""
        store = Store()
        node = store.add_node("Q?", "A.")

        leaves = get_leaf_nodes(store.tree)

        assert len(leaves) == 1
        assert leaves[0].id == node.id

    def test_multiple_leaves(self):
        """여러 리프."""
        store = Store()
        node1 = store.add_node("Q1?", "A1.")
        store.switch_to_node('root')
        node2 = store.add_node("Q2?", "A2.")

        leaves = get_leaf_nodes(store.tree)

        assert len(leaves) == 2


class TestGetPathDepth:
    """경로 깊이 조회 테스트."""

    def test_root_depth(self):
        """루트의 깊이는 0."""
        store = Store()
        depth = get_path_depth(store.tree, 'root')

        assert depth == 0

    def test_node_depth(self):
        """노드의 깊이."""
        store = Store()
        node1 = store.add_node("Q1?", "A1.")
        node2 = store.add_node("Q2?", "A2.")

        assert get_path_depth(store.tree, node1.id) == 1
        assert get_path_depth(store.tree, node2.id) == 2
