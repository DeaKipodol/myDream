# LCA 알고리즘 의사결정 가이드

**작성일**: 2025-11-09
**작성자**: PM (프로젝트 매니저)
**참조 문서**: `docs/초기개발/PM_보고서/03_LCA_불필요성_제안서.md`
**수신**: 기술 총괄자, 아키텍처 설계자, 개발팀
**문서 목적**: LCA 알고리즘 채택 여부에 대한 종합 분석 및 의사결정 프레임워크 제시

---

## 📋 Executive Summary

### 상황
기술 총괄자가 **"LCA 불필요성 제안서"**를 통해 다음을 주장:
- 단순 경로 추적과 LCA 방식의 결과가 동일
- LCA는 4배 복잡 (65줄 vs 15줄)
- Phase CLI-1에서 LCA 제거 제안

### PM 분석 결과
**기술 총괄자의 분석은 정확하나, 중요한 관점이 누락됨**

**누락된 관점**:
1. ✅ LCA는 "결과"가 아닌 "과정"을 위한 알고리즘
2. ✅ 병합(Merge) 기능은 LCA 없이 불가능
3. ✅ 웹 UI 애니메이션, Shelves 자동화 등에 활용 가능
4. ✅ plan.md 87-92줄은 "병합" 시나리오일 가능성

### 최종 권고
**하이브리드 접근** (옵션 C):
- Phase CLI-1: 단순 방식 (경로 전환)
- Phase CLI-3: LCA 추가 (병합 기능 전용)
- 웹 전환 시: LCA 활용 (애니메이션, 분석)

---

## 🎮 두 방식의 단계별 비교 ("게임 퍼즐처럼")

### 시나리오 설정

**트리 구조**:
```
         A (root) "프로젝트 일정이 빠듯해요"
        / \
       B   C "일정 관리는?"
      / \   \
     D   E   G "구체적인 일정?"
    / \       \
   H   I       M "마일스톤은?"
  /     \       \
 N       O       S "주간 목표는?"
```

**현재 활성 경로**: A → B → D → I → O (TypeScript 논의 중)
**사용자 행동**: 노드 **S** 클릭 (주간 목표로 화제 전환)

---

### 방법 1: 단순 경로 추적 (plan.md Line 79-85)

#### 알고리즘 의사코드
```
1. 클릭한 노드 S를 받는다
2. S에서 시작해서 parent_id를 따라 루트까지 올라간다
3. 그 경로를 활성 경로로 교체한다
끝.
```

#### 실제 실행 (단계별)

**Step 1**: 사용자가 S 클릭
```python
clicked_node = "S"
```

**Step 2**: S부터 parent_id 따라가기
```python
path = []
current = "S"

# 반복 1: S
path = ["S"]
parent = nodes["S"].parent_id = "M"

# 반복 2: M
path = ["M", "S"]
parent = nodes["M"].parent_id = "G"

# 반복 3: G
path = ["G", "M", "S"]
parent = nodes["G"].parent_id = "C"

# 반복 4: C
path = ["C", "G", "M", "S"]
parent = nodes["C"].parent_id = "A"

# 반복 5: A (루트)
path = ["A", "C", "G", "M", "S"]
parent = nodes["A"].parent_id = None  # 종료
```

**Step 3**: 활성 경로 교체
```python
active_path = ["A", "C", "G", "M", "S"]
# 완료!
```

#### 결과
- **새 활성 경로**: `[A, C, G, M, S]`
- **함수 호출**: 1번 (`get_path_to_root`)
- **루프 횟수**: 5번 (트리 높이)
- **이전 경로 O**: 사용 안 함 (몰라도 됨)

---

### 방법 2: LCA 기반 (plan.md Line 87-92)

#### 알고리즘 의사코드
```
1. 현재 리프 C(O)와 목표 T(S)를 받는다
2. L = LCA(C, T)를 계산한다
3. prefix = path(root, L)를 구성한다
4. suffix = path(L, T)를 구성하되 L을 중복 배제한다
5. activePath = prefix + suffix로 재구성한다
끝.
```

#### 실제 실행 (단계별)

