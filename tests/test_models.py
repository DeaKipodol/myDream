"""
Tests for core models (Node, Tree, and helper functions).
"""

from datetime import datetime

import pytest

from core.models import Node, Tree, create_node


class TestNode:
    """Test cases for the Node class."""

    def test_node_creation_basic(self):
        """Test basic node creation with required fields."""
        node = Node(
            id="test-1",
            parent_id="root",
            user_question="What is Python?",
            ai_answer="Python is a programming language.",
        )

        assert node.id == "test-1"
        assert node.parent_id == "root"
        assert node.user_question == "What is Python?"
        assert node.ai_answer == "Python is a programming language."
        assert node.metadata == {}
        assert isinstance(node.timestamp, datetime)

    def test_node_creation_with_metadata(self):
        """Test node creation with metadata."""
        metadata = {"tag": "python", "importance": "high"}
        node = Node(
            id="test-2",
            parent_id="root",
            user_question="Test?",
            ai_answer="Answer.",
            metadata=metadata,
        )

        assert node.metadata == metadata
        assert node.metadata["tag"] == "python"

    def test_node_creation_root(self):
        """Test creating a root node (no parent)."""
        node = Node(
            id="root",
            parent_id=None,
            user_question="[시스템]",
            ai_answer="대화를 시작합니다",
        )

        assert node.parent_id is None
        assert node.id == "root"

    def test_node_validation_empty_id(self):
        """Test that empty id raises ValueError."""
        with pytest.raises(ValueError, match="Node id cannot be empty"):
            Node(
                id="", parent_id="root", user_question="Question?", ai_answer="Answer."
            )

    def test_node_validation_empty_question(self):
        """Test that empty user_question raises ValueError."""
        with pytest.raises(ValueError, match="user_question cannot be empty"):
            Node(id="test-1", parent_id="root", user_question="", ai_answer="Answer.")

    def test_node_validation_empty_answer(self):
        """Test that empty ai_answer raises ValueError."""
        with pytest.raises(ValueError, match="ai_answer cannot be empty"):
            Node(id="test-1", parent_id="root", user_question="Question?", ai_answer="")


class TestTree:
    """Test cases for the Tree class."""

    def test_tree_initialization(self):
        """Test tree initialization creates root node."""
        tree = Tree()

        assert tree.root_id == "root"
        assert len(tree.nodes) == 1
        assert "root" in tree.nodes
        assert tree.nodes["root"].parent_id is None

    def test_tree_custom_root_id(self):
        """Test tree with custom root ID."""
        tree = Tree(root_id="custom-root")

        assert tree.root_id == "custom-root"
        assert "custom-root" in tree.nodes
        assert tree.nodes["custom-root"].parent_id is None

    def test_add_node_success(self):
        """Test adding a node successfully."""
        tree = Tree()
        node = Node(
            id="node-1",
            parent_id="root",
            user_question="Question 1?",
            ai_answer="Answer 1.",
        )

        result = tree.add_node(node)

        assert result is True
        assert tree.get_node_count() == 2
        assert tree.get_node("node-1") == node

    def test_add_node_duplicate_id(self):
        """Test that adding duplicate ID returns False."""
        tree = Tree()
        node1 = Node(
            id="node-1", parent_id="root", user_question="Q1?", ai_answer="A1."
        )
        node2 = Node(
            id="node-1",  # Same ID
            parent_id="root",
            user_question="Q2?",
            ai_answer="A2.",
        )

        tree.add_node(node1)
        result = tree.add_node(node2)

        assert result is False
        assert tree.get_node_count() == 2  # root + node1 only

    def test_add_node_invalid_parent(self):
        """Test that adding node with non-existent parent raises ValueError."""
        tree = Tree()
        node = Node(
            id="node-1", parent_id="non-existent", user_question="Q?", ai_answer="A."
        )

        with pytest.raises(
            ValueError, match="Parent node 'non-existent' does not exist"
        ):
            tree.add_node(node)

    def test_get_node_exists(self):
        """Test getting an existing node."""
        tree = Tree()
        node = Node(id="node-1", parent_id="root", user_question="Q?", ai_answer="A.")
        tree.add_node(node)

        retrieved = tree.get_node("node-1")

        assert retrieved is not None
        assert retrieved.id == "node-1"
        assert retrieved.user_question == "Q?"

    def test_get_node_not_exists(self):
        """Test getting a non-existent node returns None."""
        tree = Tree()

        result = tree.get_node("non-existent")

        assert result is None

    def test_get_children_multiple(self):
        """Test getting children when multiple exist."""
        tree = Tree()

        # Add three children to root
        for i in range(3):
            node = Node(
                id=f"child-{i}",
                parent_id="root",
                user_question=f"Q{i}?",
                ai_answer=f"A{i}.",
            )
            tree.add_node(node)

        children = tree.get_children("root")

        assert len(children) == 3
        child_ids = {child.id for child in children}
        assert child_ids == {"child-0", "child-1", "child-2"}

    def test_get_children_none(self):
        """Test getting children when none exist."""
        tree = Tree()

        node = Node(id="leaf", parent_id="root", user_question="Q?", ai_answer="A.")
        tree.add_node(node)

        children = tree.get_children("leaf")

        assert children == []

    def test_get_children_invalid_node(self):
        """Test getting children of non-existent node."""
        tree = Tree()

        children = tree.get_children("non-existent")

        assert children == []

    def test_get_path_to_root_direct_child(self):
        """Test path from direct child of root."""
        tree = Tree()
        node = Node(id="node-1", parent_id="root", user_question="Q?", ai_answer="A.")
        tree.add_node(node)

        path = tree.get_path_to_root("node-1")

        assert path == ["node-1", "root"]

    def test_get_path_to_root_deep(self):
        """Test path from deep node (3 levels)."""
        tree = Tree()

        # Create chain: root -> node-1 -> node-2 -> node-3
        node1 = Node(
            id="node-1", parent_id="root", user_question="Q1?", ai_answer="A1."
        )
        node2 = Node(
            id="node-2", parent_id="node-1", user_question="Q2?", ai_answer="A2."
        )
        node3 = Node(
            id="node-3", parent_id="node-2", user_question="Q3?", ai_answer="A3."
        )

        tree.add_node(node1)
        tree.add_node(node2)
        tree.add_node(node3)

        path = tree.get_path_to_root("node-3")

        assert path == ["node-3", "node-2", "node-1", "root"]

    def test_get_path_to_root_from_root(self):
        """Test path from root node itself."""
        tree = Tree()

        path = tree.get_path_to_root("root")

        assert path == ["root"]

    def test_get_path_to_root_invalid_node(self):
        """Test path from non-existent node."""
        tree = Tree()

        path = tree.get_path_to_root("non-existent")

        assert path == []

    def test_node_exists(self):
        """Test node_exists method."""
        tree = Tree()

        assert tree.node_exists("root") is True
        assert tree.node_exists("non-existent") is False

        node = Node(id="node-1", parent_id="root", user_question="Q?", ai_answer="A.")
        tree.add_node(node)

        assert tree.node_exists("node-1") is True

    def test_get_node_count(self):
        """Test node count tracking."""
        tree = Tree()

        assert tree.get_node_count() == 1  # Just root

        for i in range(5):
            node = Node(
                id=f"node-{i}",
                parent_id="root",
                user_question=f"Q{i}?",
                ai_answer=f"A{i}.",
            )
            tree.add_node(node)

        assert tree.get_node_count() == 6  # root + 5 nodes


