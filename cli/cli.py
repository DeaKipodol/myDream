"""
CLI REPL 메인 루프.

이 모듈은 대화 트리 관리를 위한 대화형 커맨드 라인 인터페이스를 제공합니다.
"""
import readline

# (선택 사항) 위/아래 화살표로 이전 명령어 기록(History) 보기 기능 활성화
import atexit
import os
from datetime import datetime

histfile = os.path.join(os.path.expanduser("~"), ".cli_history")
try:
    readline.read_history_file(histfile)
except FileNotFoundError:
    pass

atexit.register(readline.write_history_file, histfile)
import sys
from typing import Optional
from core.store import Store
from core.conversation import ConversationManager
from core.checkpoint import (
    validate_checkpoint_name,
    suggest_checkpoint_name,
    list_checkpoints_detailed,
    get_checkpoint_stats
)
from core.path_utils import format_path, get_path_summary
from cli.visualizer import (
    visualize_tree,
    visualize_path,
    visualize_node_detail,
    visualize_siblings,
    visualize_stats
)

# AI 클라이언트는 선택적으로 import (API 키 없어도 CLI는 작동)
try:
    from core.ai_client import AIClient
    AI_AVAILABLE = True
except (ImportError, ValueError) as e:
    AI_AVAILABLE = False
    AI_ERROR = str(e)