**Step 1**: 현재 리프 O, 목표 S 받기
```python
current_leaf = "O"  # 이전 활성 경로의 끝
target = "S"
```

**Step 2**: LCA(O, S) 계산

*2-1. O의 경로 구하기*
```python
path_O = []
current = "O"
# O → I → D → B → A
path_O = ["A", "B", "D", "I", "O"]  # 역순 정렬됨
```

*2-2. S의 경로 구하기*
```python
path_S = []
current = "S"
# S → M → G → C → A
path_S = ["A", "C", "G", "M", "S"]  # 역순 정렬됨
```

*2-3. 공통 조상 찾기 (루트부터 비교)*
```python
path_O = ["A", "B", "D", "I", "O"]
path_S = ["A", "C", "G", "M", "S"]

# 루트부터 비교
i=0: "A" == "A" → LCA = "A"
i=1: "B" != "C" → 중단

LCA = "A"  # 루트에서 분기
```

**Step 3**: prefix 구성 (root → LCA)
```python
prefix = get_path(root, "A")
# A가 루트이므로
prefix = ["A"]
```

**Step 4**: suffix 구성 (LCA → S, LCA 제외)
```python
full_path_to_S = ["A", "C", "G", "M", "S"]
lca_index = 0  # A의 위치
suffix = full_path_to_S[1:]  # A 제외
suffix = ["C", "G", "M", "S"]
```

**Step 5**: prefix + suffix 결합
```python
active_path = prefix + suffix
active_path = ["A"] + ["C", "G", "M", "S"]
active_path = ["A", "C", "G", "M", "S"]
# 완료!
```

#### 결과
- **새 활성 경로**: `[A, C, G, M, S]`
- **함수 호출**: 3번 (`get_path_to_root` × 2, `reconstruct_path` × 1)
- **루프 횟수**: 5(O 경로) + 5(S 경로) + 1(LCA 비교) + 1(재구성) = 12번
- **추가 정보**: LCA = A (루트에서 분기)

---

### 시각적 비교

#### 방법 1: 단순 추적
```
[사용자] S 클릭
    ↓
[시스템] S에서 parent_id 따라 올라가기
    S → M → G → C → A
    ↓
[시스템] 경로 역순으로 저장
    [A, C, G, M, S]
    ↓
[완료] ✅
```

#### 방법 2: LCA
```
[사용자] S 클릭
    ↓
[시스템] 현재 리프 O 확인
    ↓
[시스템] O의 경로 계산
    O → I → D → B → A
    ↓
[시스템] S의 경로 계산
    S → M → G → C → A
    ↓
[시스템] 두 경로 비교해서 LCA 찾기
    공통: A만 → LCA = A
    ↓
[시스템] prefix (root → LCA) 만들기
    [A]
    ↓
[시스템] suffix (LCA → S, LCA 제외) 만들기
    [C, G, M, S]
    ↓
[시스템] prefix + suffix 결합
    [A, C, G, M, S]
    ↓
[완료] ✅
```

### 비교표

| 항목 | 방법 1 (단순) | 방법 2 (LCA) | 승자 |
|------|--------------|--------------|------|
| **결과** | [A,C,G,M,S] | [A,C,G,M,S] | 동일 ✅ |
| **단계 수** | 3단계 | 7단계 | 방법 1 |
| **함수 호출** | 1번 | 3번 | 방법 1 |
| **루프 횟수** | 5번 | 12번 | 방법 1 |
| **필요한 입력** | S만 | O + S | 방법 1 |
| **코드 라인** | 15줄 | 65줄 | 방법 1 |
| **추가 정보** | 없음 | LCA=A | 방법 2 |

**기술 총괄자의 결론**: "결과가 동일하므로 단순 방식 승리"

**PM의 반론**: "하지만 '추가 정보 (LCA=A)'가 필요한 기능이 있다"

---

## 🎯 LCA의 진짜 가치: "결과"가 아닌 "과정"

### 핵심 차이

**단순 방식**: "S까지의 경로는 `[A,C,G,M,S]`다" ← **결과만**

**LCA 방식**: "O에서 S로 가려면, **A까지 거슬러 올라가서(unwind)**, 거기서 **C→G→M→S로 내려간다(rewind)**" ← **과정**

