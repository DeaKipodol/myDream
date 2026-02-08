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

---

## 중요: 프로젝트 이해 우선 원칙

Claude는 사용자 지시를 수행할 때 반드시 **우리 프로젝트의 맥락을 먼저 이해**해야 합니다.

### 올바른 접근
1. **우리 시스템 이해** — 현재 구조, 철학, 작동 방식 파악
2. **문제 정의** — 무엇이 부족한가, 무엇을 개선하려는가
3. **레퍼런스 분석** — 참조 대상의 **어떤 부분**이 우리 문제에 도움이 되는가
4. **선택적 적용** — 우리 기반을 유지하며, 필요한 부분만 차용

### 잘못된 접근 (금지)
- ❌ 레퍼런스(VS Code, Notion 등)를 **그대로 따라하기**
- ❌ 우리 시스템의 맥락 없이 일반론만 제시
- ❌ 기존 디자인 철학을 무시하고 재설계
- ❌ 사용자가 "VS Code처럼"이라고 하면 VS Code 전체를 복제

### 예시
**사용자**: "VS Code처럼 좌측에 아이콘 탭으로 전환하면 어때?"
- ❌ 잘못: VS Code의 전체 사이드바 구조로 재설계
- ✅ 올바름: 현재 엣지 독 유지 + 아이콘 탭 전환 개념만 차용 검토

경험 기반으로 점진적 개선. 직접 써보고 판단.

---

## Claude 작업 수행 사고 순서

모든 사용자 지시를 받았을 때 다음 순서로 사고합니다:

### 1단계: 맥락 파악
- [ ] 사용자가 **무엇을 원하는가** (요청의 본질)
- [ ] 사용자가 **왜** 이것을 원하는가 (동기/문제)
- [ ] **현재 시스템 상태**는 어떤가 (관련 파일, 구조 확인)

### 2단계: 프로젝트 이해 확인
- [ ] 이 요청이 **우리 시스템의 어느 부분**에 영향을 주는가
- [ ] **기존 디자인 철학/아키텍처**와 충돌하지 않는가
- [ ] **관련 명세 문서**가 있는가 (있으면 읽기)

### 3단계: 해결책 탐색
- [ ] 우리 시스템 내에서 해결 가능한가
- [ ] 레퍼런스가 필요하면, **어떤 부분**을 참조할 것인가
- [ ] 여러 접근법이 있다면, **우리 맥락에 가장 적합한** 것은?

### 4단계: 제안 또는 질문
- [ ] 명확하면 → 제안 (이유 포함)
- [ ] 불명확하면 → 질문 (선택지 제시)
- [ ] 큰 변경이면 → 토론 또는 Plan 모드

### 5단계: 실행
- [ ] 최소 변경으로 목표 달성
- [ ] 기존 구조 최대한 유지
- [ ] 변경 사항 문서화 (필요시)

### 금지 사항
- ❌ 1~2단계 건너뛰고 바로 구현
- ❌ 레퍼런스를 그대로 복제
- ❌ 사용자 의도를 추측만 하고 확인 안 함
- ❌ 큰 변경을 허가 없이 진행
