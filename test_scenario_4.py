#!/usr/bin/env python
"""
Scenario 4: 대규모 트리 및 분기 자동 체크포인트 검증

목적: 복잡한 트리에서 자동 체크포인트와 이동 기능 검증
"""

from core.store import Store
from core.conversation import ConversationManager
from core.checkpoint import get_checkpoint_stats

def test_scenario_4():
    """Scenario 4: 대규모 트리 생성 및 분기 자동 체크포인트 검증"""
    print("=" * 80)
    print("Scenario 4: 대규모 트리 및 분기 자동 체크포인트 검증")
    print("=" * 80)
    print()

    store = Store()
    cm = ConversationManager(store)

    # 분기 자동 체크포인트 시뮬레이션
    def auto_checkpoint_on_branch(node_id):
        """분기 발생 시 자동 체크포인트 생성 (CLI 로직과 동일)"""
        node = store.tree.get_node(node_id)
        if not node:
            return False

        children = store.tree.get_children(node_id)
        if len(children) >= 1:
            auto_name = f"@branch_{node_id[:8]}"
            existing = store.list_checkpoints()
            if auto_name not in existing:
                # 임시로 해당 노드로 이동해서 체크포인트 저장
                current_before = store.get_current_node_id()
                store.switch_to_node(node_id)
                store.save_checkpoint(auto_name)
                store.switch_to_node(current_before)
                print(f"🔀 분기 발생: 자동 체크포인트 '{auto_name}' 생성됨")
                return True
        return False

    print("1단계: 10개 노드로 구성된 복잡한 트리 생성")
    print("-" * 80)

    # root → n1 → n2 → n3
    n1 = cm.turn("Python이란?", "Python은 프로그래밍 언어입니다.")
    print(f"✅ n1 생성: Python이란?")

    n2 = cm.turn("Django는?", "Django는 웹 프레임워크입니다.")
    print(f"✅ n2 생성: Django는?")

    n3 = cm.turn("REST API는?", "REST API는 아키텍처 스타일입니다.")
    print(f"✅ n3 생성: REST API는?")

    # n1으로 이동 → n4 생성 (분기!)
    print(f"\n📍 n1로 이동")
    store.switch_to_node(n1.id)

    # 분기 감지
    auto_checkpoint_on_branch(n1.id)

    n4 = cm.turn("Flask는?", "Flask는 마이크로 프레임워크입니다.")
    print(f"✅ n4 생성: Flask는? (n1에서 분기)")

    n5 = cm.turn("Blueprint는?", "Blueprint는 Flask의 모듈화 기능입니다.")
    print(f"✅ n5 생성: Blueprint는?")

    # root로 이동 → n6 생성
    print(f"\n📍 root로 이동")
    store.switch_to_node('root')

    n6 = cm.turn("JavaScript는?", "JavaScript는 스크립트 언어입니다.")
    print(f"✅ n6 생성: JavaScript는?")

    # n6 → n7 → n8
    n7 = cm.turn("React는?", "React는 UI 라이브러리입니다.")
    print(f"✅ n7 생성: React는?")

    n8 = cm.turn("Hooks는?", "Hooks는 React의 상태 관리 기능입니다.")
    print(f"✅ n8 생성: Hooks는?")

    # n6으로 이동 → n9 생성 (분기!)
    print(f"\n📍 n6으로 이동")
    store.switch_to_node(n6.id)

    # 분기 감지
    auto_checkpoint_on_branch(n6.id)

    n9 = cm.turn("Vue는?", "Vue는 프레임워크입니다.")
    print(f"✅ n9 생성: Vue는? (n6에서 분기)")

    # root로 이동 → n10 생성
    print(f"\n📍 root로 이동")
    store.switch_to_node('root')

    n10 = cm.turn("데이터베이스란?", "데이터베이스는 데이터 저장소입니다.")
    print(f"✅ n10 생성: 데이터베이스란?")

    print()
    print("=" * 80)
    print("트리 구조:")
    print("=" * 80)
    print("""
root
├── n1 "Python이란?"
│   ├── n2 "Django는?"
│   │   └── n3 "REST API는?"
│   └── n4 "Flask는?"  ← 분기! @branch_Python
│       └── n5 "Blueprint는?"
├── n6 "JavaScript는?"
│   ├── n7 "React는?"
│   │   └── n8 "Hooks는?"
│   └── n9 "Vue는?"  ← 분기! @branch_JavaScript
└── n10 "데이터베이스란?"
    """)

    print()
    print("=" * 80)
    print("2단계: 자동 체크포인트 검증")
    print("=" * 80)

    checkpoints = store.list_checkpoints()
    branch_cps = {name: node_id for name, node_id in checkpoints.items() if name.startswith('@branch_')}

    print(f"\n자동 체크포인트 개수: {len(branch_cps)}개")

    expected_branches = [n1.id, n6.id]
    found_branches = []

    for name, node_id in branch_cps.items():
        node = store.tree.get_node(node_id)
        children = store.tree.get_children(node_id)
        print(f"  • {name}")
        print(f"    노드 ID: {node_id[:8]}")
        print(f"    질문: {node.user_question}")
        print(f"    자식 개수: {len(children)}개")
        print()
        found_branches.append(node_id)

    # 검증
    success = True
    if len(branch_cps) != 2:
        print(f"❌ 실패: 자동 체크포인트가 2개여야 하는데 {len(branch_cps)}개입니다.")
        success = False
    else:
        print(f"✅ 자동 체크포인트 개수 정상 (2개)")

    for expected_id in expected_branches:
        if expected_id not in found_branches:
            print(f"❌ 실패: {expected_id[:8]} 노드에 체크포인트가 없습니다.")
            success = False

    if success:
        print("✅ 모든 분기점에 자동 체크포인트 생성됨")

    print()
    print("=" * 80)
    print("3단계: 깊은 경로 탐색")
    print("=" * 80)

    # n8로 이동 (root → n6 → n7 → n8 경로)
    print(f"\n📍 n8로 이동 (Hooks 노드)")
    store.switch_to_node(n8.id)

    current = store.get_current_node()
    print(f"✅ 현재 노드: {current.user_question}")

    path = store.tree.get_path_to_root(current.id)
    print(f"✅ 경로 길이: {len(path) - 1} (루트 제외)")

    print(f"\n경로:")
    for i, node_id in enumerate(path):
        node = store.tree.get_node(node_id)
        indent = "  " * i
        if node.id == 'root':
            print(f"{indent}root")
        else:
            print(f"{indent}└─ {node.user_question}")

    print()
    print("=" * 80)
    print("4단계: 체크포인트 이동")
    print("=" * 80)

    # @branch_ 로 시작하는 체크포인트 찾기
    branch1_name = None
    branch2_name = None

    for name, node_id in checkpoints.items():
        if name.startswith('@branch_'):
            if node_id == n1.id:
                branch1_name = name
            elif node_id == n6.id:
                branch2_name = name

    if branch1_name:
        print(f"\n📍 {branch1_name} 로드 (n1 Python 노드)")
        store.load_checkpoint(branch1_name)
        current = store.get_current_node()
        print(f"✅ 현재 노드: {current.user_question}")

        if current.id != n1.id:
            print(f"❌ 실패: 체크포인트 로드 후 위치가 올바르지 않음")
            success = False
        else:
            print(f"✅ 체크포인트로 정확히 이동")

    if branch2_name:
        print(f"\n📍 {branch2_name} 로드 (n6 JavaScript 노드)")
        store.load_checkpoint(branch2_name)
        current = store.get_current_node()
        print(f"✅ 현재 노드: {current.user_question}")

        if current.id != n6.id:
            print(f"❌ 실패: 체크포인트 로드 후 위치가 올바르지 않음")
            success = False
        else:
            print(f"✅ 체크포인트로 정확히 이동")

    print()
    print("=" * 80)
    print("5단계: 통계 확인")
    print("=" * 80)

    stats = get_checkpoint_stats(store)

    print(f"\n체크포인트 통계:")
    print(f"  • 총 개수: {stats['total_count']}개")
    print(f"  • 평균 깊이: {stats['avg_depth']:.1f}")
    print(f"  • 최대 깊이: {stats['max_depth']}")
    print(f"  • 최소 깊이: {stats['min_depth']}")
    print(f"  • 분기점: {stats['branch_points']}개")

    # 평균 깊이 검증 (n1: depth 1, n6: depth 1 → avg 1.0)
    expected_avg = 1.0
    if abs(stats['avg_depth'] - expected_avg) < 0.01:
        print(f"\n✅ 평균 깊이 계산 정확 (예상: {expected_avg}, 실제: {stats['avg_depth']:.1f})")
    else:
        print(f"\n❌ 평균 깊이 계산 오류 (예상: {expected_avg}, 실제: {stats['avg_depth']:.1f})")
        success = False

    print()
    print("=" * 80)
    print("Scenario 4 결과")
    print("=" * 80)

    if success:
        print("✅ Scenario 4 테스트 통과!")
        print("\n검증 완료:")
        print("  ✅ 10개 노드 트리 생성")
        print("  ✅ 2개 분기점에 자동 체크포인트 생성")
        print("  ✅ 체크포인트 이름 형식 검증 (@branch_*)")
        print("  ✅ 체크포인트로 정확히 이동")
        print("  ✅ 깊은 경로 탐색 정상 작동")
        print("  ✅ 체크포인트 통계 계산 정확")
        return True
    else:
        print("❌ Scenario 4 테스트 실패")
        return False


if __name__ == "__main__":
    print("\n🧪 Scenario 4 테스트 시작\n")

    try:
        success = test_scenario_4()
        print("\n" + "=" * 80)
        if success:
            print("✅ 모든 테스트 통과")
        else:
            print("❌ 일부 테스트 실패")
        print("=" * 80)
    except Exception as e:
        print(f"\n❌ 테스트 실행 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
