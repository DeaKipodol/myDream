"""
수동 통합 테스트: 시나리오 1-3 검증.

이 스크립트는 PM 개발지시서 v2.0의 시나리오 1-3을 프로그래매틱하게 검증합니다.
"""

from cli.visualizer import visualize_path, visualize_tree
from core.conversation import ConversationManager
from core.store import Store


def print_section(title):
    """섹션 헤더 출력."""
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def scenario_1_basic_conversation():
    """
    시나리오 1: 기본 대화 흐름

    검증 항목:
    - 1턴 = 1노드 자동 생성
    - 경로 추적
    - 트리 시각화
    """
    print_section("시나리오 1: 기본 대화 흐름")

    store = Store()
    conv = ConversationManager(store)

    # Step 1: 첫 번째 질문
    print('\n[사용자] ask "취업 준비가 너무 막막해요"')
    node1 = conv.turn(
        "취업 준비가 너무 막막해요",
        "[더미 응답] '취업 준비가 너무 막막해요'에 대한 AI 답변입니다.",
    )
    print(f"✅ 노드 생성됨: {node1.id[:8]}...")

    # Step 2: 두 번째 질문
    print('\n[사용자] ask "이력서는 어떻게 써야 하나요?"')
    node2 = conv.turn(
        "이력서는 어떻게 써야 하나요?",
        "[더미 응답] '이력서는 어떻게 써야 하나요?'에 대한 AI 답변입니다.",
    )
    print(f"✅ 노드 생성됨: {node2.id[:8]}...")

    # Step 3: 트리 시각화
    print("\n[사용자] tree")
    output = visualize_tree(store, highlight_path=True, show_checkpoints=False)
    print(output)

    # Step 4: 경로 확인
    print("\n[사용자] path")
    output = visualize_path(store, show_content=False)
    print(output)

    # 검증
    assert len(conv.get_conversation_history()) == 2, "대화 히스토리는 2턴이어야 함"
    assert store.get_current_node().id == node2.id, "현재 노드는 두 번째 노드여야 함"
    print("\n✅ 시나리오 1 통과!")

    return store, conv, node1, node2


def scenario_2_branching(store, conv, node1, node2):
    """
    시나리오 2: 분기 생성

    검증 항목:
    - 체크포인트 저장
    - 노드 전환 (이전 노드로 이동)
    - 분기 생성 (같은 부모에서 다른 질문)
    """
    print_section("시나리오 2: 분기 생성")

    # Step 1: 체크포인트 저장
    print('\n[사용자] save "이력서질문"')
    success = store.save_checkpoint("이력서질문")
    assert success, "체크포인트 저장 실패"
    print("✅ '이력서질문' 이름표를 현재 노드에 붙였습니다.")

    # Step 2: 이전 노드로 이동
    print(f"\n[사용자] goto {node1.id[:8]}...")
    success = store.switch_to_node(node1.id)
    assert success, "노드 전환 실패"
    print(f"✅ {node1.id[:8]}... 위치로 이동했습니다.")

    # Step 3: 새로운 질문 (분기 생성)
    print('\n[사용자] ask "면접은 어떻게 준비하나요?"')
    node3 = conv.turn(
        "면접은 어떻게 준비하나요?",
        "[더미 응답] '면접은 어떻게 준비하나요?'에 대한 AI 답변입니다.",
    )
    print(f"✅ 노드 생성됨: {node3.id[:8]}...")

    # Step 4: 트리 시각화 (분기 확인)
    print("\n[사용자] tree")
    output = visualize_tree(store, highlight_path=True, show_checkpoints=True)
    print(output)
    print("\n# 분기 생성됨! node1에서 두 개의 자식 노드")

    # 검증
    children = store.tree.get_children(node1.id)
    assert len(children) == 2, f"node1의 자식은 2개여야 함 (실제: {len(children)})"
    assert node2 in children, "node2는 node1의 자식이어야 함"
    assert node3 in children, "node3는 node1의 자식이어야 함"
    print("\n✅ 시나리오 2 통과!")

    return node3


def scenario_3_checkpoint_navigation(store, conv, node2):
    """
    시나리오 3: 이름표로 이동

    검증 항목:
    - 체크포인트 목록 조회
    - 체크포인트로 이동
    - 분기된 경로에서 대화 이어가기
    """
    print_section("시나리오 3: 이름표로 이동")

    # Step 1: 체크포인트 목록 확인
    print("\n[사용자] checkpoints")
    checkpoints = store.list_checkpoints()
    print("이름표 목록:")
    for name, node_id in checkpoints.items():
        print(f'  - "{name}" → {node_id[:8]}...')

    # Step 2: 체크포인트로 이동
    print('\n[사용자] goto "이력서질문"')
    success = store.load_checkpoint("이력서질문")
    assert success, "체크포인트 로드 실패"
    print("✅ '이력서질문' 위치로 이동했습니다.")

    # Step 3: 경로 확인
    print("\n[사용자] path")
    output = visualize_path(store, show_content=False)
    print(output)

    # 검증: 현재 노드가 node2여야 함
    assert (
        store.get_current_node().id == node2.id
    ), "현재 노드는 이력서질문 체크포인트여야 함"

    # Step 4: 대화 이어가기
    print('\n[사용자] ask "자기소개서도 알려주세요"')
    node4 = conv.turn(
        "자기소개서도 알려주세요",
        "[더미 응답] '자기소개서도 알려주세요'에 대한 AI 답변입니다.",
    )
    print(f"✅ 노드 생성됨: {node4.id[:8]}...")

    # Step 5: 최종 트리 시각화
    print("\n[사용자] tree")
    output = visualize_tree(store, highlight_path=True, show_checkpoints=True)
    print(output)

    # 검증
    children_of_node2 = store.tree.get_children(node2.id)
    assert len(children_of_node2) == 1, "node2의 자식은 1개여야 함"
    assert children_of_node2[0].id == node4.id, "node4는 node2의 자식이어야 함"
    print("\n✅ 시나리오 3 통과!")

    return node4


def main():
    """메인 테스트 실행."""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 10 + "Phase CLI-1 통합 시나리오 테스트" + " " * 15 + "║")
    print("╚" + "=" * 58 + "╝")

    try:
        # 시나리오 1: 기본 대화 흐름
        store, conv, node1, node2 = scenario_1_basic_conversation()

        # 시나리오 2: 분기 생성
        node3 = scenario_2_branching(store, conv, node1, node2)

        # 시나리오 3: 이름표로 이동
        node4 = scenario_3_checkpoint_navigation(store, conv, node2)

        # 최종 통계
        print_section("최종 통계")
        stats = conv.get_stats()
        print(f"  전체 노드 수: {stats['total_nodes']}")
        print(f"  전체 대화 턴: {stats['total_turns']}")
        print(f"  현재 경로 깊이: {stats['current_depth']}")
        print(f"  체크포인트 수: {len(store.list_checkpoints())}")

        print("\n" + "=" * 60)
        print("✨ 모든 시나리오 테스트 통과!")
        print("=" * 60)
        print("\n✅ Phase CLI-1 핵심 기능 검증 완료")
        print("   - 1턴 = 1노드 자동 생성 ✅")
        print("   - 체크포인트(이름표) 시스템 ✅")
        print("   - 분기 생성 및 탐색 ✅")
        print("   - 노드 전환 (경로 전환) ✅")
        print("   - 트리 시각화 ✅")

        return True

    except AssertionError as e:
        print(f"\n❌ 테스트 실패: {e}")
        return False
    except Exception as e:
        print(f"\n❌ 예기치 않은 오류: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
