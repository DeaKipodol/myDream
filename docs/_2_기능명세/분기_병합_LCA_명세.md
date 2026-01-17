# 분기 병합 및 LCA 알고리즘 기능 명세서

**버전**: 1.0.0
**작성일**: 2026-01-15
**Phase**: CLI-3
**상태**: 설계 단계

---

## 📋 목차

1. [기능 개요](#기능-개요)
2. [왜 획기적인가](#왜-획기적인가)
3. [LCA 알고리즘 설명](#lca-알고리즘-설명)
4. [병합 전략](#병합-전략)
5. [사용 시나리오](#사용-시나리오)
6. [CLI 명령어 설계](#cli-명령어-설계)
7. [구현 계획](#구현-계획)
8. [충돌 해결 방안](#충돌-해결-방안)

---

## 기능 개요

### 핵심 컨셉

트리 구조에서 **두 개의 분기된 대화 경로를 하나로 합치는(merge)** 기능입니다. Git의 merge와 유사하지만, 코드가 아닌 **대화 흐름을 병합**합니다.

### 문제 상황

```
사용자가 두 가지 방향으로 대화를 진행한 경우:

[Root]
  ├─ [경로 A: 마케팅 전략]
  │   └─ [A1] → [A2] → [A3]
  │
  └─ [경로 B: 기술 전략]
      └─ [B1] → [B2] → [B3]

"마케팅과 기술 전략을 종합한 통합 전략을 만들고 싶다"
→ A3와 B3를 어떻게 합칠 것인가?
```

### 해결 방안: LCA 기반 병합

```
1. A3와 B3의 공통 조상(LCA) 찾기 → Root
2. Root에서 A3까지의 경로: Root → A1 → A2 → A3
3. Root에서 B3까지의 경로: Root → B1 → B2 → B3
4. 두 경로를 하나의 컨텍스트로 병합
5. 새로운 질문으로 통합된 답변 생성
```

---

## 왜 획기적인가

### 일반 챗봇의 한계

1. **선형 대화만 가능**: 한 방향으로만 진행
2. **분기 후 통합 불가**: 여러 시도를 해도 하나씩만 사용 가능
3. **재작업 필요**: 두 대화를 합치려면 수동으로 복사-붙여넣기

### 우리 시스템의 차별점

1. **비선형 사고 지원**: 여러 방향으로 생각하고 나중에 통합
2. **탐색과 통합 분리**: 먼저 탐색하고, 나중에 결정
3. **컨텍스트 보존**: 양쪽 경로의 맥락을 모두 유지한 채 병합

### 실제 사용 사례

#### 1. 의사결정 프로세스

```
시나리오: 신규 기능 개발 여부 결정

[Root: 새 기능 추가?]
  ├─ [경로 A: 추가할 경우]
  │   ├─ 예상 매출 증가: 20%
  │   ├─ 개발 비용: 500만원
  │   └─ 결론: ROI 긍정적
  │
  └─ [경로 B: 추가하지 않을 경우]
      ├─ 현 상황 유지
      ├─ 경쟁사 격차 벌어짐
      └─ 결론: 장기적 위험

→ 두 경로를 병합하여 "최종 의사결정"
```

#### 2. A/B 전략 비교

```
[Root: 마케팅 전략]
  ├─ [경로 A: SNS 마케팅]
  │   └─ 타겟 도달률, 비용, 전환율 분석
  │
  └─ [경로 B: 검색 광고]
      └─ 타겟 도달률, 비용, 전환율 분석

→ 병합: "두 전략의 장단점을 종합하여 최적의 믹스 전략 수립"
```

#### 3. 학습 경로 통합

```
[Root: React 최적화]
  ├─ [경로 A: 메모이제이션 학습]
  │   └─ useMemo, React.memo 이해
  │
  └─ [경로 B: 코드 스플리팅 학습]
      └─ lazy, Suspense 이해

→ 병합: "두 기법을 조합한 종합 최적화 전략"
```

---

## LCA 알고리즘 설명

### LCA (Lowest Common Ancestor)란?

트리에서 두 노드의 **가장 가까운 공통 조상**을 찾는 알고리즘입니다.

### 시각적 예시

```
        [Root]
         /  \
       [A]  [B]
       /      \
     [A1]    [B1]
     /         \
   [A2]       [B2]

LCA(A2, B2) = Root  ← 가장 가까운 공통 조상
LCA(A1, A2) = A1    ← A1이 A2의 조상
LCA(A, B1) = Root
```

### 알고리즘 구현

```python
def find_lca(tree: Tree, node1_id: str, node2_id: str) -> Optional[str]:
    """
    두 노드의 최소 공통 조상(LCA) 찾기

    Args:
        tree: 트리 객체
        node1_id: 첫 번째 노드 ID
        node2_id: 두 번째 노드 ID

    Returns:
        LCA 노드 ID (없으면 None)
    """
    # 1. node1에서 root까지의 경로 구하기
    path1 = []
    current_id = node1_id
    while current_id:
        path1.append(current_id)
        node = tree.get_node(current_id)
        current_id = node.parent_id

    # 2. node2에서 root까지 올라가면서 path1에 있는지 확인
    current_id = node2_id
    while current_id:
        if current_id in path1:
            return current_id  # 첫 번째로 만나는 공통 조상
        node = tree.get_node(current_id)
        current_id = node.parent_id

    return None
```

### 시간 복잡도

- **O(h)**: h는 트리의 높이
- 최악의 경우: O(n) (일자 트리)
- 평균: O(log n) (균형 트리)

---

## 병합 전략

### 전략 1: 양쪽 경로 순차 병합 (기본)

```python
def merge_paths_sequential(
    tree: Tree,
    node1_id: str,
    node2_id: str,
    merge_question: str
) -> Node:
    """
    두 경로를 순차적으로 병합

    LCA → node1 → LCA → node2 → merge_question
    """
    lca_id = find_lca(tree, node1_id, node2_id)

    # 1. LCA에서 node1까지의 경로
    path1 = get_path_from_to(tree, lca_id, node1_id)

    # 2. LCA에서 node2까지의 경로
    path2 = get_path_from_to(tree, lca_id, node2_id)

    # 3. 컨텍스트 구성: LCA까지 + 경로1 + 경로2
    lca_path = get_path_from_root(tree, lca_id)
    merged_context = lca_path + path1 + path2

    # 4. AI에게 병합 질문
    messages = build_messages_from_nodes(merged_context)
    messages.append({
        "role": "system",
        "content": "위 두 가지 대화 경로를 통합하여 답변해주세요."
    })
    messages.append({
        "role": "user",
        "content": merge_question
    })

    ai_response = ai_client.chat(messages)
    return create_merge_node(ai_response, [node1_id, node2_id])
```

### 전략 2: 병렬 요약 병합 (고급)

```python
def merge_paths_with_summary(
    tree: Tree,
    node1_id: str,
    node2_id: str,
    merge_question: str
) -> Node:
    """
    각 경로를 요약한 후 병합 (토큰 절약)
    """
    lca_id = find_lca(tree, node1_id, node2_id)

    # 1. 각 경로 요약
    path1_summary = summarize_path(tree, lca_id, node1_id)
    path2_summary = summarize_path(tree, lca_id, node2_id)

    # 2. 요약본으로 컨텍스트 구성
    messages = [
        {"role": "system", "content": "다음은 두 가지 대화 경로의 요약입니다."},
        {"role": "assistant", "content": f"경로 A:\n{path1_summary}"},
        {"role": "assistant", "content": f"경로 B:\n{path2_summary}"},
        {"role": "user", "content": merge_question}
    ]

    ai_response = ai_client.chat(messages)
    return create_merge_node(ai_response, [node1_id, node2_id])
```

### 전략 3: 사용자 커스텀 병합

```python
def merge_paths_custom(
    tree: Tree,
    node1_id: str,
    node2_id: str,
    selected_nodes: List[str],  # 사용자가 직접 선택한 노드들
    merge_question: str
) -> Node:
    """
    사용자가 병합할 노드를 직접 선택
    """
    context_nodes = [tree.get_node(nid) for nid in selected_nodes]
    messages = build_messages_from_nodes(context_nodes)
    messages.append({"role": "user", "content": merge_question})

    ai_response = ai_client.chat(messages)
    return create_merge_node(ai_response, [node1_id, node2_id])
```

---

## 사용 시나리오

### 시나리오 1: 의사결정 통합

```bash
# 상황: 두 가지 옵션을 각각 탐색한 후 결정

$ tree
[Root: 새 기능 개발?]
  ├─ n1: 개발하는 경우
  │   ├─ n2: 비용 분석
  │   └─ n3: 수익 예측 → 현재 위치
  │
  └─ n4: 개발하지 않는 경우
      ├─ n5: 현 상황 유지
      └─ n6: 경쟁 분석

# 병합 명령
$ merge n3 n6 --question "두 시나리오를 종합하여 최종 결정을 내려줘"

🔀 병합 중...
  - LCA 찾기: Root
  - 경로 A: Root → n1 → n2 → n3 (개발하는 경우)
  - 경로 B: Root → n4 → n5 → n6 (개발하지 않는 경우)
  - 컨텍스트 구성 완료

✅ 병합 노드 생성: n7

💬 AI 답변:
두 시나리오를 종합적으로 분석한 결과...
[통합된 의사결정 답변]
```

### 시나리오 2: 학습 내용 통합

```bash
$ tree
[Root: JavaScript 최적화]
  ├─ n1: 메모리 최적화
  │   └─ n2: WeakMap 활용
  │
  └─ n3: 실행 속도 최적화
      └─ n4: 웹 워커 활용

$ merge n2 n4 --question "메모리와 속도 최적화를 동시에 적용하는 방법은?"

✅ 병합 노드 생성: n5
💬 두 기법을 조합한 최적화 전략...
```

### 시나리오 3: 다각도 분석 종합

```bash
$ tree
[Root: 스타트업 피칭]
  ├─ n1: 기술 관점
  │   └─ n2: 기술 차별성
  │
  ├─ n3: 비즈니스 관점
  │   └─ n4: 시장 기회
  │
  └─ n5: 투자 관점
      └─ n6: 성장 가능성

# 3개 경로 병합 (순차적으로 2번)
$ merge n2 n4 --question "기술과 비즈니스를 종합한 강점은?"
✅ n7 생성

$ merge n7 n6 --question "투자 관점까지 포함한 최종 피칭 전략은?"
✅ n8 생성 (최종 통합 답변)
```

---

## CLI 명령어 설계

### 기본 병합

```bash
# 두 노드 병합
merge <node1> <node2> --question "병합 질문"

# 예시
merge n5 n8 --question "두 전략을 통합하면?"
```

### 고급 옵션

```bash
# 1. LCA 확인만 하기
merge n5 n8 --dry-run
출력: LCA는 n1입니다.

# 2. 요약 모드 (토큰 절약)
merge n5 n8 --summary --question "통합 전략은?"

# 3. 커스텀 노드 선택
merge n5 n8 --select n2,n3,n7 --question "선택한 내용 기반 통합"

# 4. 병합 결과를 특정 위치에 생성
merge n5 n8 --parent n3 --question "..."
```

### 병합 정보 명령어

```bash
# 두 노드의 LCA 찾기
lca n5 n8
출력: n1 (시장 분석)

# 병합 가능한 노드 쌍 찾기
merge --suggest
출력:
  추천 병합:
  - n3 (마케팅) + n7 (기술) → 통합 전략
  - n5 (옵션A) + n8 (옵션B) → 최종 결정
```

---

## 구현 계획

### Phase 1: LCA 알고리즘 (1일)

```python
# core/path_utils.py 확장

def find_lca(tree: Tree, node1_id: str, node2_id: str) -> Optional[str]:
    """LCA 찾기 구현"""
    pass

def get_path_between(
    tree: Tree,
    from_node_id: str,
    to_node_id: str
) -> List[str]:
    """두 노드 사이의 경로 반환"""
    pass

def get_divergence_point(
    tree: Tree,
    node1_id: str,
    node2_id: str
) -> Tuple[str, List[str], List[str]]:
    """
    분기점과 각 경로 반환

    Returns:
        (lca_id, path_to_node1, path_to_node2)
    """
    pass
```

### Phase 2: 병합 로직 (2일)

```python
# core/merge.py (새 파일)

class MergeManager:
    def __init__(self, store: Store, ai_client: AIClient):
        self.store = store
        self.ai_client = ai_client

    def merge_nodes(
        self,
        node1_id: str,
        node2_id: str,
        merge_question: str,
        strategy: str = "sequential"  # sequential, summary, custom
    ) -> Node:
        """두 노드를 병합하여 새 노드 생성"""
        pass

    def preview_merge(
        self,
        node1_id: str,
        node2_id: str
    ) -> MergePreview:
        """
        병합 미리보기 (실제 실행 전)

        Returns:
            lca, 경로 정보, 예상 토큰 수 등
        """
        pass

    def suggest_merges(self) -> List[Tuple[str, str, str]]:
        """
        병합 가능한 노드 쌍 추천

        Returns:
            [(node1_id, node2_id, reason), ...]
        """
        pass
```

### Phase 3: CLI 통합 (1일)

```python
# cli/cli.py

def cmd_merge(
    self,
    node1: str,
    node2: str,
    question: str,
    dry_run: bool = False,
    summary: bool = False
):
    """두 노드 병합 명령"""
    # 노드 번호 → ID 변환
    id1 = self.number_to_id[node1]
    id2 = self.number_to_id[node2]

    if dry_run:
        # 미리보기만
        preview = self.merge_manager.preview_merge(id1, id2)
        print(f"LCA: {preview.lca_id}")
        print(f"경로 길이: {preview.total_nodes}개 노드")
        return

    # 실제 병합
    strategy = "summary" if summary else "sequential"
    merge_node = self.merge_manager.merge_nodes(
        id1, id2, question, strategy
    )

    print(f"✅ 병합 노드 생성: {merge_node.id}")
```

### Phase 4: 테스트 (1일)

```python
# tests/test_merge.py

def test_find_lca():
    """LCA 알고리즘 테스트"""
    pass

def test_merge_simple_paths():
    """단순 경로 병합 테스트"""
    pass

def test_merge_with_summary():
    """요약 모드 병합 테스트"""
    pass

def test_merge_preserves_metadata():
    """병합 시 메타데이터 보존 테스트"""
    pass
```

---

## 충돌 해결 방안

### 문제 상황

```
경로 A에서: "마케팅 예산은 1000만원으로 결정"
경로 B에서: "마케팅 예산은 500만원으로 결정"

→ 병합 시 어떤 값을 사용?
```

### 해결 방안 1: AI에게 위임 (기본)

```python
# AI가 판단하도록 컨텍스트 제공
messages = [
    {"role": "system", "content": "두 경로에서 다른 결론이 나왔습니다. 적절히 통합해주세요."},
    {"role": "user", "content": "경로 A: 예산 1000만원"},
    {"role": "user", "content": "경로 B: 예산 500만원"},
    {"role": "user", "content": "최종 예산은 얼마로 할까?"}
]
```

### 해결 방안 2: 사용자 선택

```bash
$ merge n3 n7 --question "최종 예산은?"

⚠️ 충돌 감지:
  경로 A (n3): 마케팅 예산 1000만원
  경로 B (n7): 마케팅 예산 500만원

어떻게 처리할까요?
  1. 경로 A 우선
  2. 경로 B 우선
  3. AI에게 판단 맡기기
  4. 직접 입력

선택: _
```

### 해결 방안 3: 메타데이터 활용

```python
# 노드에 신뢰도/중요도 메타데이터 추가
node.metadata = {
    "confidence": 0.9,  # 이 결론의 신뢰도
    "priority": "high"  # 우선순위
}

# 병합 시 우선순위 높은 경로 우선
```

---

## 데이터 구조

### MergeNode 메타데이터

```python
@dataclass
class MergeNode(Node):
    """병합으로 생성된 노드"""
    metadata: Dict[str, Any] = field(default_factory=lambda: {
        "is_merge": True,
        "source_node_ids": [],  # 병합된 노드들
        "lca_id": "",           # 공통 조상
        "merge_strategy": "",   # sequential, summary, custom
        "merge_timestamp": ""
    })
```

### 병합 이력 추적

```python
# Store에 병합 이력 추가
class Store:
    def __init__(self):
        self.tree = Tree()
        self.active_path_ids = []
        self.checkpoints = {}
        self.merge_history = []  # 병합 이력

    def record_merge(
        self,
        merge_node_id: str,
        source_node_ids: List[str],
        lca_id: str
    ):
        """병합 이력 기록"""
        self.merge_history.append({
            "merge_node_id": merge_node_id,
            "source_node_ids": source_node_ids,
            "lca_id": lca_id,
            "timestamp": datetime.now().isoformat()
        })
```

---

## UI 연동 방안 (Phase UI-1)

### 병합 UI 흐름

```
1. 사용자가 두 노드 선택
   └─ Ctrl + 클릭으로 다중 선택

2. 우클릭 → "병합" 메뉴

3. 병합 대화상자
   ┌─────────────────────────────────────┐
   │ 🔀 노드 병합                         │
   ├─────────────────────────────────────┤
   │ 선택된 노드:                        │
   │   • n3: 마케팅 전략                 │
   │   • n7: 기술 전략                   │
   │                                     │
   │ 공통 조상(LCA): n1 (사업 계획)      │
   │                                     │
   │ 병합 질문:                          │
   │ [________________________________]  │
   │                                     │
   │ 병합 전략:                          │
   │ ⦿ 순차 병합 (모든 내용 포함)        │
   │ ○ 요약 병합 (토큰 절약)             │
   │ ○ 커스텀 (노드 직접 선택)           │
   │                                     │
   │        [취소]  [병합하기]           │
   └─────────────────────────────────────┘

4. 병합 실행 및 결과 표시
```

### 트리 시각화

```javascript
// 병합 노드 특별 표시
class TreeNode {
  render() {
    if (this.metadata.is_merge) {
      // 병합 노드는 다이아몬드 모양으로 표시
      this.element.classList.add('merge-node');

      // 소스 노드로 점선 연결
      this.metadata.source_node_ids.forEach(sourceId => {
        drawDashedLine(sourceId, this.id);
      });
    }
  }
}
```

---

## 성능 고려사항

### 토큰 관리

```python
def estimate_merge_tokens(
    tree: Tree,
    node1_id: str,
    node2_id: str
) -> int:
    """병합 시 필요한 토큰 수 추정"""
    lca_id = find_lca(tree, node1_id, node2_id)

    lca_path = get_path_from_root(tree, lca_id)
    path1 = get_path_from_to(tree, lca_id, node1_id)
    path2 = get_path_from_to(tree, lca_id, node2_id)

    total_text = ""
    for node in lca_path + path1 + path2:
        total_text += node.user_question + node.ai_answer

    return estimate_tokens(total_text)
```

### 최적화 전략

```python
# 긴 경로는 자동으로 요약 모드 사용
def merge_with_auto_optimization(
    node1_id: str,
    node2_id: str,
    question: str
) -> Node:
    """토큰 수에 따라 자동으로 최적 전략 선택"""
    estimated_tokens = estimate_merge_tokens(tree, node1_id, node2_id)

    if estimated_tokens > 3000:
        strategy = "summary"  # 요약 모드
    else:
        strategy = "sequential"  # 전체 포함

    return merge_nodes(node1_id, node2_id, question, strategy)
```

---

## 마일스톤

| 날짜 | 목표 | 상태 |
|------|------|------|
| D+1 | LCA 알고리즘 구현 | ⏳ 대기 |
| D+2~3 | 병합 로직 구현 | ⏳ 대기 |
| D+4 | CLI 통합 | ⏳ 대기 |
| D+5 | 테스트 작성 | ⏳ 대기 |
| D+6 | 충돌 해결 개선 | ⏳ 대기 |

**예상 소요 기간**: 5-7일

---

**작성자**: PM (Claude)
**검토자**: -
**승인자**: -
