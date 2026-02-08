/**
 * ========================================
 * 통합 WorkspaceStore
 *
 * 목업 데이터와 사용자 생성 작업공간을
 * 동일하게 관리하는 단일 데이터 레이어
 * ========================================
 */

import { EventBus } from './event-bus.js';
import { EVENTS } from './events.js';

// 시드 데이터 (기존 data.js에서 가져옴)
const SEED_WORKSPACES = {
  marketing: {
    id: 'marketing',
    name: '마케팅 전략 기획',
    icon: '🎯',
    currentNode: 'newsletter',
    tree: {
      id: 'root',
      text: '마케팅 전략을 짜고 싶어',
      conversation: {
        question: '우리 제품의 마케팅 전략을 어떻게 짜야 할까요?',
        answer: '효과적인 마케팅 전략을 위해서는 먼저 타겟 고객 분석, 채널 선정, 예산 계획이 필요합니다.'
      },
      children: [
        {
          id: 'target',
          text: '타겟 고객 분석',
          conversation: {
            question: '타겟 고객을 어떻게 분석하면 좋을까요?',
            answer: '연령대별로 세분화하여 분석하는 것을 추천합니다.'
          },
          children: [
            { id: 'target-20s', text: '20대 초반 분석', badge: 'complete', conversation: { question: '20대 초반 타겟은?', answer: '소셜 미디어 활용도가 높습니다.' } },
            { id: 'target-30s', text: '30대 직장인 분석', badge: 'complete', conversation: { question: '30대 직장인은?', answer: '구매력이 높습니다.' } }
          ]
        },
        {
          id: 'channel',
          text: '채널 전략',
          badge: '진행중',
          active: true,
          conversation: {
            question: '어떤 채널이 효과적일까?',
            answer: '인스타그램, 링크드인, 뉴스레터를 추천합니다.'
          },
          children: [
            { id: 'instagram', text: '인스타그램 전략', conversation: { question: '인스타그램 활용법?', answer: '숏폼 콘텐츠와 릴스를 활용하세요.' } },
            { id: 'linkedin', text: '링크드인 전략', conversation: { question: '링크드인 효과?', answer: 'B2B에 최적입니다.' } },
            { id: 'newsletter', text: '뉴스레터 전략', active: true, conversation: { question: '뉴스레터로 리드 육성?', answer: '주간 인사이트로 관계를 강화하세요.' } }
          ]
        },
        {
          id: 'budget',
          text: '예산 계획',
          conversation: {
            question: '예산 배분은?',
            answer: '인스타 40%, 링크드인 30%, 뉴스레터 30%'
          }
        }
      ]
    },
    messages: [
      { type: 'user', content: '어떤 채널이 우리 제품에 가장 효과적일까?' },
      {
        type: 'ai',
        content: `<p>타겟 분석 결과를 바탕으로 3가지 채널을 추천드립니다:</p>
        <div class="ai-list">
          <div class="ai-list-item"><span class="list-icon">📱</span><span><strong>인스타그램</strong> - 20대 비주얼 콘텐츠</span></div>
          <div class="ai-list-item"><span class="list-icon">💼</span><span><strong>링크드인</strong> - B2B 타겟</span></div>
          <div class="ai-list-item"><span class="list-icon">📧</span><span><strong>뉴스레터</strong> - 리드 너처링</span></div>
        </div>`,
        branches: [
          { id: 'instagram', text: '🌿 인스타그램 전략 탐색' },
          { id: 'linkedin', text: '🌿 링크드인 전략 탐색' },
          { id: 'newsletter', text: '🌿 뉴스레터 전략 탐색', active: true }
        ]
      }
    ],
    perspectives: [
      { id: 'marketer', emoji: '🎯', name: '마케터', text: '"ROI 중심으로 인스타그램을 추천합니다."', color: '#ef4444', active: true },
      { id: 'analyst', emoji: '📊', name: '데이터 분석가', text: '"숏폼 콘텐츠 성과가 3배 높습니다."', color: '#3b82f6' },
      { id: 'devil', emoji: '😈', name: '악마의 변호인', text: '"인스타그램 광고 비용이 급증 중입니다."', color: '#10b981' }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  report: {
    id: 'report',
    name: '시장 보고서 분석',
    icon: '📊',
    currentNode: 'graph',
    tree: {
      id: 'root',
      text: '시장 보고서.pdf 분석',
      conversation: { question: '이 시장 보고서를 분석해줘', answer: '요약, 그래프 해석, 경쟁사 분석을 진행할 수 있습니다.' },
      children: [
        { id: 'summary', text: '전체 요약 요청', conversation: { question: '전체 보고서를 요약해줘', answer: '2024년 시장은 23% 성장했습니다.' } },
        { id: 'graph', text: '3페이지 그래프 해석', badge: '📎', active: true, conversation: { question: '3페이지 그래프 분석해줘', answer: '2024년 성장률 23%, 3분기 최고치 28%' } },
        { id: 'competitor', text: '경쟁사 비교 분석', conversation: { question: '경쟁사와 차이점은?', answer: 'AI 기술력 우위, 시장 점유율 개선 필요' } }
      ]
    },
    messages: [
      { type: 'user', content: '3페이지에 있는 성장률 그래프 분석해줘' },
      {
        type: 'ai',
        content: `<p>3페이지 그래프 분석 결과:</p>
        <div class="ai-list">
          <div class="ai-list-item"><span class="list-icon">📈</span><span>2024년 시장 성장률 <strong>23%</strong></span></div>
          <div class="ai-list-item"><span class="list-icon">🤖</span><span><strong>AI 기반 솔루션</strong> 수요가 주요 동력</span></div>
          <div class="ai-list-item"><span class="list-icon">📊</span><span>3분기 최고치 28%</span></div>
        </div>`
      }
    ],
    perspectives: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  react: {
    id: 'react',
    name: 'React 학습',
    icon: '📚',
    currentNode: 'q3',
    tree: {
      id: 'root',
      text: 'React 기초 공부',
      conversation: { question: 'React를 어떻게 공부하면 좋을까요?', answer: '컴포넌트 개념부터 시작해서 훅들을 익히세요.' },
      children: [
        { id: 'component', text: '컴포넌트 이해', conversation: { question: '컴포넌트가 뭔가요?', answer: 'UI의 독립적이고 재사용 가능한 코드 조각입니다.' } },
        {
          id: 'useEffect',
          text: 'useEffect 훅',
          active: true,
          conversation: { question: 'useEffect는 언제 사용?', answer: '사이드 이펙트를 처리할 때 사용합니다.' },
          children: [
            { id: 'q1', text: '의존성 배열이 뭐야?', icon: 'Q', conversation: { question: '의존성 배열이 뭐야?', answer: 'useEffect 재실행 조건을 결정하는 배열입니다.' } },
            { id: 'q2', text: 'cleanup 함수는 언제 실행?', icon: 'Q', conversation: { question: 'cleanup 함수는 언제?', answer: '언마운트 또는 effect 재실행 전에 실행됩니다.' } },
            { id: 'q3', text: '무한 루프 해결법?', icon: 'Q', active: true, conversation: { question: '무한 루프 해결?', answer: '의존성 배열 설정 또는 메모이제이션을 사용하세요.' } }
          ]
        },
        { id: 'useState', text: 'useState 훅', conversation: { question: 'useState 사용법?', answer: 'const [state, setState] = useState(initialValue)' } }
      ]
    },
    messages: [
      { type: 'user', content: 'useEffect에서 무한 루프가 발생하는데 어떻게 해결해?' },
      {
        type: 'ai',
        content: `<p>useEffect 무한 루프 해결법:</p>
        <div class="ai-list">
          <div class="ai-list-item"><span class="list-icon">🔄</span><span><strong>원인:</strong> 의존성 배열에 매 렌더링마다 변하는 값</span></div>
          <div class="ai-list-item"><span class="list-icon">✅</span><span><strong>해결 1:</strong> 빈 배열 []로 마운트 시에만 실행</span></div>
          <div class="ai-list-item"><span class="list-icon">✅</span><span><strong>해결 2:</strong> useCallback으로 함수 메모이제이션</span></div>
          <div class="ai-list-item"><span class="list-icon">✅</span><span><strong>해결 3:</strong> useMemo로 객체/배열 메모이제이션</span></div>
        </div>`
      }
    ],
    perspectives: [
      { id: 'beginner', emoji: '🌱', name: '입문자', text: '"빈 배열로 두면 마운트 시 한 번만 실행됩니다."', color: '#22c55e', active: true },
      { id: 'expert', emoji: '🧙', name: '전문가', text: '"useCallback과 useMemo로 성능 최적화도 가능합니다."', color: '#8b5cf6' }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

const STORAGE_KEY = 'ai-thinking-workspaces';

/**
 * 통합 WorkspaceStore
 * 목업이든 사용자 생성이든 동일하게 관리
 */
class WorkspaceStore {
  constructor() {
    this.workspaces = new Map();
    this.currentWorkspaceId = null;
    this._initialized = false;
  }

  /**
   * Store 초기화
   * localStorage에서 복원하거나 시드 데이터로 초기화
   */
  init() {
    if (this._initialized) return;

    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      // localStorage에서 복원
      try {
        const parsed = JSON.parse(saved);
        Object.entries(parsed.workspaces || {}).forEach(([id, ws]) => {
          this.workspaces.set(id, ws);
        });
        this.currentWorkspaceId = parsed.currentWorkspaceId || null;
        console.log('[WorkspaceStore] localStorage에서 복원:', this.workspaces.size, '개');
      } catch (e) {
        console.error('[WorkspaceStore] 복원 실패, 시드 데이터 사용:', e);
        this._seedData();
      }
    } else {
      // 시드 데이터로 초기화
      this._seedData();
    }

    this._initialized = true;
    console.log('[WorkspaceStore] 초기화 완료:', this.workspaces.size, '개 작업공간');
  }

  /**
   * 시드 데이터 로드
   */
  _seedData() {
    Object.entries(SEED_WORKSPACES).forEach(([id, ws]) => {
      this.workspaces.set(id, { ...ws });
    });
    this.persist();
    console.log('[WorkspaceStore] 시드 데이터 로드 완료');
  }

  /**
   * localStorage에 저장
   */
  persist() {
    const data = {
      workspaces: Object.fromEntries(this.workspaces),
      currentWorkspaceId: this.currentWorkspaceId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ===== 조회 API =====

  /**
   * 작업공간 가져오기
   * @param {string} id - 작업공간 ID (없으면 현재 작업공간)
   * @returns {Object|null} 작업공간 객체 (title 속성 포함 - 하위 호환)
   */
  getWorkspace(id) {
    const wsId = id || this.currentWorkspaceId;
    const ws = this.workspaces.get(wsId);
    if (!ws) return null;

    // title 속성 추가 (기존 data.js 호환 - name과 동일)
    return {
      ...ws,
      title: ws.name
    };
  }

  /**
   * 모든 작업공간 목록 (메타데이터만, 삭제된 것 제외)
   * @returns {Array} [{id, name, icon, updatedAt}, ...]
   */
  getWorkspaceList() {
    return Array.from(this.workspaces.values())
      .filter(ws => !ws.deleted)  // 삭제된 것 제외
      .map(ws => ({
        id: ws.id,
        name: ws.name,
        icon: ws.icon,
        updatedAt: ws.updatedAt,
        branchCount: ws.branchCount ?? this._countBranches(ws.tree),
        nodeCount: ws.nodeCount ?? this._countNodes(ws.tree)
      }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  /**
   * 트리에서 분기 수 계산 (children이 2개 이상인 노드)
   */
  _countBranches(node) {
    if (!node) return 0;
    let count = 0;
    if (node.children && node.children.length >= 2) {
      count = 1;
    }
    if (node.children) {
      for (const child of node.children) {
        count += this._countBranches(child);
      }
    }
    return count;
  }

  /**
   * 트리에서 노드 수 계산
   */
  _countNodes(node) {
    if (!node) return 0;
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += this._countNodes(child);
      }
    }
    return count;
  }

  /**
   * 작업공간 존재 여부
   */
  hasWorkspace(id) {
    return this.workspaces.has(id);
  }

  // ===== 현재 작업공간 =====

  /**
   * 현재 작업공간 설정
   */
  setCurrentWorkspace(id) {
    if (!this.workspaces.has(id)) {
      console.warn('[WorkspaceStore] 존재하지 않는 작업공간:', id);
      return false;
    }
    this.currentWorkspaceId = id;
    this.persist();

    EventBus.emit(EVENTS.WORKSPACE_SWITCHED, {
      workspaceId: id,
      workspace: this.getWorkspace(id)
    });

    return true;
  }

  /**
   * 현재 작업공간 가져오기
   */
  getCurrentWorkspace() {
    return this.getWorkspace(this.currentWorkspaceId);
  }

  // ===== 생성/수정/삭제 =====

  /**
   * 새 작업공간 생성
   * @param {string} name - 작업공간 이름
   * @param {string} icon - 아이콘 (기본값: 💭)
   * @returns {Object} 생성된 작업공간
   */
  createWorkspace(name, icon = '💭') {
    const id = `ws_${Date.now()}`;
    const now = Date.now();

    const workspace = {
      id,
      name,
      icon,
      currentNode: 'root',
      tree: {
        id: 'root',
        text: name,
        conversation: {
          question: '',
          answer: ''
        },
        children: []
      },
      messages: [],
      perspectives: [],
      branchCount: 0,
      nodeCount: 1,  // 루트 노드 1개
      createdAt: now,
      updatedAt: now
    };

    this.workspaces.set(id, workspace);
    this.persist();

    EventBus.emit(EVENTS.WORKSPACE_CREATED, { workspace });
    console.log('[WorkspaceStore] 작업공간 생성:', id, name);

    return workspace;
  }

  /**
   * 작업공간 삭제 (휴지통으로 이동 - 소프트 삭제)
   */
  deleteWorkspace(id) {
    console.log('[WorkspaceStore] deleteWorkspace 호출:', id);

    const ws = this.workspaces.get(id);
    if (!ws) {
      console.warn('[WorkspaceStore] 작업공간이 존재하지 않음:', id);
      return false;
    }

    // 소프트 삭제: deleted 플래그 설정
    const deleted = {
      ...ws,
      deleted: true,
      deletedAt: Date.now()
    };
    this.workspaces.set(id, deleted);

    console.log('[WorkspaceStore] 휴지통으로 이동:', id);

    // 현재 작업공간이 삭제된 경우
    if (this.currentWorkspaceId === id) {
      this.currentWorkspaceId = null;
    }

    this.persist();
    EventBus.emit(EVENTS.WORKSPACE_DELETED, { workspaceId: id, workspaceName: ws.name });
    console.log('[WorkspaceStore] 삭제 완료:', id);

    return true;
  }

  /**
   * 휴지통에서 복구
   */
  restoreWorkspace(id) {
    const ws = this.workspaces.get(id);
    if (!ws || !ws.deleted) {
      console.warn('[WorkspaceStore] 복구할 작업공간이 없음:', id);
      return false;
    }

    // deleted 플래그 제거
    const restored = { ...ws };
    delete restored.deleted;
    delete restored.deletedAt;
    restored.updatedAt = Date.now();

    this.workspaces.set(id, restored);
    this.persist();

    EventBus.emit(EVENTS.WORKSPACE_RESTORED, { workspaceId: id, workspace: restored });
    console.log('[WorkspaceStore] 복구 완료:', id);

    return true;
  }

  /**
   * 영구 삭제 (휴지통에서 완전 삭제)
   */
  permanentlyDeleteWorkspace(id) {
    const ws = this.workspaces.get(id);
    if (!ws) {
      return false;
    }

    this.workspaces.delete(id);
    this.persist();

    EventBus.emit(EVENTS.WORKSPACE_PERMANENTLY_DELETED, { workspaceId: id });
    console.log('[WorkspaceStore] 영구 삭제 완료:', id);

    return true;
  }

  /**
   * 휴지통 비우기
   */
  emptyTrash() {
    const deletedIds = [];
    for (const [id, ws] of this.workspaces) {
      if (ws.deleted) {
        deletedIds.push(id);
      }
    }

    deletedIds.forEach(id => this.workspaces.delete(id));
    this.persist();

    EventBus.emit(EVENTS.TRASH_EMPTIED, { count: deletedIds.length });
    console.log('[WorkspaceStore] 휴지통 비움:', deletedIds.length, '개');

    return deletedIds.length;
  }

  /**
   * 휴지통 목록 조회
   */
  getTrashList() {
    return Array.from(this.workspaces.values())
      .filter(ws => ws.deleted)
      .map(ws => ({
        id: ws.id,
        name: ws.name,
        icon: ws.icon,
        deletedAt: ws.deletedAt,
        updatedAt: ws.updatedAt
      }))
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  }

  /**
   * 작업공간 업데이트
   */
  updateWorkspace(id, updates) {
    const ws = this.workspaces.get(id);
    if (!ws) return null;

    const updated = {
      ...ws,
      ...updates,
      updatedAt: Date.now()
    };

    this.workspaces.set(id, updated);
    this.persist();

    EventBus.emit(EVENTS.WORKSPACE_UPDATED, { workspace: updated });

    return updated;
  }

  // ===== 메시지 관리 =====

  /**
   * 메시지 추가
   * @param {string|null} workspaceId - 작업공간 ID (null이면 현재 작업공간)
   * @param {Object} message - 메시지 객체 {type, content, ...}
   */
  addMessage(workspaceId, message) {
    const wsId = workspaceId || this.currentWorkspaceId;
    const ws = this.workspaces.get(wsId);
    if (!ws) {
      console.warn('[WorkspaceStore] addMessage 실패 - 작업공간 없음:', wsId);
      return null;
    }

    const newMessage = {
      id: `msg_${Date.now()}`,
      ...message,
      timestamp: Date.now()
    };

    ws.messages.push(newMessage);
    ws.updatedAt = Date.now();

    this.persist();
    EventBus.emit(EVENTS.MESSAGE_ADDED, { workspaceId: wsId, message: newMessage });
    console.log('[WorkspaceStore] 메시지 저장됨:', wsId, newMessage.type);

    return newMessage;
  }

  /**
   * 메시지 목록 가져오기
   */
  getMessages(workspaceId) {
    const ws = this.getWorkspace(workspaceId);
    return ws?.messages || [];
  }

  // ===== 트리 관리 =====

  /**
   * 트리 업데이트
   */
  updateTree(workspaceId, tree) {
    return this.updateWorkspace(workspaceId, { tree });
  }

  /**
   * 현재 노드 변경 (이전 노드도 자동 저장)
   */
  setCurrentNode(workspaceId, nodeId) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return null;

    // 이전 노드 저장 (현재 노드가 있고, 새 노드와 다르면)
    if (ws.currentNode && ws.currentNode !== nodeId) {
      ws.previousNode = ws.currentNode;
    }

    ws.currentNode = nodeId;
    ws.updatedAt = Date.now();

    this.persist();
    EventBus.emit(EVENTS.NODE_SWITCHED, { workspaceId, nodeId });

    console.log('[WorkspaceStore] 노드 전환:', {
      current: nodeId,
      previous: ws.previousNode
    });

    return ws;
  }

  // ===== 관점 관리 =====

  /**
   * 관점 추가
   */
  addPerspective(workspaceId, perspective) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return null;

    const newPerspective = {
      id: `pers_${Date.now()}`,
      ...perspective
    };

    ws.perspectives.push(newPerspective);
    ws.updatedAt = Date.now();

    this.persist();

    return newPerspective;
  }

  /**
   * 관점 목록 업데이트 (전체 교체)
   * @param {string} workspaceId - 작업공간 ID
   * @param {Array} perspectives - 새 관점 목록
   * @returns {Object|null} 업데이트된 작업공간 또는 null
   */
  updatePerspectives(workspaceId, perspectives) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) {
      console.warn('[WorkspaceStore] updatePerspectives 실패 - 작업공간 없음:', workspaceId);
      return null;
    }

    ws.perspectives = perspectives;
    ws.updatedAt = Date.now();

    this.persist();
    console.log('[WorkspaceStore] perspectives 업데이트:', workspaceId, perspectives.length, '개');

    return ws;
  }

  // ===== 유틸리티 =====

  /**
   * 데이터 초기화 (시드 데이터로 리셋)
   */
  reset() {
    this.workspaces.clear();
    this.currentWorkspaceId = null;
    this._seedData();
    console.log('[WorkspaceStore] 데이터 초기화 완료');
  }

  /**
   * 디버그용 상태 출력
   */
  debug() {
    console.log('[WorkspaceStore] 상태:', {
      workspaceCount: this.workspaces.size,
      currentWorkspaceId: this.currentWorkspaceId,
      workspaces: Array.from(this.workspaces.keys())
    });
  }
}

// 싱글톤 인스턴스
export const workspaceStore = new WorkspaceStore();

// 하위 호환성을 위한 전역 함수들 (기존 data.js 대체)
export function getWorkspace(id) {
  return workspaceStore.getWorkspace(id);
}

export function setWorkspace(id) {
  return workspaceStore.setCurrentWorkspace(id);
}

export function getWorkspaces() {
  return workspaceStore.getWorkspaceList();
}

export function getWorkspaceById(id) {
  return workspaceStore.getWorkspace(id);
}
