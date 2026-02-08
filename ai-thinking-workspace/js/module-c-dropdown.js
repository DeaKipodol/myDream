// ========================================
// 모듈 C: 작업공간 드롭다운
// ========================================

/**
 * 의존성 체크 (모듈 B 미완성 시 기본 동작)
 * 동적 참조를 위해 getter 사용
 */
const getWorkspaceManager = () => window.workspaceManager || {
  currentWorkspaceId: 'ws_1',
  getAll: () => [
    { id: 'ws_1', name: '마케팅 전략' },
    { id: 'ws_2', name: 'React 학습' },
    { id: 'ws_3', name: '신규 기획' },
    { id: 'ws_4', name: '2026년 목표' }
  ],
  getById: (id) => {
    const all = getWorkspaceManager().getAll();
    return all.find(w => w.id === id);
  },
  search: (query) => {
    if (!query) return getWorkspaceManager().getAll();
    const q = query.toLowerCase();
    return getWorkspaceManager().getAll().filter(w =>
      w.name.toLowerCase().includes(q)
    );
  },
  create: (name) => ({ id: 'temp_' + Date.now(), name })
};

const getRouter = () => window.router || {
  goWorkspace: (id) => console.log('getRouter().goWorkspace:', id),
  goHome: () => console.log('getRouter().goHome')
};

/**
 * 모듈 C: 작업공간 드롭다운 클래스
 */
class ModuleC {
  static SLOT_ID = 'workspace-dropdown';

  constructor() {
    this.initialized = false;
    this.dropdown = null;
    this.listEl = null;
    this.searchInput = null;
    this.newBtn = null;
    this.viewAllBtn = null;
    this.selectorBtn = null;

    this.isOpen = false;
    this.focusedIndex = -1;
    this.items = [];
  }

  /**
   * 초기화
   */
  async init() {
    // 슬롯 존재 확인
    this.dropdown = document.getElementById(ModuleC.SLOT_ID);

    if (!this.dropdown) {
      // 모듈 A 완료 대기
      await this.waitForSlot();
      this.dropdown = document.getElementById(ModuleC.SLOT_ID);
    }

    if (!this.dropdown) {
      console.warn('[모듈 C] workspace-dropdown 요소를 찾을 수 없습니다.');
      return;
    }

    // DOM 요소 캐싱
    this.listEl = document.getElementById('workspace-dropdown-list');
    this.searchInput = document.getElementById('workspace-dropdown-search');
    this.newBtn = document.getElementById('dropdown-new-workspace');
    this.viewAllBtn = document.getElementById('dropdown-view-all');
    this.selectorBtn = document.getElementById('workspace-selector-btn');

    this.bindEvents();
    this.initialized = true;

    // 초기화 완료 이벤트
    window.dispatchEvent(new CustomEvent('module-c-ready'));
  }

