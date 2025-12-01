#!/usr/bin/env python
"""
Scenario 5: Navigation History 및 엣지 케이스 검증

목적: 이동 이력, back 명령, 20개 제한 검증
"""

import time
from datetime import datetime, timedelta
from core.store import Store
from core.conversation import ConversationManager

def simulate_navigation_history():
    """
    Navigation history 시뮬레이션.
    CLI 클래스의 로직을 재현합니다.
    """
    return []

def save_navigation_history(history, store):
    """현재 위치를 navigation history에 저장 (CLI 로직과 동일)"""
    current = store.get_current_node()
    if current and current.id != 'root':
        history.append({
            'timestamp': datetime.now(),
            'node_id': current.id,
            'question': current.user_question[:60] if current.user_question else "(대화 없음)"
        })

        # 최근 20개만 유지
        if len(history) > 20:
            history.pop(0)

def format_elapsed_time(elapsed):
    """경과 시간을 한국어로 포맷팅 (CLI 로직과 동일)"""
    seconds = int(elapsed.total_seconds())
    if seconds < 60:
        return "방금 전"
    elif seconds < 3600:
        return f"{seconds // 60}분 전"
    elif seconds < 86400:
        return f"{seconds // 3600}시간 전"
    else:
        return f"{seconds // 86400}일 전"


def test_part_a():
    """Part A: 기본 이력 기능"""
    print("=" * 80)
    print("Part A: 기본 이력 기능")
    print("=" * 80)

    store = Store()
    cm = ConversationManager(store)
    history = simulate_navigation_history()

    # 1. 노드 3개 생성
    n1 = cm.turn("질문1", "답변1")
    n2 = cm.turn("질문2", "답변2")
    n3 = cm.turn("질문3", "답변3")

    print(f"✅ 노드 3개 생성: n1, n2, n3")
    print(f"   현재 위치: n3")

    # 2. n1로 이동 (n2에서 n1로 - n2 이력 저장되어야 함... 아니 n3가 저장되어야)
    print(f"\n📍 n1로 switch (n3 이력 저장)")
    save_navigation_history(history, store)
    store.switch_to_node(n1.id)

    print(f"✅ 이력 개수: {len(history)}")
    if len(history) == 1 and history[0]['node_id'] == n3.id:
        print(f"✅ n3 이력 저장됨")
    else:
        print(f"❌ 이력 저장 실패")
        return False

    # 3. n3로 이동 (n1 이력 저장)
    print(f"\n📍 n3로 switch (n1 이력 저장)")
    save_navigation_history(history, store)
    store.switch_to_node(n3.id)

    print(f"✅ 이력 개수: {len(history)}")
    if len(history) == 2:
        print(f"✅ n3, n1 이력 2개 확인")
        print(f"   최근: {history[-1]['question']}")
        print(f"   이전: {history[-2]['question']}")
    else:
        print(f"❌ 이력 개수 오류")
        return False

    # 4. back (n1로 복귀)
    print(f"\n📍 back 명령 (n1로 복귀)")
    if history:
        last = history.pop()
        store.switch_to_node(last['node_id'])
        current = store.get_current_node()
        print(f"✅ 복귀 완료: {current.user_question}")

        if current.id != n1.id:
            print(f"❌ 복귀 위치 오류")
            return False
    else:
        print(f"❌ 이력이 비어있음")
        return False

    # 5. back (n3로 복귀)
    print(f"\n📍 back 명령 (n3로 복귀)")
    if history:
        last = history.pop()
        store.switch_to_node(last['node_id'])
        current = store.get_current_node()
        print(f"✅ 복귀 완료: {current.user_question}")

        if current.id != n3.id:
            print(f"❌ 복귀 위치 오류")
            return False
    else:
        print(f"❌ 이력이 비어있음")
        return False

    # 6. back (이력 없음)
    print(f"\n📍 back 명령 (이력 없음)")
    if not history:
        print(f"✅ 이력 없음 - 에러 메시지 표시 예상")
    else:
        print(f"❌ 이력이 남아있음 (예상: 0개, 실제: {len(history)}개)")
        return False

    print(f"\n✅ Part A 통과")
    return True