class TestCreateNode:
    """Test cases for the create_node helper function."""

    def test_create_node_basic(self):
        """Test basic node creation."""
        node = create_node(
            parent_id="root",
            user_question="What is AI?",
            ai_answer="AI is artificial intelligence.",
        )

        assert node.parent_id == "root"
        assert node.user_question == "What is AI?"
        assert node.ai_answer == "AI is artificial intelligence."
        assert node.metadata == {}
        assert len(node.id) > 0  # Auto-generated ID

    def test_create_node_with_metadata(self):
        """Test node creation with metadata."""
        metadata = {"tag": "AI", "category": "tech"}
        node = create_node(
            parent_id="root", user_question="Q?", ai_answer="A.", metadata=metadata
        )

        assert node.metadata == metadata

    def test_create_node_with_custom_id(self):
        """Test node creation with custom ID."""
        node = create_node(
            parent_id="root",
            user_question="Q?",
            ai_answer="A.",
            node_id="custom-id-123",
        )

        assert node.id == "custom-id-123"

    def test_create_node_auto_id_unique(self):
        """Test that auto-generated IDs are unique."""
        node1 = create_node(parent_id="root", user_question="Q1?", ai_answer="A1.")
        node2 = create_node(parent_id="root", user_question="Q2?", ai_answer="A2.")

        assert node1.id != node2.id


class TestTreeIntegration:
    """Integration tests for Tree with multiple operations."""

    def test_branching_conversation(self):
        """Test creating a branching conversation tree."""
        tree = Tree()

        # First path: root -> A -> B
        node_a = create_node("root", "Question A?", "Answer A.")
        node_b = create_node(node_a.id, "Question B?", "Answer B.")

        # Second path: root -> C -> D
        node_c = create_node("root", "Question C?", "Answer C.")
        node_d = create_node(node_c.id, "Question D?", "Answer D.")

        tree.add_node(node_a)
        tree.add_node(node_b)
        tree.add_node(node_c)
        tree.add_node(node_d)

        # Verify structure
        assert tree.get_node_count() == 5  # root + 4 nodes
        assert len(tree.get_children("root")) == 2  # A and C
        assert len(tree.get_children(node_a.id)) == 1  # B
        assert len(tree.get_children(node_c.id)) == 1  # D

        # Verify paths
        path_b = tree.get_path_to_root(node_b.id)
        assert len(path_b) == 3  # B -> A -> root

        path_d = tree.get_path_to_root(node_d.id)
        assert len(path_d) == 3  # D -> C -> root
