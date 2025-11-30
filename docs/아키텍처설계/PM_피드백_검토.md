# PM 피드백 검토 및 아키텍처 최종 결정
- 작성일: 2025-11-05
- 작성자: 아키텍처 설계자
- 상태: 최종 결정

## 1. 종합 평가

PM님의 피드백은 **매우 합리적**입니다. "빠른 검증" 목표와 10-14일 일정을 고려하면 단순화가 필요합니다.

**하지만**, 제 판단 기준에 따라 일부는 승인, 일부는 조건부 수정을 제안합니다.

---

## 2. 우려사항별 판단

### 2.1 파일 구조 단순화

**PM 제안**:
```
cli/
├── tree.py
├── lca.py
├── path_switch.py
├── checkpoint.py
└── cli.py
```

**내 판단**: ✅ **승인 (조건부)**

**판단 기준 평가**:
- 단순성: ✅ PM 안이 더 단순 (점수: +30)
- 테스트 가능성: ✅ 영향 없음 (점수: +25)
- 책임 분리: ⚠️ 약간 손해지만 수용 가능 (점수: +15/20)
- 확장성: ⚠️ 나중에 리팩토링 필요하지만 가능 (점수: +10/15)
- 성능: ✅ 영향 없음 (점수: +10)

**총점**: 90/100 (즉시 승인)

**근거**:
1. ✅ CLI-1의 "빠른 검증" 목표에 부합
2. ✅ 10-14일 일정 안전성 확보
3. ✅ 파일 구조는 나중에 리팩토링 쉬움
4. ✅ 알고리즘 로직은 변경 없음

**조건**:
PM님의 하이브리드 안을 수용하되, **최소한의 core/ 분리는 유지**:

```python
cli/
├── __init__.py
├── cli.py               # TerminalUI + main
├── core/                # 핵심 알고리즘 (웹 전환 시 재사용)
│   ├── __init__.py
│   ├── tree.py          # Node, ConversationTree
│   ├── lca.py           # LCACalculator
│   └── path_switch.py   # PathSwitchService (PathReconstructor 포함)
├── checkpoint.py        # Checkpoint, CheckpointService
└── store.py             # Store (단순 버전)
```

**이유**:
- `core/` 폴더는 웹 전환 시 그대로 재사용 가능
- 3개 파일만 분리하므로 복잡도 최소
- "알고리즘 격리" 원칙 유지

---

### 2.2 Observer 패턴 제거 + Store 전역 변수화

**PM 제안**:
```python
# 전역 변수로 단순화
active_path = []
selected_node_id = None
checkpoints = []
```

**내 판단**: ⚠️ **조건부 반대** (대안 제시)

**판단 기준 평가**:
- 단순성: ✅ 전역 변수가 더 단순 (점수: +30)
- 테스트 가능성: ❌ 전역 변수는 테스트 어려움 (점수: +5/25) **⚠️ 치명적**
- 책임 분리: ❌ 전역 상태는 결합도 증가 (점수: +5/20)
- 확장성: ❌ 웹 전환 시 대규모 리팩토링 (점수: +0/15)
- 성능: ✅ 영향 없음 (점수: +10)

**총점**: 50/100 (재검토 필요)

**반대 근거**:
1. ❌ **테스트 가능성** (제 판단 기준 2순위, 가중치 25%)
   - 전역 변수는 테스트 간 격리 불가능
   - 테스트 A가 전역 상태 변경 → 테스트 B 오염
   - 병렬 테스트 불가능

2. ❌ **웹 전환 시 리팩토링 비용**
   - 전역 변수 → 클래스 전환 시 모든 파일 수정 필요
   - 50-100줄 이상 수정 예상

3. ❌ **유지보수성**
   - 전역 변수는 "누가 언제 변경했는지" 추적 어려움
   - 디버깅 시간 증가

**대안**: Observer는 제거하되, **Store 클래스는 유지**

```python
class Store:
    """단순 상태 컨테이너 (Observer 기능 제거)"""
    def __init__(self):
        self.active_path: List[str] = []
        self.selected_node_id: Optional[str] = None
        self.checkpoints: List[Checkpoint] = []

    # subscribe, notify 메서드 없음
```

**이렇게 하면**:
- ✅ Observer 복잡도 제거 (subscribe/notify 삭제)
- ✅ 테스트 가능성 유지 (Store 인스턴스 주입)
- ✅ 웹 전환 시 리팩토링 최소화
- ✅ 코드 10줄 정도로 매우 간단
- ✅ 전역 변수 문제 완전 회피

**복잡도 비교**:
```python
# PM 안 (전역 변수)
active_path = []
selected_node_id = None
checkpoints = []

# 내 대안 (Store 클래스)
class Store:
    def __init__(self):
        self.active_path = []
        self.selected_node_id = None
        self.checkpoints = []

store = Store()  # 전역 인스턴스 1개
```

**차이**: 클래스 정의 5줄 추가 vs 테스트 가능성 확보