  /**
   * 모듈 A 슬롯 대기
   */
  waitForSlot() {
    return new Promise(resolve => {
      // 이미 존재하면 즉시 resolve
      if (document.getElementById(ModuleC.SLOT_ID)) {
        resolve();
        return;
      }

      // 모듈 A 완료 이벤트 대기
      window.addEventListener('module-a-ready', resolve, { once: true });

      // 타임아웃 (3초)
      setTimeout(resolve, 3000);
    });
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // NOTE: 버튼 클릭은 ModuleA(WorkspaceSelector)에서 처리
    // ModuleA가 workspace-dropdown-open 이벤트를 발행하면 onOpen() 호출됨
    // 중복 핸들러 제거 - 더블클릭 문제 해결

    // 검색 입력
    this.searchInput?.addEventListener('input', (e) => {
      this.render(getWorkspaceManager().search(e.target.value));
    });

    // 검색창 키보드 이벤트
    this.searchInput?.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    // 새 작업공간
    this.newBtn?.addEventListener('click', () => {
      this.createWorkspace();
    });

    // 모든 작업공간 보기
    this.viewAllBtn?.addEventListener('click', () => {
      this.goHome();
    });

    // 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.dropdown?.contains(e.target) &&
          !this.selectorBtn?.contains(e.target)) {
        this.close();
      }
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
        this.selectorBtn?.focus();
      }
    });

    // 외부 열림 이벤트 수신 (모듈 A 연동)
    window.addEventListener('workspace-dropdown-open', () => {
      this.onOpen();
    });

    // 외부 닫힘 이벤트 수신 (ModuleA ESC/외부클릭 시)
    window.addEventListener('workspace-dropdown-close', () => {
      this.onClose();
    });

    // 다른 드롭다운 열릴 때 닫기 (모듈 D 연동)
    window.addEventListener('dropdown-exclusive-open', (e) => {
      if (e.detail?.source !== 'module-c' && this.isOpen) {
        this.close(false);  // 다른 드롭다운이 열려서 닫히는 것이므로 이벤트 재발행 안 함
      }
    });
  }

  /**
   * 드롭다운 토글
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 드롭다운 열기
   */
  open() {
    this.isOpen = true;
    this.selectorBtn?.setAttribute('aria-expanded', 'true');
    this.dropdown?.removeAttribute('hidden');

    // 다른 드롭다운 닫기 요청
    window.dispatchEvent(new CustomEvent('dropdown-exclusive-open', {
      detail: { source: 'module-c' }
    }));

    this.onOpen();
  }

  /**
   * 드롭다운 열릴 때 처리
   * NOTE: ModuleA가 workspace-dropdown-open 이벤트 발행 시 호출됨
   */
  onOpen() {
    // 상태 동기화 (ModuleA와 일치)
    this.isOpen = true;

    // 검색 초기화
    if (this.searchInput) {
      this.searchInput.value = '';
    }

    // 목록 렌더링
    this.render(getWorkspaceManager().getAll());

    // 검색 입력에 포커스
    setTimeout(() => {
      this.searchInput?.focus();
    }, 50);

    this.focusedIndex = -1;
  }

  /**
   * 드롭다운 닫기
   * @param {boolean} emitEvent - 닫힘 이벤트 발행 여부 (기본: true)
   */
  close(emitEvent = true) {
    this.isOpen = false;
    this.selectorBtn?.setAttribute('aria-expanded', 'false');
    this.dropdown?.setAttribute('hidden', '');
    this.focusedIndex = -1;

    // 닫힘 이벤트 발행 (모듈 A 연동)
    // NOTE: 외부 이벤트로 닫힐 때는 이벤트 재발행 방지
    if (emitEvent) {
      window.dispatchEvent(new CustomEvent('workspace-dropdown-close'));
    }
  }

  /**
   * 드롭다운 닫힐 때 처리 (외부 이벤트용)
   * NOTE: ModuleA가 workspace-dropdown-close 이벤트 발행 시 호출됨
   */
  onClose() {
    // 상태만 동기화, 이벤트 재발행 안 함
    this.close(false);
  }

  /**
   * 목록 렌더링
   */
  render(workspaces) {
    if (!this.listEl) return;

    if (workspaces.length === 0) {
      this.listEl.innerHTML = `
        <div class="dropdown-empty">
          <p class="dropdown-empty-text">검색 결과가 없습니다</p>
        </div>
      `;
      this.items = [];
      return;
    }

    const currentId = getWorkspaceManager().currentWorkspaceId;

    this.listEl.innerHTML = workspaces.map(w => `
      <button
        class="dropdown-item"
        data-workspace-id="${w.id}"
        role="option"
        aria-selected="${w.id === currentId}"
      >
        <span class="dropdown-item-indicator" aria-hidden="true"></span>
        <span class="dropdown-item-name">${this.escapeHtml(w.name)}</span>
      </button>
    `).join('');

    // 항목 이벤트 바인딩
    this.items = Array.from(this.listEl.querySelectorAll('.dropdown-item'));

    this.items.forEach((item, index) => {
      item.addEventListener('click', () => {
        this.selectWorkspace(item.dataset.workspaceId);
      });

      item.addEventListener('mouseenter', () => {
        this.setFocusedIndex(index);
      });
    });
  }

  /**
   * 키보드 네비게이션
   */
  handleKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.moveFocus(1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.moveFocus(-1);
        break;

      case 'Enter':
        e.preventDefault();
        if (this.focusedIndex >= 0 && this.items[this.focusedIndex]) {
          this.selectWorkspace(this.items[this.focusedIndex].dataset.workspaceId);
        }
        break;
    }
  }

  /**
   * 포커스 이동
   */
  moveFocus(direction) {
    if (this.items.length === 0) return;

    let newIndex = this.focusedIndex + direction;

    if (newIndex < 0) {
      newIndex = this.items.length - 1;
    } else if (newIndex >= this.items.length) {
      newIndex = 0;
    }

    this.setFocusedIndex(newIndex);
  }

  /**
   * 포커스 인덱스 설정
   */
  setFocusedIndex(index) {
    // 이전 포커스 제거
    if (this.focusedIndex >= 0 && this.items[this.focusedIndex]) {
      this.items[this.focusedIndex].classList.remove('focused');
    }

    this.focusedIndex = index;

    // 새 포커스 설정
    if (this.items[index]) {
      this.items[index].classList.add('focused');
      this.items[index].scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * 작업공간 선택
   * NOTE: 드롭다운에서 작업공간 전환 비활성화 - 탭 시스템 사용 권장
   */
  selectWorkspace(id) {
    // 드롭다운 닫기
    this.close();

    // NewTabManager로 작업공간 열기
    const workspace = getWorkspaceManager().getById(id);
    if (window.newTabManager && typeof window.newTabManager.openWorkspace === 'function') {
      console.log('[ModuleC] NewTabManager로 작업공간 열기:', id);
      window.newTabManager.openWorkspace(id, workspace?.name || '작업공간');
    } else {
      console.log('[ModuleC] 드롭다운 작업공간 전환 비활성화됨 - 홈에서 선택하세요');
    }
  }

  /**
   * 새 작업공간 생성
   */
  createWorkspace() {
    const name = prompt('작업공간 이름을 입력하세요:', '새 작업공간');
    if (name && name.trim()) {
      const workspace = getWorkspaceManager().create(name.trim());

      // 드롭다운 닫기
      this.close();

      // 새 작업공간으로 이동
      this.selectWorkspace(workspace.id);
    }
  }

  /**
   * 홈으로 이동
   */
  goHome() {
    // 드롭다운 닫기
    this.close();

    // ModuleB로 홈 이동
    if (window.ModuleB) {
      window.ModuleB.goHome();
    }
  }

  /**
   * HTML 이스케이프 (XSS 방지)
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 노출
window.ModuleC = new ModuleC();

// DOMContentLoaded 시 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.ModuleC.init();
});