---

## 🔥 LCA가 진짜로 필요한 5가지 시나리오

### 1. 병합(Merge) 기능 ⭐⭐⭐ (핵심)

**plan.md에 명시된 핵심 기능**

#### 상황
두 개의 다른 탐색 경로를 하나로 합치기

```
         A
        / \
       B   C
      / \   \
     D   E   F
    /
   G (브랜치 1: A→B→D→G)

   E (브랜치 2: A→B→E)
```

사용자: "D와 E의 인사이트를 합쳐서 새로운 질문 생성하고 싶어"

#### 단순 방식으로는?
```python
path_D = get_path_to_root("D")  # [A, B, D]
path_E = get_path_to_root("E")  # [A, B, E]

# ... 어떻게 병합?
# 공통 부분을 어떻게 찾지?
# 수동으로 비교? → 비효율적, 버그 가능성
```

#### LCA 방식
```python
lca = calculate_lca("D", "E")  # → B

# "B까지는 같고, 거기서 갈라졌다"는 정보 획득
# → B에서 새 노드 생성
merged_node = create_node(
    parent="B",
    content="D와 E의 통합 질문: Python과 아키텍처 모두 고려한다면?"
)
```

✅ **병합 기능은 LCA 없이 구현 불가능 (또는 매우 비효율적)**

---

### 2. Shelves (보존 영역) 자동 관리 ⭐⭐

**plan.md의 shelves 개념**:
- 사용자가 경로 전환 시, "버려진 브랜치"를 임시 보관
- 나중에 복구 가능

#### 시나리오
```
현재: A → B → D → I → O
클릭: S
새 경로: A → C → G → M → S
```

#### LCA를 활용한 자동 보존
```python
lca = calculate_lca("O", "S")  # → A
lca_depth = get_depth("A")  # 0

current_path = ["A", "B", "D", "I", "O"]

# A 이후부터 갈라짐
abandoned_branch = current_path[lca_depth+1:]  # ["B", "D", "I", "O"]

if lca_depth < len(current_path) - 2:
    # "깊은 분기 전환" → 자동 보존
    create_shelf(
        name=f"Branch from {abandoned_branch[0]}",
        path=abandoned_branch
    )
    notify_user("이전 탐색 경로가 자동 보존되었습니다")
```

#### 단순 방식으로는
```python
# 이전 경로를 모름
# 사용자가 수동으로 /save 해야 함
# 또는 모든 경로 전환 시 무조건 저장 (불필요한 shelves 증가)
```

🤔 **UX 개선 (자동 보존)이 필요하면 LCA 유용**

---

### 3. UI 애니메이션 (웹 전환 후) ⭐⭐

#### 단순 방식
```javascript
// React 컴포넌트
const handleNodeClick = (nodeId) => {
  const newPath = getPathToRoot(nodeId)
  setActivePath(newPath)  // 전체 경로를 새로 렌더링 (깜빡임)
}
```

**사용자 경험**: 경로가 "순간이동"

#### LCA 방식
```javascript
const handleNodeClick = (nodeId) => {
  const currentLeaf = activePath[activePath.length - 1]
  const lca = calculateLCA(tree, currentLeaf, nodeId)
  const lca_index = activePath.indexOf(lca)

  // 애니메이션 계획
  const removePath = activePath.slice(lca_index + 1)  // [B, D, I, O]
  const newPath = getPathToRoot(nodeId)
  const addPath = newPath.slice(lca_index + 1)       // [C, G, M, S]

  // 1. removePath를 점점 흐리게 (fade out, 0.3초)
  animateFadeOut(removePath)

  // 2. lca까지는 밝게 유지 (highlight)
  highlightCommonPath(activePath.slice(0, lca_index + 1))

  // 3. addPath를 점점 밝게 (fade in, 0.3초)
  setTimeout(() => animateFadeIn(addPath), 300)

  // 4. 최종 경로 설정
  setTimeout(() => setActivePath(newPath), 600)
}
```

**사용자 경험**:
- 경로가 "부드럽게 전환"
- "어디까지 같고, 어디서 달라지는지" 시각적으로 명확