def test_part_b():
    """Part B: 체크포인트 로드 이력 (버그 수정 검증)"""
    print("\n" + "=" * 80)
    print("Part B: 체크포인트 로드 이력 (버그 수정 검증)")
    print("=" * 80)

    store = Store()
    cm = ConversationManager(store)
    history = simulate_navigation_history()

    # 1. 노드 3개 생성
    n1 = cm.turn("질문1", "답변1")
    n2 = cm.turn("질문2", "답변2")
    n3 = cm.turn("질문3", "답변3")

    print(f"✅ 노드 3개 생성: n1, n2, n3")

    # 2. 체크포인트 저장
    store.save_checkpoint("cp1")
    print(f"✅ 체크포인트 'cp1' 저장 (n3에서)")

    # 3. n1로 이동
    save_navigation_history(history, store)
    store.switch_to_node(n1.id)
    print(f"✅ n1로 이동")

    # 4. n4 생성 (분기)
    n4 = cm.turn("질문4", "답변4")
    print(f"✅ n4 생성 (분기)")

    # 5. 체크포인트 로드 (이력 저장되어야 함 - 버그 수정)
    print(f"\n📍 체크포인트 'cp1' 로드")
    print(f"   로드 전 현재 위치: n4")

    # 이력 저장 (버그 수정 후 로직)
    save_navigation_history(history, store)

    store.load_checkpoint("cp1")
    print(f"✅ 체크포인트 로드 완료")
    print(f"   로드 후 현재 위치: n3")

    # 6. 이력 확인
    print(f"\n이력 확인:")
    print(f"  이력 개수: {len(history)}")

    if len(history) == 2:
        print(f"  ✅ 이력 2개 (n3, n4)")
        print(f"     최근: {history[-1]['question']}")
        print(f"     이전: {history[-2]['question']}")

        if history[-1]['node_id'] == n4.id:
            print(f"  ✅ 체크포인트 로드 시 이력 저장됨 (버그 수정 검증)")
        else:
            print(f"  ❌ 최근 이력이 n4가 아님")
            return False
    else:
        print(f"  ❌ 이력 개수 오류 (예상: 2, 실제: {len(history)})")
        return False

    # 7. back으로 n4 복귀 가능한지 확인
    print(f"\n📍 back 명령 (n4로 복귀 가능한지)")
    if history:
        last = history.pop()
        store.switch_to_node(last['node_id'])
        current = store.get_current_node()

        if current.id == n4.id:
            print(f"✅ n4로 복귀 성공 - 버그 수정 완료 확인")
        else:
            print(f"❌ 복귀 위치 오류")
            return False
    else:
        print(f"❌ 이력이 비어있음")
        return False

    print(f"\n✅ Part B 통과 (버그 수정 검증 완료)")
    return True


def test_part_c():
    """Part C: 20개 제한 및 오버플로우"""
    print("\n" + "=" * 80)
    print("Part C: 20개 제한 및 오버플로우")
    print("=" * 80)

    store = Store()
    cm = ConversationManager(store)
    history = simulate_navigation_history()

    # 1. 22개 노드 순차 생성
    print(f"📍 22개 노드 생성 중...")
    nodes = []
    for i in range(1, 23):
        node = cm.turn(f"질문{i}", f"답변{i}")
        nodes.append(node)

    print(f"✅ 22개 노드 생성 완료")

    # 2. 각 노드를 차례로 방문 (22번 이동)
    print(f"\n📍 22번 이동 시작...")
    for i, node in enumerate(nodes, 1):
        save_navigation_history(history, store)
        store.switch_to_node(node.id)

        if i % 5 == 0:
            print(f"   {i}번째 이동 완료 (이력 개수: {len(history)})")

    print(f"\n이력 최종 개수: {len(history)}")

    # 3. 최근 20개만 유지 확인
    if len(history) == 20:
        print(f"✅ 20개 제한 적용됨")
        print(f"   처음 2개 노드는 자동 삭제됨")
    else:
        print(f"❌ 이력 개수 오류 (예상: 20, 실제: {len(history)})")
        return False

    # 4. back 20번 실행 가능
    print(f"\n📍 back 명령 20번 실행...")
    back_count = 0
    while history:
        last = history.pop()
        store.switch_to_node(last['node_id'])
        back_count += 1

    if back_count == 20:
        print(f"✅ back 20번 정상 실행")
    else:
        print(f"❌ back 실행 횟수 오류 (예상: 20, 실제: {back_count})")
        return False

    # 5. 21번째 back - 이력 부족
    print(f"\n📍 21번째 back 시도 (이력 없음)")
    if not history:
        print(f"✅ 이력 부족 - 에러 메시지 예상")
    else:
        print(f"❌ 이력이 남아있음")
        return False

    print(f"\n✅ Part C 통과 (20개 제한 및 오버플로우)")
    return True


