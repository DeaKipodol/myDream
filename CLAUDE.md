# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI conversation counseling system with tree-based dialogue branching, checkpointing, and path switching. The core concept is similar to a file system where clicking a node switches the active context path (like changing directories). Currently in Phase CLI-1 - terminal-based prototype.

## Development Commands

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run all tests
pytest

# Run tests with coverage
pytest --cov=core --cov=cli --cov-report=term-missing

# Run specific test file
pytest tests/test_models.py -v

# Run CLI application
python -m cli.cli
```

### Environment Setup
Create `.env` file with:
```
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini  # optional, defaults to gpt-4o-mini
```

## Architecture

```
core/           # Core business logic (no CLI dependencies)
├── models.py       # Node and Tree data structures
├── store.py        # Application state management (tree + active_path + checkpoints)
├── conversation.py # ConversationManager - wraps Store with "1 turn = 1 node" semantics
├── path_utils.py   # Path utilities (LCA, branch detection, path comparison)
├── checkpoint.py   # Checkpoint validation and listing utilities
└── ai_client.py    # OpenAI API integration

cli/            # CLI layer
├── cli.py          # REPL main loop and all commands
└── visualizer.py   # Tree/path visualization utilities

tests/          # 109 tests, 84% coverage
```

### Key Concepts

**Tree Structure**: Dialogue stored as a tree. Each `Node` contains a Q&A pair (user_question + ai_answer) with parent_id linking to parent node. Root node has parent_id=None.

**Active Path**: `Store.active_path_ids` is a list of node IDs from root to current leaf. Switching nodes recalculates this path by backtracking from target to root.

**1 Turn = 1 Node**: Each conversation turn (question + response) creates exactly one node via `ConversationManager.turn()`.

**Checkpoints**: Named bookmarks to specific nodes. Saved as `{name: node_id}` dict in Store. Automatic branch checkpoints created when branching occurs (prefixed with `@branch_`).

**Node Index**: CLI assigns sequential numbers (n1, n2...) to all nodes for easy reference instead of UUIDs.

### Path Switching Logic

When user clicks/switches to a target node:
1. Traverse from target up to root via parent_id
2. Reverse the path to get root->target order
3. Replace active_path_ids with new path
4. Context for AI is now the new path's dialogue sequence

This is the "simple replacement" approach - no LCA calculation needed for basic path switching.

### Layer Separation

- `models.py`: Pure data structures, no state management
- `store.py`: State management, owns Tree + active_path
- `conversation.py`: High-level dialogue API, delegates to Store
- `cli.py`: User interface only, calls ConversationManager/Store

## CLI Commands

Key commands (slash prefix optional):
- `ask <question>` - Ask AI and create node with response
- `switch <n1 or node_id>` - Switch to different node
- `tree` - Show full tree structure
- `path` - Show current active path
- `checkpoint save/load/list` - Manage checkpoints
- `back` - Return to previous location
- `nodes` - List all nodes with numbers

## Testing Patterns

Tests use pytest fixtures. Each test file focuses on one module:
- `test_models.py` - Node/Tree creation and validation
- `test_store.py` - State management, path switching
- `test_conversation.py` - Turn-based dialogue, history
- `test_path_utils.py` - Path comparison, LCA, siblings
- `test_checkpoint.py` - Checkpoint validation, naming

## Language Notes

Documentation files are mostly in Korean. Code comments and docstrings are in Korean. Variable names and code structure follow Python conventions in English.