🎨 **좋은 UX (부드러운 전환)를 원하면 LCA 필수**

---

### 4. 탐색 패턴 분석 및 통계 ⭐

#### 시나리오
사용자가 "내가 어디까지 탐색했는지", "어떤 패턴으로 고민하는지" 시각화

```
A (root) [탐색 횟수: 15] [분기 깊이 평균: 1.2]
├─ B [탐색 횟수: 8] [여기서 자주 분기함 🔥]
│  ├─ D [탐색 횟수: 5]
│  └─ E [탐색 횟수: 3]
└─ C [탐색 횟수: 7]
   └─ G [탐색 횟수: 7]
```

#### LCA를 활용한 통계
```python
# 경로 전환 시마다 기록
def on_path_switch(old_leaf, new_leaf):
    lca = calculate_lca(old_leaf, new_leaf)
    branch_depth = get_depth(lca)

    # 통계 업데이트
    stats[lca].branch_count += 1
    stats.global_avg_branch_depth += branch_depth

    # 분석
    if branch_depth == 0:
        log("완전히 다른 주제로 전환 (루트 분기)")
    elif branch_depth > 3:
        log("세부 옵션 간 비교 (깊은 분기)")
```

#### UI 표시
```
💡 인사이트:
- 당신은 "B (코드 구현)"에서 가장 자주 갈림길을 고민합니다
- 평균 분기 깊이 1.2 → 큰 주제 간 전환이 많습니다
- 추천: C (일정 관리)를 더 탐색해보세요
```

📊 **데이터 분석 기능이 필요하면 LCA 유용**

---

### 5. 컨텍스트 블록 diff (고급 실험) ⭐

#### 시나리오
LLM에 보내는 컨텍스트 최적화

```
이전 경로: A → B → D → I → O
새 경로:   A → C → G → M → S
```

#### LCA 활용
```python
lca = calculate_lca(old_leaf, new_leaf)  # → A

# LLM에 보낼 프롬프트
context = f"""
[공통 배경]
{get_content("A")}  # 프로젝트 일정 고민

[이전 탐색 요약] (참고용)
- 주제: 코드 구현 → Python/JS 선택 → TypeScript
- 핵심: {summarize(["B", "D", "I", "O"])}

[현재 탐색 초점]
{get_content("C")}  # 일정 관리
{get_content("G")}  # 구체적인 일정
{get_content("M")}  # 마일스톤
{get_content("S")}  # 주간 목표

[사용자 질문]
{user_input}
"""
```

#### 단순 방식
```python
context = f"""
{get_content("A")}
{get_content("C")}
{get_content("G")}
{get_content("M")}
{get_content("S")}

[사용자 질문]
{user_input}
"""
```

**차이**:
- LCA 방식은 "어디까지 공통이고, 무엇이 전환되었는지" LLM에 명시
- 더 나은 컨텍스트 인식 → 더 관련성 높은 답변?

🤖 **LLM 응답 품질 향상 실험 시 LCA 활용 가능**

---

## 📊 Phase별 필요성 분석

| 기능 | Phase CLI-1 | Phase CLI-3 | 웹 전환 후 | 필요성 |
|------|-------------|-------------|------------|--------|
| **단순 경로 전환** | ✅ 핵심 | ✅ 필수 | ✅ 필수 | 필수 |
| **병합(Merge)** | ❌ 구현 안 함 | ⭐ 구현 예정 | ⭐ 핵심 기능 | **LCA 필수** |
| **Shelves 자동화** | ❌ 수동 저장 | 🤔 자동화 검토 | ✅ UX 개선 | LCA 권장 |
| **UI 애니메이션** | ❌ CLI (불필요) | ❌ CLI (불필요) | ⭐ 핵심 UX | **LCA 권장** |
| **탐색 통계/분석** | ❌ 필요없음 | 🤔 로깅용 | ✅ 데이터 기능 | LCA 선택 |
| **컨텍스트 diff** | 🤔 실험 가능 | 🤔 실험 가능 | 🤔 실험 가능 | LCA 선택 |

