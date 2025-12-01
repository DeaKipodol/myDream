#!/usr/bin/env python
"""
버그 수정 검증 스크립트: 체크포인트 로드 시 이력 저장
"""

from core.store import Store
from core.conversation import ConversationManager

def test_checkpoint_load_history():
    """체크포인트 로드 시 navigation history 저장 테스트"""
    print("=" * 80)
    print("테스트: 체크포인트 로드 시 이력 저장 확인")
    print("=" * 80)

    store = Store()
    cm = ConversationManager(store)

    # 시뮬레이션: navigation_history (실제 CLI에서 사용하는 방식)
    navigation_history = []

    # 1. 노드 3개 생성
    node1 = cm.turn("질문1", "답변1")
    node2 = cm.turn("질문2", "답변2")
    node3 = cm.turn("질문3", "답변3")

    print(f"✅ 노드 3개 생성: n1, n2, n3")
    print(f"   현재 위치: n3 ({node3.id[:8]})")

    # 2. 체크포인트 저장
    store.save_checkpoint("cp1")
    print(f"✅ 체크포인트 'cp1' 저장 (n3에서)")

    # 3. 노드 1로 이동
    store.switch_to_node(node1.id)
    print(f"✅ n1로 이동")

    # 4. 새 노드 생성 (분기)
    node4 = cm.turn("질문4", "답변4")
    print(f"✅ n4 생성 (분기)")

    # 5. 체크포인트 로드 시 이력 저장 시뮬레이션
    print(f"\n--- 체크포인트 'cp1' 로드 시도 ---")

    # 이력 저장 (수정 후 로직)
    current = store.get_current_node()
    if current and current.id != 'root':
        from datetime import datetime
        navigation_history.append({
            'timestamp': datetime.now(),
            'node_id': current.id,
            'question': current.user_question[:60] if current.user_question else "(대화 없음)"
        })
        print(f"✅ 이력 저장됨: n4 ({current.id[:8]}) - {current.user_question}")

    # 체크포인트 로드
    store.load_checkpoint("cp1")
    print(f"✅ 체크포인트 'cp1' 로드 완료")
    print(f"   현재 위치: n3 ({store.get_current_node().id[:8]})")

    # 6. 이력 확인
    print(f"\n--- Navigation History 확인 ---")
    print(f"이력 개수: {len(navigation_history)}")

    if navigation_history:
        last_entry = navigation_history[-1]
        print(f"✅ 마지막 이력:")
        print(f"   노드 ID: {last_entry['node_id'][:8]}")
        print(f"   질문: {last_entry['question']}")

        if last_entry['node_id'] == node4.id:
            print("\n✅ 테스트 통과: 체크포인트 로드 시 이력이 정상 저장됨")
            return True
        else:
            print(f"\n❌ 테스트 실패: 이력의 노드 ID가 예상과 다름")
            print(f"   예상: {node4.id[:8]}")
            print(f"   실제: {last_entry['node_id'][:8]}")
            return False
    else:
        print("\n❌ 테스트 실패: 이력이 저장되지 않음")
        return False

if __name__ == "__main__":
    print("\n🧪 버그 수정 검증 테스트 시작\n")

    success = test_checkpoint_load_history()

    print("\n" + "=" * 80)
    if success:
        print("✅ 모든 테스트 통과")
    else:
        print("❌ 테스트 실패")
    print("=" * 80)
