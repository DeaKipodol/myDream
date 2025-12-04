# TreeMemoryContext 🌳

> **Navigate AI conversations like a file system** - Branch, switch, and checkpoint your dialogue paths.

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Tests](https://img.shields.io/badge/Tests-133%20passed-green.svg)]()
[![Coverage](https://img.shields.io/badge/Coverage-81%25-yellowgreen.svg)]()
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/DeaKipodol/TreeMemoryContext?style=social)](https://github.com/DeaKipodol/TreeMemoryContext)

## What is this?

Ever wished you could **go back** in an AI conversation and try a different approach? Or **bookmark** an important point to return later?

Conversation Tree lets you:
- 🔀 **Branch** your conversations - explore multiple paths from any point
- 🔖 **Checkpoint** important moments - never lose your progress
- ⚡ **Switch** contexts instantly - jump between different conversation threads
- 📜 **Track history** - see where you've been, go back anytime

```
root
└── n1 "What is Python?" [checkpoint: basics]
    ├── n2 "Tell me about Django"
    │   └── n3 "How to build REST APIs?"
    └── n4 👉 "Tell me about Flask"  ← You are here
        └── n5 "What are Blueprints?"
```

## Why?

Traditional chat interfaces are **linear**. One conversation, one path, no going back.

But real thinking is **non-linear**:
- You want to explore alternatives
- You need to compare different approaches
- You make wrong turns and want to backtrack

Conversation Tree brings **version control to AI conversations**.

## Quick Start

### Installation

```bash
git clone https://github.com/DeaKipodol/TreeMemoryContext.git
cd TreeMemoryContext

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Setup OpenAI (Optional)

```bash
echo "OPENAI_API_KEY=your-key-here" > .env
```

### Run

```bash
python -m cli.cli
```

## Basic Usage

### Start a conversation

```bash
> ask What is Python?
✅ Node created: n1

> ask Tell me about Django
✅ Node created: n2
```

### Branch off

```bash
> switch n1           # Go back to "What is Python?"
> ask Tell me about Flask  # Create a new branch!
🔀 Branch created: checkpoint '@branch_n1' auto-saved
✅ Node created: n3
```

### Navigate

```bash
> tree                # See the full conversation tree
> path                # Show current path from root
> back                # Return to previous location
> checkpoint save important_point
> checkpoint load important_point
```

## Commands

| Command | Description |
|---------|-------------|
| `ask <question>` | Ask AI and create a new node |
| `switch <node>` | Jump to any node (e.g., `switch n1`) |
| `back` | Return to previous location |
| `tree` | Visualize conversation tree |
| `path` | Show current path |
| `checkpoint save <name>` | Bookmark current node |
| `checkpoint load <name>` | Jump to bookmark |
| `history` | Show conversation in current path |
| `nodes` | List all nodes |

See [CLI Guide](README_CLI.md) for full documentation.

## Architecture

```
core/                    # Business logic (framework-agnostic)
├── models.py           # Node, Tree data structures
├── store.py            # State management
├── conversation.py     # High-level conversation API
└── ai_client.py        # OpenAI integration

cli/                    # CLI interface
├── cli.py              # REPL and commands
└── visualizer.py       # Tree visualization
```

### Key Concepts

- **1 Turn = 1 Node**: Each Q&A pair creates exactly one node
- **Active Path**: Current conversation context (root → current node)
- **Checkpoints**: Named bookmarks to specific nodes
- **Auto-branching**: Automatic checkpoints when branches occur

## Roadmap

- [x] **CLI-1**: Core logic + AI integration ✅
- [ ] **CLI-2**: Cross-node context, reparenting, persistence
- [ ] **CLI-3**: Merge branches, LCA algorithms
- [ ] **UI-1**: Web interface with tree visualization
- [ ] **API**: REST API for integrations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with frustration from linear chat interfaces** 🚀