**최종 판단**: ⚠️ **PM 안 거부, 대안 제시**

---

### 2.3 클래스 통합 (PathReconstructor)

**PM 제안**: PathReconstructor를 PathSwitchService 내부 메서드로 통합

**내 판단**: ✅ **즉시 승인**

**판단 기준 평가**:
- 단순성: ✅ 클래스 1개 감소 (점수: +30)
- 테스트 가능성: ✅ PathSwitchService 단위로 테스트 가능 (점수: +25)
- 책임 분리: ⚠️ 약간 손해지만 수용 가능 (점수: +15/20)
- 확장성: ✅ 나중에 분리 쉬움 (점수: +15)
- 성능: ✅ 영향 없음 (점수: +10)

**총점**: 95/100 (즉시 승인)

**근거**:
1. ✅ PathReconstructor는 실제로 PathSwitchService에서만 사용
2. ✅ 별도 클래스로 분리할 필요 없음 (YAGNI)
3. ✅ 테스트는 PathSwitchService를 통해 충분히 검증 가능
4. ✅ 나중에 필요하면 1시간 내 분리 가능

**수정 후 구조**:
```python
class PathSwitchService:
    def switch_path(self, current, target):
        lca = self.lca_calculator.calculate(current, target)
        new_path = self._reconstruct_path(lca, target)  # 내부 메서드
        return new_path

    def _reconstruct_path(self, lca_id, target_id):
        """경로 재구성 (prefix + suffix)"""
        # PathReconstructor 로직을 여기로 이동
        pass
```

---

### 2.4 TerminalUI 명령어 축소

**PM 제안**: [t][s][c][r] 4개만, [p][m]은 CLI-2로 연기

**내 판단**: ✅ **즉시 승인**

**판단 기준 평가**:
- 단순성: ✅ 명령어 줄이면 구현 빠름 (점수: +30)
- 테스트 가능성: ✅ 핵심 기능 검증에 충분 (점수: +25)
- 책임 분리: ✅ 영향 없음 (점수: +20)
- 확장성: ✅ 나중에 추가 매우 쉬움 (점수: +15)
- 성능: ✅ 영향 없음 (점수: +10)

**총점**: 100/100 (즉시 승인)

**근거**:
1. ✅ [p][m]은 실제로 데모에 필수 아님 (조회용)
2. ✅ 핵심은 경로 전환([s])과 체크포인트([c][r]) 검증
3. ✅ 10분이면 나중에 추가 가능
4. ✅ 일정 2-3일 단축 효과

---

## 3. 최종 결정 요약

| 항목 | PM 제안 | 내 판단 | 근거 |
|------|---------|---------|------|
| **파일 구조** | 단순화 | ✅ 승인 (core/ 유지 조건) | 빠른 검증 목표 부합, 리팩토링 가능 |
| **Observer 제거** | 제거 | ✅ 승인 | 복잡도 감소 |
| **Store 전역화** | 전역 변수 | ⚠️ 거부 (대안 제시) | 테스트 가능성 우선 |
| **PathReconstructor 통합** | 통합 | ✅ 승인 | 단순화, YAGNI |
| **명령어 축소** | 4개만 | ✅ 승인 | 충분한 검증, 일정 단축 |

**승인**: 4개
**조건부 거부**: 1개 (대안 제시)

---

## 4. 수정 후 최종 설계

### 4.1 파일 구조

```
cli/
├── __init__.py
├── cli.py               # TerminalUI + main
├── core/                # 핵심 알고리즘 (웹 재사용)
│   ├── __init__.py
│   ├── tree.py          # Node, ConversationTree
│   ├── lca.py           # LCACalculator
│   └── path_switch.py   # PathSwitchService (통합)
├── checkpoint.py        # Checkpoint, CheckpointService
├── store.py             # Store (Observer 없는 단순 버전)
└── tests/
    ├── test_lca.py
    ├── test_path_switch.py
    └── test_checkpoint.py
```

### 4.2 클래스 목록 (총 7개)

| 레이어 | 클래스 | 파일 | 라인 수 |
|--------|--------|------|---------|
| **Data** | `Node` | core/tree.py | ~20 |
| | `ConversationTree` | core/tree.py | ~80 |
| | `Store` | store.py | ~10 |
| **Algorithm** | `LCACalculator` | core/lca.py | ~40 |
| **Business** | `PathSwitchService` | core/path_switch.py | ~60 |
| | `Checkpoint` | checkpoint.py | ~20 |
| | `CheckpointService` | checkpoint.py | ~40 |
| **Presentation** | `TerminalUI` | cli.py | ~100 |

**총 라인 수**: ~370줄 (매우 관리 가능)

### 4.3 Store 최종 구현

```python
# store.py
from typing import List, Optional

class Store:
    """상태 컨테이너 (Observer 없음)"""
    def __init__(self):
        self.active_path: List[str] = []
        self.selected_node_id: Optional[str] = None
        self.checkpoints: List = []
```