**분석 결과**:
- Phase CLI-1: LCA 불필요 (단순 전환만)
- Phase CLI-3: **LCA 필수** (병합 기능)
- 웹 전환: **LCA 권장** (애니메이션, UX)

---

## 🤔 plan.md의 두 알고리즘 재해석

### plan.md Line 79-85 (단순 방식)
```markdown
1. 사용자 노드 클릭: 사용자가 화면에 보이는 특정 대화 노드를 클릭한다.
2. 경로 탐색: 클릭된 노드에서부터 시작해서 parent_id를 계속 따라가며
   최상위 루트 노드까지의 전체 경로를 찾는다.
3. 활성 경로 교체: 시스템이 기억하고 있던 '현재 활성 대화 경로'를
   방금 찾은 경로로 완전히 교체한다.
```

**용도**: **단순 경로 전환**

---

### plan.md Line 87-92 (LCA 방식)
```markdown
1. 시스템은 현재 리프 C와 목표 T를 입력으로 받는다.
2. 시스템은 L = LCA(C, T)를 계산한다.
3. 시스템은 prefix = path(root, L)를 구성한다.
4. 시스템은 suffix = path(L, T)를 구성하되 L을 중복 배제한다.
5. 시스템은 activePath = prefix + suffix로 재구성한다.
```

**재해석**:
- "현재 리프 C와 **목표 T**"
- 만약 T가 **다른 리프** (병합 대상)라면?
- 이것은 **병합(Merge) 알고리즘 설명**일 가능성

---

### 두 알고리즘의 공존 이유

**가설 1**: 초안 vs 개선
- 79-85줄: 초안 (간단)
- 87-92줄: 개선 (정교)

**가설 2**: 다른 기능 설명 ⭐
- 79-85줄: 경로 전환
- 87-92줄: 병합 기능

**PM 판단**: 가설 2가 더 타당
- 87-92줄의 "현재 리프"와 "목표 T"는 병합 시나리오를 암시
- 단순 전환에서는 "현재 리프"가 불필요

---

## 🎯 의사결정 프레임워크

### 옵션 A: Phase CLI-1에서 LCA 제거

#### 변경 사항
- `algorithms/lca.py` 제거
- `algorithms/path.py`의 PathReconstructor 제거
- `services/path_switch.py` 간소화

#### 구현
```python
# Phase CLI-1
def switch_path(target_node_id):
    """단순 경로 전환"""
    return get_path_to_root(target_node_id)
```

#### 장점
- ✅ 2-3일 절약
- ✅ 코드 77% 감소 (65줄 → 15줄)
- ✅ 테스트 50% 감소
- ✅ 버그 리스크 감소
- ✅ 빠른 피드백

#### 단점
- ❌ CLI-3에서 병합 구현 시 LCA 추가 필요 → 리팩토링
- ❌ 전체 아키텍처 일관성 저하

#### 적합한 경우
- Phase CLI-1을 최대한 빨리 완성
- 병합 기능 우선순위 낮음
- CLI만 사용 (웹 전환 안 함)

---

### 옵션 B: Phase CLI-1에서 LCA 구현 유지

#### 변경 사항
- 현재 Phase CLI-1 개발지시서 유지
- LCA 테스트 철저히 작성

#### 구현
```python
# Phase CLI-1
def switch_path(current_leaf, target):
    """LCA 기반 경로 전환"""
    lca = calculate_lca(current_leaf, target)
    return reconstruct_path(lca, target)
```

#### 장점
- ✅ Phase CLI-3에서 병합 기능 빠르게 추가
- ✅ 전체 아키텍처 일관성
- ✅ 웹 전환 시 재사용 가능
- ✅ 통계/분석 기능 추가 용이

#### 단점
- ❌ CLI-1 복잡도 증가
- ❌ 2-3일 추가 소요
- ❌ CLI-1에서는 LCA 정보 사용 안 함 (오버엔지니어링)

#### 적합한 경우
- "제대로" 구축하고 싶음 (당신의 꿈)
- 병합 기능 필수
- 웹 전환 계획 확실

---

### 옵션 C: 하이브리드 (PM 추천 ⭐)

#### Phase CLI-1: 단순 방식만
```python
# 경로 전환
def switch_path(target):
    """단순 경로 전환 (빠른 검증)"""
    return get_path_to_root(target)
```