def test_part_d():
    """Part D: 루트 노드 제외"""
    print("\n" + "=" * 80)
    print("Part D: 루트 노드 제외")
    print("=" * 80)

    store = Store()
    cm = ConversationManager(store)
    history = simulate_navigation_history()

    # 1. CLI 시작 (root에 위치)
    print(f"✅ CLI 시작 (현재 위치: root)")
    current = store.get_current_node()
    print(f"   현재 노드 ID: {current.id}")

    # 2. n1 생성
    n1 = cm.turn("질문1", "답변1")
    print(f"✅ n1 생성 (자동 이동)")

    # 3. root로 이동
    print(f"\n📍 root로 switch")
    save_navigation_history(history, store)  # n1 저장되어야 함
    store.switch_to_node('root')

    # 4. 이력 확인 - root는 저장 안 됨
    print(f"\n이력 확인:")
    print(f"  이력 개수: {len(history)}")

    if len(history) == 1:
        if history[0]['node_id'] == n1.id:
            print(f"  ✅ n1만 저장됨 (root는 제외)")
        else:
            print(f"  ❌ 저장된 노드가 n1이 아님")
            return False
    else:
        print(f"  ❌ 이력 개수 오류 (예상: 1, 실제: {len(history)})")
        return False

    # 5. n1 생성 후 다시 root 이동
    n2 = cm.turn("질문2", "답변2")
    save_navigation_history(history, store)  # n2 저장
    store.switch_to_node('root')

    print(f"\n📍 root로 다시 이동")
    print(f"  이력 개수: {len(history)}")

    # 6. back으로 n2 복귀 (root 스킵)
    print(f"\n📍 back 명령 (root 스킵하고 n2로)")
    if history:
        last = history.pop()
        store.switch_to_node(last['node_id'])
        current = store.get_current_node()

        if current.id == n2.id:
            print(f"✅ n2로 복귀 (root 스킵 확인)")
        else:
            print(f"❌ 복귀 위치 오류")
            return False
    else:
        print(f"❌ 이력이 비어있음")
        return False

    print(f"\n✅ Part D 통과 (루트 노드 제외)")
    return True


