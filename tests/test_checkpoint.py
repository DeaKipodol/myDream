"""
checkpoint 모듈 테스트.
"""

import pytest
from core.checkpoint import (
    validate_checkpoint_name, suggest_checkpoint_name,
    get_checkpoint_info, list_checkpoints_detailed,
    find_checkpoint_by_node, get_checkpoint_stats,
    rename_checkpoint
)
from core.store import Store
from core.models import create_node


class TestValidateCheckpointName:
    """체크포인트 이름 검증 테스트."""

    def test_valid_name(self):
        """유효한 이름."""
        valid, error = validate_checkpoint_name("cp1")

        assert valid is True
        assert error is None

    def test_empty_name(self):
        """빈 이름."""
        valid, error = validate_checkpoint_name("")

        assert valid is False
        assert "비어있습니다" in error

    def test_too_long_name(self):
        """너무 긴 이름."""
        valid, error = validate_checkpoint_name("a" * 51)

        assert valid is False
        assert "너무 깁니다" in error


class TestSuggestCheckpointName:
    """체크포인트 이름 제안 테스트."""

    def test_suggest_from_question(self):
        """질문에서 이름 제안."""
        store = Store()
        node = store.add_node("Python이 뭐야?", "Python은...")

        name = suggest_checkpoint_name(node, [])

        assert len(name) > 0
        assert "Python" in name or "_" in name

    def test_suggest_with_duplicates(self):
        """중복 시 번호 붙이기."""
        store = Store()
        node = store.add_node("Test", "Answer")

        name1 = suggest_checkpoint_name(node, [])
        name2 = suggest_checkpoint_name(node, [name1])

        assert name1 != name2


class TestGetCheckpointInfo:
    """체크포인트 정보 조회 테스트."""

    def test_get_info_exists(self):
        """존재하는 체크포인트 정보."""
        store = Store()
        node = store.add_node("Q?", "A.")
        store.save_checkpoint("cp1")

        info = get_checkpoint_info(store, "cp1")

        assert info is not None
        assert info['name'] == "cp1"
        assert info['node_id'] == node.id

    def test_get_info_not_exists(self):
        """존재하지 않는 체크포인트."""
        store = Store()

        info = get_checkpoint_info(store, "non-existent")

        assert info is None


class TestListCheckpointsDetailed:
    """체크포인트 목록 조회 테스트."""

    def test_empty_list(self):
        """빈 목록."""
        store = Store()

        checkpoints = list_checkpoints_detailed(store)

        assert len(checkpoints) == 0

    def test_multiple_checkpoints(self):
        """여러 체크포인트."""
        store = Store()
        store.add_node("Q1?", "A1.")
        store.save_checkpoint("cp1")

        store.add_node("Q2?", "A2.")
        store.save_checkpoint("cp2")

        checkpoints = list_checkpoints_detailed(store)

        assert len(checkpoints) == 2


class TestFindCheckpointByNode:
    """노드로 체크포인트 찾기 테스트."""

    def test_find_exists(self):
        """체크포인트 찾기 성공."""
        store = Store()
        node = store.add_node("Q?", "A.")
        store.save_checkpoint("cp1")

        name = find_checkpoint_by_node(store, node.id)

        assert name == "cp1"

    def test_find_not_exists(self):
        """체크포인트 없음."""
        store = Store()
        node = store.add_node("Q?", "A.")

        name = find_checkpoint_by_node(store, node.id)

        assert name is None


class TestGetCheckpointStats:
    """체크포인트 통계 테스트."""

    def test_stats_empty(self):
        """빈 체크포인트 통계."""
        store = Store()

        stats = get_checkpoint_stats(store)

        assert stats['total_count'] == 0
        assert stats['avg_depth'] == 0

    def test_stats_with_checkpoints(self):
        """체크포인트가 있는 통계."""
        store = Store()
        store.add_node("Q1?", "A1.")
        store.save_checkpoint("cp1")

        store.add_node("Q2?", "A2.")
        store.save_checkpoint("cp2")

        stats = get_checkpoint_stats(store)

        assert stats['total_count'] == 2
        assert stats['avg_depth'] > 0


class TestRenameCheckpoint:
    """체크포인트 이름 변경 테스트."""

    def test_rename_success(self):
        """이름 변경 성공."""
        store = Store()
        store.add_node("Q?", "A.")
        store.save_checkpoint("old_name")

        success, error = rename_checkpoint(store, "old_name", "new_name")

        assert success is True
        assert error is None
        assert "new_name" in store.list_checkpoints()
        assert "old_name" not in store.list_checkpoints()

    def test_rename_not_exists(self):
        """존재하지 않는 체크포인트 이름 변경."""
        store = Store()

        success, error = rename_checkpoint(store, "non_existent", "new_name")

        assert success is False
        assert "찾을 수 없습니다" in error

    def test_rename_duplicate(self):
        """중복된 이름으로 변경."""
        store = Store()
        store.add_node("Q1?", "A1.")
        store.save_checkpoint("cp1")

        store.add_node("Q2?", "A2.")
        store.save_checkpoint("cp2")

        success, error = rename_checkpoint(store, "cp1", "cp2")

        assert success is False
        assert "이미 존재합니다" in error