#### Phase CLI-3: LCA 추가 (병합 전용)
```python
# 병합 기능
def merge_branches(node_a, node_b):
    """두 브랜치 병합"""
    lca = calculate_lca(node_a, node_b)

    # LCA 노드에 새 자식 생성
    merged_content = generate_merged_question(node_a, node_b)
    return create_node(parent=lca, content=merged_content)

# 경로 전환은 여전히 단순 방식
def switch_path(target):
    return get_path_to_root(target)

# Shelves 자동화 (선택)
def auto_shelf_on_switch(old_leaf, new_leaf):
    lca = calculate_lca(old_leaf, new_leaf)
    if get_depth(lca) == 0:  # 루트 분기
        create_shelf(old_path[1:])
```

#### 철학
- **경로 전환 ≠ 병합**
- 각 기능에 맞는 알고리즘 사용
- LCA는 "병합", "분석" 전용

#### 장점
- ✅ CLI-1 빠르게 완성 (단순)
- ✅ CLI-3에서 LCA 추가 (필요한 곳에만)
- ✅ 리팩토링 최소화 (경로 전환 로직 유지)
- ✅ 조기 최적화 방지

#### 단점
- 🤔 두 방식 혼재 (일관성 약화?)

#### 대응
- 명확한 구분: `path_utils.py` (단순), `lca_utils.py` (병합)
- 문서화: "경로 전환은 단순, 병합은 LCA"

---

## 📋 최종 권고

### PM 추천: 옵션 C (하이브리드)

#### 이유
1. ✅ Phase CLI-1 목표 달성 (빠른 검증, 낮은 복잡도)
2. ✅ 병합 기능 준비 (Phase CLI-3)
3. ✅ 웹 전환 대비 (애니메이션, 분석)
4. ✅ 조기 최적화 방지 ("필요할 때 추가")

#### 실행 계획

**Phase CLI-1** (2-3주):
- 단순 경로 전환만 구현
- `get_path_to_root()` 하나로 검증
- 체크포인트, Shelves (수동) 구현
- LLM 통합 검증

**Phase CLI-2** (1주):
- LLM 연결
- 실제 사용 패턴 관찰
- "LCA가 필요한 순간" 기록

**Phase CLI-3** (2주):
- **병합 기능 구현** ← LCA 추가
- Shelves 자동화 (선택) ← LCA 활용
- 탐색 통계 (선택) ← LCA 활용
- CLI 완성

**웹 전환** (Phase UI-1):
- 애니메이션 ← LCA 활용
- React 컴포넌트에 LCA 재사용

---

## 📞 다음 액션

### 담당자 확인 사항

**기술 총괄자**:
- [ ] 옵션 C (하이브리드) 검토
- [ ] Phase CLI-1에서 LCA 제거 승인
- [ ] Phase CLI-3에서 LCA 추가 계획 확인

**아키텍처 설계자**:
- [ ] plan.md 87-92줄이 "병합" 시나리오인지 확인
- [ ] 하이브리드 접근 시 아키텍처 일관성 검토
- [ ] Phase CLI-1 설계서 수정 (LCA 제거)

**PM (나)**:
- [ ] 담당자 피드백 수집 (24시간 이내)
- [ ] 최종 결정 (옵션 A/B/C)
- [ ] Phase CLI-1 개발지시서 최종본 발행

---

## 🔗 참고 자료

### 관련 문서
- `docs/초기개발/PM_보고서/03_LCA_불필요성_제안서.md` - 기술 총괄자 제안
- `docs/아키텍처설계/터미널_프로토타입_최종설계서.md` - 현재 아키텍처
- `docs/PM_관리/PM_개발지시/phase_CLI-1_개발지시서.md` - 현재 지시서
- `plan.md` Lines 79-85, 87-92 - 두 알고리즘 원본

### 의사결정 기준표