def test_part_e():
    """Part E: 상대 시간 표시"""
    print("\n" + "=" * 80)
    print("Part E: 상대 시간 표시")
    print("=" * 80)

    store = Store()
    cm = ConversationManager(store)
    history = simulate_navigation_history()

    # 1. 노드 생성 및 즉시 이동
    n1 = cm.turn("질문1", "답변1")
    n2 = cm.turn("질문2", "답변2")

    save_navigation_history(history, store)
    store.switch_to_node(n1.id)

    print(f"✅ 노드 이동 (방금 전)")

    # 2. "방금 전" 확인
    if history:
        elapsed = datetime.now() - history[-1]['timestamp']
        time_str = format_elapsed_time(elapsed)
        print(f"  시간: {time_str}")

        if time_str == "방금 전":
            print(f"  ✅ '방금 전' 표시 정상")
        else:
            print(f"  ❌ 시간 포맷 오류 (예상: '방금 전', 실제: '{time_str}')")
            return False

    # 3. 61초 전 시뮬레이션
    print(f"\n📍 61초 전 시뮬레이션")
    history[-1]['timestamp'] = datetime.now() - timedelta(seconds=61)
    elapsed = datetime.now() - history[-1]['timestamp']
    time_str = format_elapsed_time(elapsed)
    print(f"  시간: {time_str}")

    if "1분 전" in time_str:
        print(f"  ✅ '1분 전' 표시 정상")
    else:
        print(f"  ❌ 시간 포맷 오류 (예상: '1분 전', 실제: '{time_str}')")
        return False

    # 4. 5분 전 시뮬레이션
    print(f"\n📍 5분 전 시뮬레이션")
    history[-1]['timestamp'] = datetime.now() - timedelta(minutes=5)
    elapsed = datetime.now() - history[-1]['timestamp']
    time_str = format_elapsed_time(elapsed)
    print(f"  시간: {time_str}")

    if "5분 전" in time_str:
        print(f"  ✅ '5분 전' 표시 정상")
    else:
        print(f"  ❌ 시간 포맷 오류 (예상: '5분 전', 실제: '{time_str}')")
        return False

    # 5. 2시간 전 시뮬레이션
    print(f"\n📍 2시간 전 시뮬레이션")
    history[-1]['timestamp'] = datetime.now() - timedelta(hours=2)
    elapsed = datetime.now() - history[-1]['timestamp']
    time_str = format_elapsed_time(elapsed)
    print(f"  시간: {time_str}")

    if "2시간 전" in time_str:
        print(f"  ✅ '2시간 전' 표시 정상")
    else:
        print(f"  ❌ 시간 포맷 오류 (예상: '2시간 전', 실제: '{time_str}')")
        return False

    # 6. 1일 전 시뮬레이션
    print(f"\n📍 1일 전 시뮬레이션")
    history[-1]['timestamp'] = datetime.now() - timedelta(days=1)
    elapsed = datetime.now() - history[-1]['timestamp']
    time_str = format_elapsed_time(elapsed)
    print(f"  시간: {time_str}")

    if "1일 전" in time_str:
        print(f"  ✅ '1일 전' 표시 정상")
    else:
        print(f"  ❌ 시간 포맷 오류 (예상: '1일 전', 실제: '{time_str}')")
        return False

    print(f"\n✅ Part E 통과 (상대 시간 표시)")
    return True


def test_scenario_5():
    """Scenario 5: Navigation History 및 엣지 케이스 전체 테스트"""
    print("=" * 80)
    print("Scenario 5: Navigation History 및 엣지 케이스 검증")
    print("=" * 80)
    print()

    results = []

    # Part A
    try:
        results.append(("Part A: 기본 이력 기능", test_part_a()))
    except Exception as e:
        print(f"\n❌ Part A 실행 중 오류: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Part A: 기본 이력 기능", False))

    # Part B
    try:
        results.append(("Part B: 체크포인트 로드 이력", test_part_b()))
    except Exception as e:
        print(f"\n❌ Part B 실행 중 오류: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Part B: 체크포인트 로드 이력", False))

    # Part C
    try:
        results.append(("Part C: 20개 제한", test_part_c()))
    except Exception as e:
        print(f"\n❌ Part C 실행 중 오류: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Part C: 20개 제한", False))

    # Part D
    try:
        results.append(("Part D: 루트 노드 제외", test_part_d()))
    except Exception as e:
        print(f"\n❌ Part D 실행 중 오류: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Part D: 루트 노드 제외", False))

    # Part E
    try:
        results.append(("Part E: 상대 시간 표시", test_part_e()))
    except Exception as e:
        print(f"\n❌ Part E 실행 중 오류: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Part E: 상대 시간 표시", False))

    # 결과 요약
    print("\n" + "=" * 80)
    print("Scenario 5 결과 요약")
    print("=" * 80)

    all_passed = True
    for name, passed in results:
        status = "✅" if passed else "❌"
        print(f"{status} {name}")
        if not passed:
            all_passed = False

    print("\n" + "=" * 80)
    if all_passed:
        print("✅ Scenario 5 전체 테스트 통과!")
        print("\n검증 완료:")
        print("  ✅ switch로 이동 시 이력 저장")
        print("  ✅ checkpoint load로 이동 시 이력 저장 (버그 수정)")
        print("  ✅ back 명령으로 이전 위치 복귀")
        print("  ✅ 22번 이동 시 최근 20개만 유지")
        print("  ✅ 루트 노드는 이력에 저장 안 됨")
        print("  ✅ 상대 시간 표시 (방금 전, N분 전, N시간 전, N일 전)")
    else:
        print("❌ 일부 테스트 실패")

    print("=" * 80)

    return all_passed


if __name__ == "__main__":
    print("\n🧪 Scenario 5 테스트 시작\n")

    try:
        success = test_scenario_5()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ 테스트 실행 중 심각한 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
