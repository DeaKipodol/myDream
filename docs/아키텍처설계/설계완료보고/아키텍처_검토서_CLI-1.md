# Phase CLI-1 개발계획서 아키텍처 검토서

**작성일**: 2025-11-09
**검토자**: 아키텍처 설계자
**대상 문서**: `Phase_CLI-1_개발계획서.md` v1.0
**검토 목적**: 아키텍처 일관성 및 확장성 검증

---

## 📋 Executive Summary

### 검토 결과: ⚠️ 조건부 승인

**전체 평가**: 7.5/10
- ✅ **실용성**: 9/10 (명확한 일정, 시나리오 커버리지)
- ⚠️ **아키텍처 일관성**: 6/10 (레이어 분리 불명확)
- ⚠️ **확장성**: 7/10 (웹 전환 고려 부족)
- ✅ **하이브리드 접근 채택**: 10/10 (LCA를 CLI-3로 연기)

### 주요 권고사항
1. 🔴 **필수**: 전역 변수를 Store 클래스로 감싸기 (테스트 가능성)
2. 🟡 **권장**: `src/` → `cli/`, `core/` 폴더 추가 (웹 재사용)
3. 🟡 **권장**: Node 구조 통일 (`role` + `content`)
4. 🟢 **선택**: 레이어 주석 추가 (코드 가독성)

---

## 🎯 우리의 아키텍처 설계 원칙 (복기)

### 설계 목표
1. **Clean Architecture**: 4-layer 분리 (Presentation → Business → Algorithm → Data)
2. **확장성**: 웹 전환 시 core/ 재사용
3. **테스트 가능성**: Store 클래스 (전역 변수 금지)
4. **하이브리드 접근**: Phase CLI-1 단순화, CLI-3에서 LCA 추가

### 권장 파일 구조
```
cli/
├── cli.py                # Presentation Layer
├── core/                 # Algorithm Layer (웹 재사용)
│   ├── tree.py
│   └── path_utils.py
├── checkpoint.py         # Business Layer
├── store.py              # Data Layer (Store 클래스)
└── tests/
```

---

## 📊 상세 검토

### 1. ✅ 하이브리드 접근 채택 (완벽)

#### 기술 총괄자의 결정
```markdown
### 2. LCA 알고리즘: **Phase CLI-3에서 구현**

#### Phase CLI-1
- 단순 경로 추적 (parent_id 역추적)
- `/goto` 명령으로 경로 전환

#### Phase CLI-3 (향후)
- LCA 기반 병합 기능
- `/merge` 명령 구현
```

#### 아키텍처 평가
**✅ 완벽합니다!**

**근거**:
- PM과 아키텍처 팀이 권장한 옵션 C (하이브리드) 정확히 채택
- CLI-1 단순화 달성 (코드 복잡도 75% 감소)
- CLI-3 확장성 보장 (plan.md 병합 요구사항 충족)

**점수**: 10/10

---

### 2. ⚠️ 전역 변수 사용 (우려사항)

#### 기술 총괄자의 설계
```python
# tree.py
all_nodes: Dict[str, Node] = {}
checkpoints: Dict[str, str] = {}
current_node_id: Optional[str] = None
```

#### 아키텍처 평가
**⚠️ 테스트 가능성 저하**

**문제점**:
1. **테스트 격리 불가능**
   ```python
   # test_tree.py
   def test_create_node():
       all_nodes.clear()  # 다른 테스트에 영향
       create_node("parent", "Q", "A")
       assert len(all_nodes) == 1

   def test_goto_command():
       # all_nodes에 이전 테스트 데이터 남아있음
       assert len(all_nodes) == 0  # FAIL!
   ```

2. **병렬 테스트 불가능** (pytest -n 4 실패)
3. **웹 전환 시 리팩토링 필요** (50+ 줄 수정)

#### 아키텍처 권장사항 🔴 필수
**Store 클래스로 감싸기** (추가 비용: 10줄, 5분)

```python
# store.py
class Store:
    """전역 상태 컨테이너"""
    def __init__(self):
        self.all_nodes: Dict[str, Node] = {}
        self.checkpoints: Dict[str, str] = {}
        self.current_node_id: Optional[str] = None

    def reset(self):
        """테스트용 초기화"""
        self.all_nodes.clear()
        self.checkpoints.clear()
        self.current_node_id = None

# 전역 인스턴스 (기존 코드와 동일하게 사용)
store = Store()
```

**변경 영향**:
```python
# Before
all_nodes[node.id] = node

# After
store.all_nodes[node.id] = node
```

**장점**:
- ✅ 테스트 격리 (`Store()` 인스턴스별 독립)
- ✅ 병렬 테스트 가능
- ✅ 웹 전환 시 리팩토링 0줄

**점수**: 6/10 (Store 클래스 사용 시 10/10)

---

### 3. ⚠️ 파일 구조 (확장성 고려 부족)

#### 기술 총괄자의 파일 구조
```
myDream/
├── src/                  # ⚠️ 일반적이지만 웹 재사용 고려 없음
│   ├── main.py
│   ├── models.py
│   ├── tree.py
│   ├── commands.py
│   ├── llm.py
│   └── storage.py
├── data/
│   └── tree.json
└── tests/
```

