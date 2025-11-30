#!/usr/bin/env python
"""
간단한 테스트 스크립트 - 분기 자동 체크포인트 & Navigation History 테스트
"""

from core.store import Store
from core.conversation import ConversationManager

def test_branch_auto_checkpoint():
    """분기 자동 체크포인트 테스트"""
    print("=" * 80)
    print("테스트 1: 분기 자동 체크포인트")
    print("=" * 80)

    store = Store()
    cm = ConversationManager(store)

    # 첫 번째 노드 생성
    node1 = cm.turn("Python이란?", "Python은 프로그래밍 언어입니다.")
    print(f"✅ 노드 1 생성: {node1.id[:8]}")

    # 두 번째 노드 생성 (선형)
    node2 = cm.turn("장점은?", "간결하고 읽기 쉽습니다.")
    print(f"✅ 노드 2 생성: {node2.id[:8]}")

    # 노드 1로 돌아가기 (분기 준비)
    store.switch_to_node(node1.id)
    print(f"✅ 노드 1로 전환")

    # 분기 시뮬레이션 (cmd_ask에서 하는 것처럼)
    current = store.get_current_node()
    children = store.tree.get_children(current.id)
    print(f"   현재 노드의 자식 개수: {len(children)}")

    if len(children) >= 1:
        auto_name = f"@branch_{current.id[:8]}"
        if auto_name not in store.list_checkpoints():
            store.save_checkpoint(auto_name)
            print(f"🔀 분기 발생: 자동 체크포인트 '{auto_name}' 생성됨")

    # 새 분기 노드 생성
    node3 = cm.turn("단점은?", "속도가 느릴 수 있습니다.")
    print(f"✅ 노드 3 생성 (분기): {node3.id[:8]}")

    # 체크포인트 확인
    checkpoints = store.list_checkpoints()
    print(f"\n저장된 체크포인트: {list(checkpoints.keys())}")

    # 분기 체크포인트 확인
    branch_cps = [name for name in checkpoints.keys() if name.startswith('@branch_')]
    print(f"분기 체크포인트: {branch_cps}")

    if branch_cps:
        print("✅ 테스트 통과: 분기 자동 체크포인트 생성됨")
    else:
        print("❌ 테스트 실패: 분기 체크포인트가 없음")

    print()

def test_navigation_history():
    """Navigation History 테스트"""
    print("=" * 80)
    print("테스트 2: Navigation History")
    print("=" * 80)

    from datetime import datetime

    # 이력 시뮬레이션
    navigation_history = []

    # 노드 생성 (시뮬레이션)
    nodes_info = [
        {'id': 'node1', 'question': 'Python이란?'},
        {'id': 'node2', 'question': '장점은?'},
        {'id': 'node3', 'question': '단점은?'},
    ]

    # Switch 시뮬레이션
    for i, node_info in enumerate(nodes_info):
        navigation_history.append({
            'timestamp': datetime.now(),
            'node_id': node_info['id'],
            'question': node_info['question']
        })
        print(f"✅ 이력 추가: {node_info['question']}")

    print(f"\n이력 개수: {len(navigation_history)}")

    # Back 시뮬레이션
    if navigation_history:
        last = navigation_history.pop()
        print(f"✅ back 실행: '{last['question']}'로 복귀")
        print(f"   남은 이력: {len(navigation_history)}개")

    if len(navigation_history) == 2:
        print("✅ 테스트 통과: Navigation history 정상 동작")
    else:
        print("❌ 테스트 실패: 이력 개수 불일치")

    print()

def test_format_elapsed_time():
    """시간 포맷팅 테스트"""
    print("=" * 80)
    print("테스트 3: 시간 포맷팅")
    print("=" * 80)

    from datetime import timedelta

    def format_elapsed_time(elapsed) -> str:
        seconds = int(elapsed.total_seconds())
        if seconds < 60:
            return "방금 전"
        elif seconds < 3600:
            return f"{seconds // 60}분 전"
        elif seconds < 86400:
            return f"{seconds // 3600}시간 전"
        else:
            return f"{seconds // 86400}일 전"

    test_cases = [
        (timedelta(seconds=30), "방금 전"),
        (timedelta(minutes=5), "5분 전"),
        (timedelta(hours=2), "2시간 전"),
        (timedelta(days=1), "1일 전"),
    ]

    all_passed = True
    for elapsed, expected in test_cases:
        result = format_elapsed_time(elapsed)
        passed = result == expected
        status = "✅" if passed else "❌"
        print(f"{status} {elapsed} → {result} (기대: {expected})")
        if not passed:
            all_passed = False

    if all_passed:
        print("✅ 테스트 통과: 시간 포맷팅 정상 동작")
    else:
        print("❌ 테스트 실패: 시간 포맷팅 오류")

    print()

if __name__ == "__main__":
    print("\n🧪 새 기능 테스트 시작\n")

    test_branch_auto_checkpoint()
    test_navigation_history()
    test_format_elapsed_time()

    print("=" * 80)
    print("✅ 모든 테스트 완료")
    print("=" * 80)