| 질문 | YES → | NO → |
|------|-------|------|
| 병합 기능이 핵심인가? | 옵션 B 또는 C | 옵션 A |
| 웹 UI 애니메이션 중요? | 옵션 B 또는 C | 옵션 A |
| CLI-1 빠른 완성 중요? | 옵션 A 또는 C | 옵션 B |
| "제대로" 구축 vs 빠른 검증? | 제대로 → B | 빠름 → A |
| 시간 여유 있음? | 옵션 B 또는 C | 옵션 A |

**당신의 경우**:
- "제 꿈과 관련, 제대로 만들고 싶다" → 옵션 B 경향
- "시간 많다" → 옵션 B 또는 C
- plan.md에 병합 기능 명시 → 옵션 C 추천

---

## ✅ 요약

**기술 총괄자의 분석**: 정확 (단순 경로 전환에서는 LCA 불필요)
**PM의 추가 분석**: LCA는 병합, 애니메이션, 분석에 필요
**최종 권고**: 옵션 C (Phase CLI-1은 단순, CLI-3에서 LCA 추가)

**핵심 메시지**:
> LCA는 "경로 전환"이 아닌 **"경로 관계 분석"**을 위한 도구입니다.
> Phase CLI-1에서는 불필요하나, **병합 기능**과 **웹 UX**를 위해서는 필수입니다.

---

**작성 완료**: 2025-11-09
**회신 요청**: 24시간 이내
**대기 중**: 담당자 확인 및 최종 결정

---

## 📎 부록: 코드 예시

### 하이브리드 접근 구현 예시

```python
# cli/core/path_utils.py (Phase CLI-1)

def get_path_to_root(tree: ConversationTree, node_id: str) -> List[str]:
    """단순 경로 추적 (경로 전환용)

    Args:
        tree: 대화 트리
        node_id: 목표 노드 ID

    Returns:
        루트에서 노드까지의 경로 [root, ..., node]
    """
    path = []
    current = node_id

    while current is not None:
        node = tree.get_node(current)
        path.insert(0, node.id)
        current = node.parent_id

    return path


# cli/services/path_switch.py (Phase CLI-1)

class PathSwitchService:
    """경로 전환 서비스 (단순화 버전)"""

    def __init__(self, tree: ConversationTree, store: Store):
        self.tree = tree
        self.store = store

    def switch_path(self, target_node_id: str) -> List[str]:
        """노드 클릭 시 경로 전환

        Args:
            target_node_id: 클릭한 노드 ID

        Returns:
            새 활성 경로
        """
        # 단순 경로 추적
        new_path = get_path_to_root(self.tree, target_node_id)

        # Store 업데이트
        self.store.set_active_path(new_path)
        self.store.set_selected_node(target_node_id)

        return new_path


# cli/core/lca_utils.py (Phase CLI-3에 추가)

def calculate_lca(tree: ConversationTree, node_a: str, node_b: str) -> str:
    """LCA 계산 (병합 및 분석용)

    Args:
        tree: 대화 트리
        node_a: 첫 번째 노드
        node_b: 두 번째 노드

    Returns:
        LCA 노드 ID
    """
    path_a = get_path_to_root(tree, node_a)
    path_b = get_path_to_root(tree, node_b)

    lca = path_a[0]  # 루트
    for i in range(min(len(path_a), len(path_b))):
        if path_a[i] == path_b[i]:
            lca = path_a[i]
        else:
            break

    return lca


# cli/services/merge.py (Phase CLI-3에 추가)

class MergeService:
    """브랜치 병합 서비스"""

    def merge_branches(self, node_a: str, node_b: str) -> str:
        """두 노드의 인사이트를 병합

        Args:
            node_a: 첫 번째 노드
            node_b: 두 번째 노드

        Returns:
            새로 생성된 병합 노드 ID
        """
        # LCA 계산
        lca = calculate_lca(self.tree, node_a, node_b)

        # 병합 질문 생성
        content_a = self.tree.get_node(node_a).content
        content_b = self.tree.get_node(node_b).content
        merged_content = f"[병합] {content_a}와 {content_b}를 함께 고려하면?"

        # LCA 노드에 새 자식 생성
        new_node = self.tree.create_node(
            parent_id=lca,
            role="user",
            content=merged_content
        )

        return new_node.id
```

---

**문서 버전**: 1.0
**다음 업데이트**: 담당자 피드백 반영 후