class CLI:
    """대화형 CLI REPL 클래스."""

    def __init__(self):
        """CLI 초기화."""
        self.store = Store()
        self.conversation = ConversationManager(self.store)
        self.running = True

        # 노드 번호 매핑 (n1, n2 등을 위한 인덱스)
        self.node_index = {}  # {1: node_id, 2: node_id, ...}
        self.node_reverse_index = {}  # {node_id: 1, node_id2: 2, ...}

        # Navigation history (이동 이력 추적)
        self.navigation_history = []  # [{timestamp, node_id, question}, ...]

        # AI 클라이언트 초기화 (선택적)
        if AI_AVAILABLE:
            try:
                self.ai_client = AIClient()
                self.ai_enabled = True
            except Exception as e:
                self.ai_enabled = False
                self.ai_error = str(e)
        else:
            self.ai_enabled = False
            self.ai_error = AI_ERROR if not AI_AVAILABLE else "AI 클라이언트를 사용할 수 없습니다."

    def start(self):
        """REPL 메인 루프 시작."""
        self.print_welcome()

        while self.running:
            try:
                user_input = input("\n> ").strip()

                if not user_input:
                    continue

                self.process_command(user_input)

            except KeyboardInterrupt:
                print("\n\n종료하려면 /exit를 입력하세요.")
                continue
            except EOFError:
                print("\n프로그램을 종료합니다.")
                break

        print("\n안녕히 가세요!")

    def print_welcome(self):
        """환영 메시지 출력."""
        print("=" * 60)
        print("대화 트리 관리 CLI v1.0")
        print("=" * 60)
        print("\n💡 팁: 명령어는 /없이도 입력 가능합니다 (예: help, ask 질문)")
        print("💡 팁: 노드는 n1, n2 등 번호로 참조할 수 있습니다 (예: switch n1)")
        print("\n도움말: help 또는 /help")
        print("종료: exit 또는 /exit")

    def process_command(self, user_input: str):
        """
        사용자 입력을 처리합니다.

        Args:
            user_input: 사용자가 입력한 명령어
        """
        # / 없이도 명령어 사용 가능하도록 개선
        if not user_input.startswith('/'):
            user_input = '/' + user_input

        parts = user_input.split(maxsplit=1)
        command = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""

        # 명령어 라우팅
        command_map = {
            '/help': self.cmd_help,
            '/exit': self.cmd_exit,
            '/quit': self.cmd_exit,
            '/ask': self.cmd_ask,
            '/turn': self.cmd_turn,
            '/checkpoint': self.cmd_checkpoint,
            '/cp': self.cmd_checkpoint,  # 별칭
            '/tree': self.cmd_tree,
            '/path': self.cmd_path,
            '/switch': self.cmd_switch,
            '/back': self.cmd_back,
            '/history': self.cmd_history,
            '/visits': self.cmd_visits,
            '/stats': self.cmd_stats,
            '/node': self.cmd_node,
            '/siblings': self.cmd_siblings,
            '/nodes': self.cmd_nodes,
            '/list': self.cmd_nodes,  # 별칭
        }

        handler = command_map.get(command)
        if handler:
            handler(args)
        else:
            print(f"❌ 알 수 없는 명령어: {command}")
            print("   help를 입력하여 사용 가능한 명령어를 확인하세요.")

    # ==================== 노드 인덱싱 헬퍼 ====================

    def _build_node_index(self):
        """
        모든 노드에 번호를 매깁니다 (n1, n2, ...).

        DFS 순서로 노드를 순회하여 일관된 번호를 부여합니다.
        """
        all_nodes = list(self.store.tree.nodes.values())

        # root 제외하고 ID로 정렬하여 일관성 유지
        non_root_nodes = [n for n in all_nodes if n.id != 'root']
        non_root_nodes.sort(key=lambda n: n.id)

        # 매핑 재구축
        self.node_index = {}
        self.node_reverse_index = {}

        for idx, node in enumerate(non_root_nodes, start=1):
            self.node_index[idx] = node.id
            self.node_reverse_index[node.id] = idx

    def _resolve_node_reference(self, ref: str) -> Optional[str]:
        """
        노드 참조를 실제 노드 ID로 변환합니다.

        지원 형식:
        - n1, n2, n123 등 (노드 번호)
        - cb5975d0 (부분 ID)
        - 전체 UUID

        Args:
            ref: 노드 참조 문자열

        Returns:
            실제 노드 ID (찾지 못하면 None)
        """
        ref = ref.strip().lower()

        # 노드 번호 형식 (n1, n2 등)
        if ref.startswith('n'):
            try:
                num = int(ref[1:])
                # 인덱스 갱신
                self._build_node_index()
                return self.node_index.get(num)
            except (ValueError, KeyError):
                return None

        # 정확한 ID 매칭
        all_nodes = list(self.store.tree.nodes.values())
        node_ids = [n.id for n in all_nodes]

        if ref in node_ids:
            return ref

        # 부분 매칭
        matching = [nid for nid in node_ids if nid.startswith(ref)]
        if len(matching) == 1:
            return matching[0]

        # 매칭 실패 또는 여러 개
        return None

    def _auto_checkpoint_on_branch(self) -> bool:
        """
        분기 발생 시 자동 체크포인트 생성.

        현재 노드가 이미 1개의 자식을 가지고 있다면,
        새 노드 추가 시 2개가 되어 분기점이 됩니다.
        이 경우 자동으로 체크포인트를 생성합니다.

        Returns:
            체크포인트가 생성되었으면 True, 아니면 False
        """
        current = self.store.get_current_node()
        if not current:
            return False

        # 현재 노드의 자식 개수 확인
        children = self.store.tree.get_children(current.id)

        # 자식이 1개 이상이면 새 노드 추가 시 분기점이 됨
        if len(children) >= 1:
            # 자동 체크포인트 이름 생성
            auto_name = f"@branch_{current.id[:8]}"

            # 중복 방지: 이미 존재하지 않으면 저장
            existing_checkpoints = self.store.list_checkpoints()
            if auto_name not in existing_checkpoints:
                self.store.save_checkpoint(auto_name)
                print(f"🔀 분기 발생: 자동 체크포인트 '{auto_name}' 생성됨")
                return True

        return False

    def _format_elapsed_time(self, elapsed) -> str:
        """
        경과 시간을 한국어로 포맷팅.

        Args:
            elapsed: timedelta 객체

        Returns:
            포맷팅된 시간 문자열
        """
        seconds = int(elapsed.total_seconds())
        if seconds < 60:
            return "방금 전"
        elif seconds < 3600:
            return f"{seconds // 60}분 전"
        elif seconds < 86400:
            return f"{seconds // 3600}시간 전"
        else:
            return f"{seconds // 86400}일 전"

    # ==================== 명령어 핸들러 ====================

    def cmd_help(self, args: str):
        """도움말 출력."""
        print("\n📖 사용 가능한 명령어 (/ 생략 가능):")
        print("\n[대화 관리]")
        ai_status = "✅ 사용 가능" if self.ai_enabled else "❌ 비활성화"
        print(f"  ask <질문>              - AI에게 질문 ({ai_status})")
        print("  turn <질문> | <답변>    - 수동으로 대화 턴 추가")
        print("  history                 - 현재 경로의 대화 히스토리 보기")
        print("  switch <참조>           - 다른 노드로 전환 (분기)")
        print("                            <참조>: n1, n2 또는 노드ID")
        print("  back                    - 이전 위치로 복귀")
        print("  visits                  - 최근 방문 이력 보기")

        print("\n[체크포인트]")
        print("  checkpoint save <이름>  - 현재 위치에 체크포인트 저장")
        print("  cp save <이름>          - (별칭)")
        print("  checkpoint load <이름>  - 체크포인트로 이동")
        print("  checkpoint list         - 저장된 체크포인트 목록")
        print("  checkpoint delete <이름> - 체크포인트 삭제")
        print("  💡 분기 발생 시 자동으로 @branch_* 체크포인트 생성됨")

        print("\n[트리 탐색]")
        print("  tree [옵션]             - 대화 트리 시각화")
        print("                            옵션: nopath, nocp, depth=N")
        print("  path [content]          - 현재 경로 정보 (content: 내용 포함)")
        print("  nodes, list             - 모든 노드 목록 (번호 포함)")
        print("  node [참조]             - 노드 상세 정보 (기본: 현재 노드)")
        print("  siblings [참조]         - 형제 노드 보기 (기본: 현재 노드)")
        print("  stats                   - 트리 및 체크포인트 통계")

        print("\n[기타]")
        print("  help                    - 이 도움말 보기")
        print("  exit, quit              - 프로그램 종료")
        print("\n💡 노드 참조: n1, n2 등 번호 또는 노드ID 사용 가능")

    def cmd_exit(self, args: str):
        """프로그램 종료."""
        self.running = False

    def cmd_ask(self, args: str):
        """
        AI에게 질문하고 답변을 받아 노드 생성.

        형식: /ask <질문>
        """
        if not self.ai_enabled:
            print(f"❌ AI 기능을 사용할 수 없습니다.")
            print(f"   사유: {self.ai_error}")
            print(f"   .env 파일에 OPENAI_API_KEY를 설정하고 재시작하세요.")
            print(f"   또는 turn 명령으로 수동으로 대화를 입력할 수 있습니다.")
            return

        if not args:
            print("❌ 사용법: ask <질문>")
            print("   예시: ask Python이 뭐야?")
            return

        question = args.strip()

        # 🔍 분기 감지 및 자동 체크포인트 생성
        self._auto_checkpoint_on_branch()

        # AI에게 질문 (현재 대화 맥락 포함)
        print(f"\n💭 AI에게 질문 중...")

        try:
            # 현재 대화 맥락 가져오기
            context = self.conversation.get_full_context()

            if context and context != "[대화 없음]":
                # 맥락이 있으면 포함해서 질문
                answer = self.ai_client.ask_with_context(
                    question,
                    f"이전 대화 맥락:\n{context}",
                    system_prompt="당신은 친절한 AI 상담사입니다. 이전 대화 맥락을 고려하여 답변하세요."
                )
            else:
                # 맥락이 없으면 단순 질문
                answer = self.ai_client.ask(question)

            # 노드 생성
            node = self.conversation.turn(question, answer)

            print(f"\n✅ AI 답변:")
            print(f"{answer}")
            print(f"\n✅ 노드 생성됨: {node.id[:8]}...")

        except Exception as e:
            print(f"\n❌ AI 응답 생성 실패: {str(e)}")
            print("   turn 명령으로 수동 입력을 시도하세요.")

    def cmd_turn(self, args: str):
        """
        새로운 대화 턴 추가.

        형식: /turn <질문> | <답변>
        """
        if not args:
            print("❌ 사용법: turn <질문> | <답변>")
            print("   예시: turn Python이 뭐야? | Python은 프로그래밍 언어입니다.")
            return

        # '|'로 질문과 답변 분리
        if '|' not in args:
            print("❌ 질문과 답변을 '|'로 구분해야 합니다.")
            print("   예시: turn Python이 뭐야? | Python은 프로그래밍 언어입니다.")
            return

        parts = args.split('|', 1)
        question = parts[0].strip()
        answer = parts[1].strip()

        if not question or not answer:
            print("❌ 질문과 답변 모두 입력해야 합니다.")
            return

        # 🔍 분기 감지 및 자동 체크포인트 생성
        self._auto_checkpoint_on_branch()

        # 노드 생성
        node = self.conversation.turn(question, answer)
        print(f"✅ 대화 턴이 추가되었습니다. (노드 ID: {node.id})")
        print(f"   질문: {question[:50]}{'...' if len(question) > 50 else ''}")
        print(f"   답변: {answer[:50]}{'...' if len(answer) > 50 else ''}")

    def cmd_checkpoint(self, args: str):
        """
        체크포인트 관리.

        형식:
          /checkpoint save <이름>
          /checkpoint load <이름>
          /checkpoint list
          /checkpoint delete <이름>
        """
        if not args:
            print("❌ 사용법:")
            print("   /checkpoint save <이름>")
            print("   /checkpoint load <이름>")
            print("   /checkpoint list")
            print("   /checkpoint delete <이름>")
            return

        parts = args.split(maxsplit=1)
        action = parts[0].lower()
        name = parts[1] if len(parts) > 1 else ""

        if action == 'save':
            self._checkpoint_save(name)
        elif action == 'load':
            self._checkpoint_load(name)
        elif action == 'list':
            self._checkpoint_list()
        elif action == 'delete' or action == 'del':
            self._checkpoint_delete(name)
        else:
            print(f"❌ 알 수 없는 체크포인트 명령: {action}")
            print("   save, load, list, delete 중 하나를 사용하세요.")

    def _checkpoint_save(self, name: str):
        """체크포인트 저장."""
        if not name:
            # 이름이 없으면 자동 제안
            current_node = self.store.get_current_node()
            if current_node:
                existing = list(self.store.list_checkpoints().keys())
                name = suggest_checkpoint_name(current_node, existing)
                print(f"💡 제안된 이름: {name}")
                confirm = input(f"   이 이름으로 저장하시겠습니까? (y/n): ").strip().lower()
                if confirm != 'y':
                    return
            else:
                print("❌ 체크포인트 이름을 입력하세요.")
                return

        # 이름 검증
        valid, error = validate_checkpoint_name(name)
        if not valid:
            print(f"❌ {error}")
            return

        # 저장
        if self.store.save_checkpoint(name):
            print(f"✅ 체크포인트 '{name}'이 저장되었습니다.")
        else:
            print(f"❌ 체크포인트 '{name}'이 이미 존재합니다.")

    def _checkpoint_load(self, name: str):
        """체크포인트 로드."""
        if not name:
            print("❌ 체크포인트 이름을 입력하세요.")
            return

        if self.store.load_checkpoint(name):
            print(f"✅ 체크포인트 '{name}'으로 이동했습니다.")
            self._show_current_position()
        else:
            print(f"❌ 체크포인트 '{name}'을 찾을 수 없습니다.")

    def _checkpoint_list(self):
        """체크포인트 목록 출력 (3섹션: 명시적/분기/방문이력)."""
        checkpoints = list_checkpoints_detailed(self.store)

        # 체크포인트를 타입별로 분류
        manual_cps = [cp for cp in checkpoints if not cp['name'].startswith('@branch_')]
        branch_cps = [cp for cp in checkpoints if cp['name'].startswith('@branch_')]

        has_any = manual_cps or branch_cps or self.navigation_history

        if not has_any:
            print("\n📋 체크포인트 & 이력이 없습니다.")
            return

        print("\n📋 체크포인트 & 이력:")
        print("=" * 80)

        # 섹션 1: 명시적 체크포인트 (사용자가 직접 생성)
        if manual_cps:
            print(f"\n[명시적 체크포인트] ({len(manual_cps)}개)")
            for cp in manual_cps:
                print(f"  • {cp['name']}")
                print(f"    질문: {cp['user_question'][:60]}")
                print(f"    깊이: {cp['depth']} | 자식: {cp['children_count']}개")
                print()

        # 섹션 2: 분기 노드 (자동 체크포인트)
        if branch_cps:
            print(f"\n[분기 노드] ({len(branch_cps)}개) 🔀")
            for cp in branch_cps:
                # 노드 번호 찾기
                self._build_node_index()
                node_id = self.store.list_checkpoints().get(cp['name'])
                num = self.node_reverse_index.get(node_id, '?') if node_id else '?'

                print(f"  • {cp['name']} → n{num}")
                print(f"    질문: {cp['user_question'][:60]}")
                print(f"    자식: {cp['children_count']}개 (분기점)")
                print()

        # 섹션 3: 최근 방문 이력
        if self.navigation_history:
            print(f"\n[최근 방문] ({len(self.navigation_history)}개) 📜")
            # 최근 5개만 표시
            for entry in reversed(self.navigation_history[-5:]):
                elapsed = datetime.now() - entry['timestamp']
                time_str = self._format_elapsed_time(elapsed)

                # 노드 번호 찾기
                self._build_node_index()
                num = self.node_reverse_index.get(entry['node_id'], '?')

                print(f"  • n{num} - {entry['question']} ({time_str})")

            if len(self.navigation_history) > 5:
                print(f"  ... 외 {len(self.navigation_history) - 5}개")
                print("  💡 전체 보기: visits")
            print()

        print("=" * 80)

    def _checkpoint_delete(self, name: str):
        """체크포인트 삭제."""
        if not name:
            print("❌ 삭제할 체크포인트 이름을 입력하세요.")
            return

        if self.store.delete_checkpoint(name):
            print(f"✅ 체크포인트 '{name}'이 삭제되었습니다.")
        else:
            print(f"❌ 체크포인트 '{name}'을 찾을 수 없습니다.")

    def cmd_tree(self, args: str):
        """트리 시각화."""
        # 옵션 파싱
        show_checkpoints = True
        highlight_path = True
        max_depth = None

        if args:
            parts = args.lower().split()
            if 'nocheckpoint' in parts or 'nocp' in parts:
                show_checkpoints = False
            if 'nopath' in parts:
                highlight_path = False
            # 깊이 제한 찾기
            for part in parts:
                if part.startswith('depth='):
                    try:
                        max_depth = int(part.split('=')[1])
                    except (ValueError, IndexError):
                        print("❌ depth 옵션 형식이 잘못되었습니다 (예: depth=3)")
                        return

        output = visualize_tree(
            self.store,
            highlight_path=highlight_path,
            show_checkpoints=show_checkpoints,
            max_depth=max_depth
        )
        print("\n" + output)

    def cmd_path(self, args: str):
        """현재 경로 정보 출력."""
        # 옵션 파싱: content 옵션으로 노드 내용까지 표시
        show_content = False
        if args and 'content' in args.lower():
            show_content = True

        output = visualize_path(self.store, show_content=show_content)
        print("\n" + output)

    def cmd_switch(self, args: str):
        """노드 전환."""
        if not args:
            print("❌ 사용법: switch <참조>")
            print("   <참조>: n1, n2 또는 노드ID")
            print("   예시: switch n1")
            print("   예시: switch cb5975d0")
            return

        ref = args.strip()

        # 📜 이동 이력 저장 (전환 전 현재 위치)
        current = self.store.get_current_node()
        if current and current.id != 'root':
            self.navigation_history.append({
                'timestamp': datetime.now(),
                'node_id': current.id,
                'question': current.user_question[:60] if current.user_question else "(대화 없음)"
            })

            # 최근 20개만 유지
            if len(self.navigation_history) > 20:
                self.navigation_history.pop(0)

        # 노드 참조를 실제 ID로 변환
        node_id = self._resolve_node_reference(ref)

        if node_id is None:
            # 부분 매칭으로 여러 개 찾았을 수 있으므로 다시 확인
            all_nodes = list(self.store.tree.nodes.values())
            matching_nodes = [n for n in all_nodes if n.id.startswith(ref.lower())]

            if len(matching_nodes) > 1:
                print(f"❌ '{ref}'로 시작하는 노드가 {len(matching_nodes)}개 있습니다:")
                # 인덱스 갱신
                self._build_node_index()
                for node in matching_nodes[:5]:  # 최대 5개만 표시
                    preview = node.user_question[:40] if node.user_question else "(루트)"
                    num = self.node_reverse_index.get(node.id, '?')
                    print(f"   • n{num} - {node.id[:12]}... - {preview}")
                if len(matching_nodes) > 5:
                    print(f"   ... 외 {len(matching_nodes) - 5}개")
                print("\n   더 긴 ID 또는 노드 번호(n1, n2)를 사용하세요.")
            else:
                print(f"❌ '{ref}'에 해당하는 노드를 찾을 수 없습니다.")
                print("   nodes 명령으로 사용 가능한 노드를 확인하세요.")
            return

        # 전환 시도
        if self.store.switch_to_node(node_id):
            # 노드 번호 표시를 위해 인덱스 갱신
            self._build_node_index()
            num = self.node_reverse_index.get(node_id, '?')
            print(f"✅ 노드 n{num} ({node_id[:8]}...)로 전환했습니다.")
            self._show_current_position()
        else:
            print(f"❌ 노드 전환에 실패했습니다.")

    def cmd_history(self, args: str):
        """현재 경로의 대화 히스토리 출력."""
        history = self.conversation.get_conversation_history()

        if not history:
            print("\n📜 아직 대화 내역이 없습니다.")
            print("   ask 또는 turn 명령으로 첫 대화를 시작하세요!")
            return

        print(f"\n📜 대화 히스토리 ({len(history)}턴):")
        print("=" * 80)

        for i, (question, answer) in enumerate(history, 1):
            print(f"\n[턴 {i}]")
            print(f"Q: {question}")
            print(f"A: {answer}")
            print("-" * 80)

    def cmd_back(self, args: str):
        """이전 위치로 복귀."""
        if not self.navigation_history:
            print("❌ 이동 이력이 없습니다.")
            print("   switch 명령으로 노드를 전환한 후에 사용할 수 있습니다.")
            return

        # 가장 최근 위치 가져오기
        last = self.navigation_history.pop()

        # 해당 노드로 전환
        if self.store.switch_to_node(last['node_id']):
            print(f"✅ 이전 위치로 돌아갔습니다.")
            print(f"   질문: {last['question']}")
            self._show_current_position()
        else:
            print(f"❌ 이전 위치로 복귀할 수 없습니다.")
            # 실패 시 히스토리에 다시 추가
            self.navigation_history.append(last)

    def cmd_visits(self, args: str):
        """최근 방문 이력 출력."""
        if not self.navigation_history:
            print("\n📜 이동 이력이 없습니다.")
            print("   switch 명령으로 노드를 전환하면 이력이 저장됩니다.")
            return

        print(f"\n📜 최근 방문 이력 ({len(self.navigation_history)}개):")
        print("=" * 80)

        # 최근 것부터 표시 (역순)
        for i, entry in enumerate(reversed(self.navigation_history[-10:]), 1):
            elapsed = datetime.now() - entry['timestamp']
            time_str = self._format_elapsed_time(elapsed)

            # 노드 번호 찾기
            self._build_node_index()
            num = self.node_reverse_index.get(entry['node_id'], '?')

            print(f"  {i}. n{num} - {entry['question']} ({time_str})")

        print("=" * 80)
        print("💡 사용: back (최근 위치로 복귀)")

    def cmd_stats(self, args: str):
        """통계 정보 출력."""
        output = visualize_stats(self.store)
        print("\n" + output)

    def cmd_node(self, args: str):
        """노드 상세 정보 출력."""
        if not args:
            # 인자가 없으면 현재 노드
            current = self.store.get_current_node()
            if current:
                node_id = current.id
            else:
                print("❌ 사용법: node <참조>")
                print("   <참조>: n1, n2 또는 노드ID")
                return
        else:
            ref = args.strip()
            node_id = self._resolve_node_reference(ref)
            if node_id is None:
                print(f"❌ '{ref}'에 해당하는 노드를 찾을 수 없습니다.")
                print("   nodes 명령으로 사용 가능한 노드를 확인하세요.")
                return

        output = visualize_node_detail(self.store, node_id)
        print("\n" + output)

    def cmd_siblings(self, args: str):
        """형제 노드 출력."""
        if not args:
            # 인자가 없으면 현재 노드
            current = self.store.get_current_node()
            if current:
                node_id = current.id
            else:
                print("❌ 사용법: siblings <참조>")
                print("   <참조>: n1, n2 또는 노드ID")
                return
        else:
            ref = args.strip()
            node_id = self._resolve_node_reference(ref)
            if node_id is None:
                print(f"❌ '{ref}'에 해당하는 노드를 찾을 수 없습니다.")
                print("   nodes 명령으로 사용 가능한 노드를 확인하세요.")
                return

        output = visualize_siblings(self.store, node_id)
        print("\n" + output)

    def cmd_nodes(self, args: str):
        """모든 노드 목록을 번호와 함께 출력."""
        # 인덱스 갱신
        self._build_node_index()

        if not self.node_index:
            print("\n📋 아직 노드가 없습니다.")
            print("   ask 또는 turn 명령으로 첫 대화를 시작하세요!")
            return

        print(f"\n📋 노드 목록 ({len(self.node_index)}개):")
        print("=" * 80)

        # 현재 노드 확인
        current_node = self.store.get_current_node()
        current_id = current_node.id if current_node else None

        # 번호 순으로 출력
        for num in sorted(self.node_index.keys()):
            node_id = self.node_index[num]
            node = self.store.tree.get_node(node_id)

            if node:
                # 현재 위치 표시
                marker = "👉 " if node_id == current_id else "   "

                # 질문 미리보기
                preview = node.user_question[:60] if node.user_question else "(대화 없음)"

                # 자식 노드 수
                children = self.store.tree.get_children(node_id)
                children_info = f"자식 {len(children)}개" if children else "말단"

                print(f"{marker}n{num:3d} - {node_id[:8]}... - {preview}")
                print(f"       {children_info}")
                print()

        print("=" * 80)
        print("💡 사용: switch n1, node n2, siblings n3 등")

    def _show_current_position(self):
        """현재 위치 정보 출력."""
        current_node = self.store.get_current_node()
        if current_node and current_node.id != 'root':
            # 노드 번호 가져오기
            self._build_node_index()
            num = self.node_reverse_index.get(current_node.id, '?')

            print(f"\n현재 위치:")
            print(f"  노드: n{num} ({current_node.id[:8]}...)")
            print(f"  질문: {current_node.user_question[:60]}")


def main():
    """CLI 메인 함수."""
    cli = CLI()
    cli.start()


if __name__ == "__main__":
    main()