#### 아키텍처 평가
**⚠️ 웹 전환 시 재구성 필요**

**문제점**:
1. `src/` 폴더명이 일반적 (웹과 구분 안 됨)
2. **core 알고리즘 분리 없음** (웹에서 재사용 어려움)
3. 레이어 경계 불명확 (models.py가 Data인지 Domain인지?)

#### 아키텍처 권장사항 🟡 권장
**`cli/` + `core/` 구조**

```
myDream/
├── cli/                  # 터미널 전용
│   ├── main.py           # CLI 진입점
│   ├── commands.py       # CLI 명령어
│   └── storage.py        # JSON 저장/로드
│
├── core/                 # 🔥 웹 재사용 가능 (핵심 알고리즘)
│   ├── models.py         # Node 정의
│   ├── tree.py           # 트리 관리
│   └── path_utils.py     # get_context_path()
│
├── llm.py                # LLM 연동 (공통)
├── store.py              # 상태 관리 (공통)
│
├── data/
│   └── tree.json
└── tests/
```

**장점**:
- ✅ `core/` 폴더를 웹에서 그대로 import
  ```python
  # web/backend/services/conversation.py
  from core.tree import ConversationTree
  from core.models import Node
  ```
- ✅ 레이어 분리 명확 (cli/ = Presentation, core/ = Algorithm)

**변경 비용**: 폴더 이동 (10분)

**점수**: 7/10 (core/ 추가 시 9/10)

---

### 4. 🟡 Node 구조 (일관성)

#### 기술 총괄자의 Node 구조
```python
@dataclass
class Node:
    id: str
    parent_id: Optional[str]
    user_question: str      # ⚠️ 특정 역할 가정
    ai_answer: str          # ⚠️ 특정 역할 가정
    created_at: str
    metadata: dict
```

#### 아키텍처 평가
**🟡 실용적이지만, 향후 확장성 제한**

**문제점**:
1. `user_question` + `ai_answer` → **1노드 = 1턴** 가정 (현재는 OK)
2. 향후 `system` 메시지 추가 어려움
3. plan.md의 원래 구조와 불일치

#### plan.md의 원래 구조
```python
# plan.md에 명시된 구조 (암시적)
role: 'user' | 'assistant' | 'system'
content: str
```

#### 아키텍처 권장사항 🟡 권장
**`role` + `content` 구조 (표준화)**

```python
@dataclass
class Node:
    id: str
    parent_id: Optional[str]
    role: str               # 'user' | 'assistant' | 'system'
    content: str            # 질문 또는 응답
    created_at: str
    metadata: dict
```

**장점**:
- ✅ ChatGPT API 형식과 동일 (변환 비용 0)
- ✅ system 메시지 추가 용이
- ✅ plan.md와 일관성

**변경 영향**:
```python
# Before
node = Node(
    id=uuid4(),
    parent_id=current_node_id,
    user_question=user_input,
    ai_answer=ai_response,
    ...
)

# After
user_node = Node(
    id=uuid4(),
    parent_id=current_node_id,
    role='user',
    content=user_input,
    ...
)
ai_node = Node(
    id=uuid4(),
    parent_id=user_node.id,
    role='assistant',
    content=ai_response,
    ...
)
```

**트레이드오프**:
- 장점: 표준화, 확장성
- 단점: 1턴 = 2노드 (복잡도 약간 증가)

**PM 판단 필요**: 실용성(현재) vs 표준화(향후)

**점수**: 7/10 (role+content 사용 시 9/10)

---

### 5. ✅ 시나리오 커버리지 (우수)

#### 기술 총괄자의 시나리오 매핑
```markdown
| # | 시나리오 | Phase CLI-1 | 필요 기능 |
|---|---------|------------|----------|
| 1 | 기본 대화 흐름 | ✅ | 1턴=1노드 자동 생성 |
| 2 | 분기 생성 | ✅ | `/goto`, parent_id 설정 |
| ...
| 9 | 병합 | ❌ CLI-3 | LCA 알고리즘 |

**커버율**: 8/10 (80%)
```

#### 아키텍처 평가
**✅ 우수합니다!**

**근거**:
- 핵심 시나리오 80% 커버 (충분)
- 병합은 CLI-3로 연기 (하이브리드 접근)
- 명확한 우선순위 (MVP 집중)

**점수**: 9/10

---

### 6. ✅ 일정 계획 (현실적)

#### 기술 총괄자의 일정
```
Day 1: 핵심 구조 (Node, Tree, 더미 LLM)
Day 2: 명령어 시스템 (/save, /goto, /tree)
Day 3: LLM 연동 + JSON 저장
Day 4: E2E 테스트 + 버그 수정
```

#### 아키텍처 평가
**✅ 매우 현실적입니다!**

**근거**:
- 점진적 구현 (더미 → 실제 LLM)
- 충분한 테스트 시간 (Day 4 전체)
- 버퍼 확보 (3-4일 = 1일 버퍼)

**점수**: 9/10

---

### 7. 🟢 기술 스택 (적절)