**이것으로 충분합니다!**
- ✅ 10줄로 매우 단순
- ✅ 테스트 시 독립적 인스턴스 생성 가능
- ✅ 웹 전환 시 확장 용이

### 4.4 TerminalUI 명령어

```python
명령어: [t]트리 [s]전환 [c]체크포인트 [r]복원 [q]종료
```

5개 명령어 (q 포함)로 충분합니다.

---

## 5. 일정 재평가

### PM 우려: 8개 클래스 + 13일 → 버퍼 없음

**수정 후**:
- 클래스 수: 8개 → 7개 (PathReconstructor 통합)
- Observer 제거로 복잡도 감소
- 명령어 축소로 UI 구현 단축

**수정 후 일정**:
1. 기초 구조 (tree.py, store.py): **1-2일**
2. 알고리즘 (lca.py, path_switch.py): **2-3일**
3. 체크포인트 (checkpoint.py): **1-2일**
4. 터미널 UI (cli.py): **2일**
5. 테스트 작성 및 검증: **2일**

**총 8-11일** (버퍼 3-6일) ✅ **안전**

---

## 6. PM님께 질의응답

### Q1. "Store를 클래스로 유지하면 복잡도가 증가하지 않나요?"

**A**: 아니요. Observer 기능(subscribe/notify)을 제거하면 복잡도는 전역 변수와 거의 동일합니다.

**코드 비교**:
```python
# 전역 변수 (3줄)
active_path = []
selected_node_id = None
checkpoints = []

# Store 클래스 (10줄)
class Store:
    def __init__(self):
        self.active_path = []
        self.selected_node_id = None
        self.checkpoints = []

store = Store()
```

**차이**: 7줄 추가 vs **테스트 가능성 확보**

### Q2. "테스트 가능성이 왜 그렇게 중요한가요?"

**A**: 이 프로젝트의 목표가 **"핵심 알고리즘 검증"**이기 때문입니다.

전역 변수의 문제:
```python
# 전역 변수
active_path = []

def test_path_switch():
    # 테스트 A
    active_path.append('A')  # 전역 상태 오염
    assert len(active_path) == 1

def test_checkpoint():
    # 테스트 B가 실패! (이유: 테스트 A의 'A'가 남아있음)
    assert len(active_path) == 0  # FAIL!
```

Store 클래스의 해결:
```python
def test_path_switch():
    store = Store()  # 독립적 인스턴스
    store.active_path.append('A')
    assert len(store.active_path) == 1

def test_checkpoint():
    store = Store()  # 새 인스턴스, 격리됨
    assert len(store.active_path) == 0  # PASS!
```

### Q3. "7줄 추가로 얻는 이득이 충분한가요?"

**A**: 네, **매우 충분합니다**.

**이득**:
1. ✅ 테스트 간 격리 (버그 예방)
2. ✅ 병렬 테스트 가능 (시간 단축)
3. ✅ 웹 전환 시 리팩토링 최소 (50줄 vs 0줄)
4. ✅ 디버깅 용이 (상태 추적)

**비용**:
- ❌ 7줄 추가 (1분 작성)

**ROI**: 매우 높음

---

## 7. 최종 제안

### ✅ PM 제안 중 승인 (4개)
1. ✅ 파일 구조 단순화 (core/ 유지 조건)
2. ✅ Observer 패턴 제거
3. ✅ PathReconstructor 통합
4. ✅ 명령어 축소 (4개)

### ⚠️ 조건부 수정 (1개)
5. ⚠️ Store는 전역 변수 대신 **Observer 없는 Store 클래스** 사용

**이유**: 테스트 가능성은 제 판단 기준 2순위 (25%)이며, 7줄 추가로 해결 가능

---

## 8. PM님께 최종 요청

**제 입장**:
- ✅ PM님의 우려는 **100% 타당**합니다
- ✅ 4개 제안은 **즉시 수용**합니다
- ⚠️ Store 전역화만 **대안(Store 클래스)**을 제안합니다

**대안의 장점**:
- ✅ 복잡도 증가 최소 (7줄)
- ✅ PM 목표 달성 (빠른 검증)
- ✅ 테스트 가능성 확보
- ✅ 일정 영향 없음 (1분 작업)

**질문**:
PM님, Store 클래스 방식을 수용해주실 수 있을까요?

만약 "절대 안 됨, 전역 변수만 허용"이시면 PM 결정을 따르겠습니다.
하지만 제 전문가 의견은 **"Store 클래스 권장"**입니다.

---

## 9. 수정안 제출 여부

**조건**:
- PM님이 Store 클래스를 승인하시면 → ✅ **즉시 수정안 작성**
- PM님이 전역 변수를 고집하시면 → ⚠️ **한 번 더 설득 시도 후 수용**

**작업 시간**: 수정안 작성 2-3시간 예상

**PM님, 결정을 내려주시면 바로 진행하겠습니다!**