#### 기술 총괄자의 선택
```
- Python 3.11+
- openai (OpenAI API)
- dataclasses
- json
- rich (선택)
```

#### 아키텍처 평가
**✅ 적절합니다!**

**근거**:
- Python: 빠른 프로토타이핑 ✅
- 최소 의존성 (복잡도 낮음) ✅
- rich는 선택사항 (점진적 개선) ✅

**점수**: 9/10

---

## 📊 종합 평가

### 점수표

| 평가 항목 | 점수 | 가중치 | 환산 |
|----------|------|--------|------|
| 하이브리드 접근 채택 | 10/10 | 30% | 3.0 |
| 전역 변수 사용 | 6/10 | 20% | 1.2 |
| 파일 구조 | 7/10 | 15% | 1.05 |
| Node 구조 | 7/10 | 10% | 0.7 |
| 시나리오 커버리지 | 9/10 | 10% | 0.9 |
| 일정 계획 | 9/10 | 10% | 0.9 |
| 기술 스택 | 9/10 | 5% | 0.45 |

**총점**: 8.2/10

---

## 🎯 최종 권고사항

### 1. 🔴 필수 변경사항 (구현 전 수정)

#### A. Store 클래스 도입
**파일**: `src/store.py` (새 파일)

```python
"""전역 상태 관리"""
from typing import Dict, Optional
from models import Node

class Store:
    """상태 컨테이너"""
    def __init__(self):
        self.all_nodes: Dict[str, Node] = {}
        self.checkpoints: Dict[str, str] = {}
        self.current_node_id: Optional[str] = None

    def reset(self):
        """테스트용 초기화"""
        self.all_nodes.clear()
        self.checkpoints.clear()
        self.current_node_id = None

# 전역 인스턴스
store = Store()
```

**변경 영향**:
- `tree.py`: `all_nodes` → `store.all_nodes`
- `commands.py`: `checkpoints` → `store.checkpoints`
- `main.py`: `current_node_id` → `store.current_node_id`

**변경 비용**: 30분 (전역 변수 → store. 일괄 치환)

**필수 이유**: 테스트 격리, 향후 웹 전환 시 리팩토링 0

---

### 2. 🟡 권장 변경사항 (구현 중 점진적 개선)

#### A. 파일 구조 개선
**변경**: `src/` → `cli/` + `core/` 분리

**변경 시점**: Day 1 초기 설정 시

**변경 비용**: 10분

**근거**: 웹 전환 시 core/ 재사용

---

#### B. Node 구조 통일
**변경**: `user_question`+`ai_answer` → `role`+`content`

**PM 판단 필요**:
- **현재 계획 유지**: 빠른 구현 (1턴=1노드)
- **구조 변경**: 표준화, 확장성 (1턴=2노드)

**권장**: PM과 협의 후 결정

---

### 3. 🟢 선택 개선사항 (Phase CLI-2 이후)

#### A. 레이어 주석 추가
```python
# tree.py
"""
Data Layer: 트리 자료구조 관리
"""

# commands.py
"""
Presentation Layer: CLI 명령어 처리
"""
```

**효과**: 코드 가독성 향상

---

## 📋 아키텍처 팀 승인 조건

### 조건부 승인 ⚠️

**승인 조건**:
1. 🔴 **Store 클래스 도입** (필수)
   - 전역 변수 → Store 클래스 감싸기
   - 테스트 격리 보장

2. 🟡 **파일 구조 검토** (권장)
   - PM과 협의 후 `core/` 폴더 추가 여부 결정

3. 🟡 **Node 구조 검토** (권장)
   - PM과 협의 후 `role`+`content` 전환 여부 결정

**승인 후 진행 가능**:
- Day 1-4 개발 진행
- 시나리오 1-8 구현
- E2E 테스트

---

## 🔗 참고 문서

### 아키텍처 설계 문서
- `docs/아키텍처설계/터미널_프로토타입_설계서.md` - 원래 설계
- `docs/아키텍처설계/기술총괄_인수인계서.md` - 컴포넌트 명세
- `docs/아키텍처설계/아키텍처_팀_의견서.md` - 하이브리드 접근 승인

### PM 문서
- `docs/PM_관리/PM_보고서/LCA_의사결정_가이드.md` - 옵션 C 권장

---

## ✅ 최종 의견

### 아키텍처 설계자 평가

**전체적으로 우수한 계획서입니다!** 👍

**강점**:
- ✅ 하이브리드 접근 정확히 채택 (LCA를 CLI-3로)
- ✅ 명확한 시나리오 커버리지 (80%)
- ✅ 현실적인 일정 (3-4일, 버퍼 포함)
- ✅ 실용적인 기술 스택

**개선점**:
- 🔴 전역 변수 → Store 클래스 (테스트 가능성)
- 🟡 src/ → cli/ + core/ (웹 재사용)
- 🟡 Node 구조 표준화 (PM 판단 필요)

**최종 점수**: 8.2/10

**승인 조건**: Store 클래스 도입 후 승인

---

**검토 완료**: 2025-11-09
**검토자**: 아키텍처 설계자
**다음 단계**: 기술 총괄자와 Store 클래스 논의

---
