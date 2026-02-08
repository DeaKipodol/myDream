// ========================================
// 모듈 B: 홈 화면
// Router + WorkspaceManager + HomeUI 통합
// ========================================

class ModuleB {
  static TEMPLATE_PATH = 'templates/home.html';

  constructor() {
    this.initialized = false;
    this.currentView = 'home';
    this.workspaces = [];
    this.currentWorkspaceId = null;

    // DOM 요소 캐시
    this.homeView = null;
    this.workspaceView = null;
    this.listEl = null;
    this.emptyEl = null;
    this.searchInput = null;

    // 생성자에서 즉시 데이터 로드 (모듈 C가 참조하기 전에)
    this.loadWorkspaces();
  }

  // ========================================
  // 초기화
  // ========================================

  async init() {
    // 작업공간 데이터 로드
    this.loadWorkspaces();

    // DOM 요소 캐시
    this.homeView = document.getElementById('home-view');
    this.workspaceView = document.getElementById('workspace-view');
    this.listEl = document.getElementById('home-workspace-list');
    this.emptyEl = document.getElementById('home-empty-state');
    this.searchInput = document.getElementById('workspace-search');

    // 이벤트 바인딩
    this.bindEvents();

    // 초기 렌더링
    this.render(this.getAll());

    // 홈 상태 설정: 드롭다운 숨기기
    this.setHomeHeaderState();

    this.initialized = true;

    // 초기화 완료 이벤트
    window.dispatchEvent(new CustomEvent('module-b-ready'));

    console.log('✅ 모듈 B (홈) 초기화 완료');
  }

  /**
   * 홈 상태일 때 헤더 설정
   */
  setHomeHeaderState() {
    // 홈에서는 작업공간 드롭다운 숨기기
    const selector = document.getElementById('workspace-selector');
    if (selector) {
      selector.setAttribute('hidden', '');
    }
  }

  /**
   * 작업공간 상태일 때 헤더 설정
   */
  setWorkspaceHeaderState() {
    // 작업공간에서는 드롭다운 표시
    const selector = document.getElementById('workspace-selector');
    if (selector) {
      selector.removeAttribute('hidden');
    }
  }

  bindEvents() {
    // 검색 입력
    this.searchInput?.addEventListener('input', (e) => {
      this.render(this.search(e.target.value));
    });

    // 새 작업공간 버튼
    document.getElementById('btn-new-workspace')?.addEventListener('click', () => {
      this.createWorkspace();
    });
    document.getElementById('btn-new-workspace-empty')?.addEventListener('click', () => {
      this.createWorkspace();
    });

    // ========================================
    // 이벤트 위임: listEl에서 모든 카드 이벤트 처리
    // ========================================

    // 키보드 접근 (Enter/Space로 카드 열기)
    this.listEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.workspace-card');
        if (card && !e.target.closest('.workspace-card-menu')) {
          e.preventDefault();
          const id = card.dataset.workspaceId;
          this.openWorkspace(id);
        }
      }
    });

    this.listEl?.addEventListener('click', (e) => {
      const target = e.target;

      // 1. 메뉴 버튼 클릭 (⋮) → 포탈 드롭다운 열기
      const menuBtn = target.closest('.workspace-card-menu');
      if (menuBtn) {
        e.stopPropagation();
        console.log('[모듈 B] 메뉴 버튼 클릭');
        this.toggleCardMenu(menuBtn);
        return;
      }

      // 2. 카드 클릭 → 작업공간 열기
      const card = target.closest('.workspace-card');
      if (card) {
        const id = card.dataset.workspaceId;
        console.log('[모듈 B] 카드 클릭:', id);
        this.openWorkspace(id);
      }
    });

    // 외부 클릭 시 포탈 드롭다운 닫기
    document.addEventListener('click', (e) => {
      // 포탈 내부 또는 메뉴 버튼 클릭은 무시
      if (e.target.closest('#workspace-dropdown-portal') ||
          e.target.closest('.workspace-card-menu')) {
        return;
      }
      this.closeAllDropdowns();
    });

    // ESC 키로 드롭다운 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllDropdowns();
      }
    });

    // 모듈 C에서 "모든 작업공간 보기" 클릭 시
    window.addEventListener('navigate-home', () => {
      this.goHome();
    });

    // EventBus로 작업공간 생성/삭제/복구 이벤트 구독
    // EventBus가 로드된 후 구독 (DOMContentLoaded 이후)
    setTimeout(() => {
      if (window.EventBus) {
        window.EventBus.on('workspace:created', () => {
          console.log('[모듈 B] 작업공간 생성 이벤트 수신, 목록 새로고침');
          if (this.currentView === 'home') {
            this.render(this.getAll());
          }
        });
        window.EventBus.on('workspace:deleted', () => {
          console.log('[모듈 B] 작업공간 삭제 이벤트 수신, 목록 새로고침');
          if (this.currentView === 'home') {
            this.render(this.getAll());
          }
        });
        window.EventBus.on('workspace:restored', () => {
          console.log('[모듈 B] 작업공간 복구 이벤트 수신, 목록 새로고침');
          if (this.currentView === 'home') {
            this.render(this.getAll());
          }
        });
      }
    }, 100);
  }

  // ========================================
  // 라우터 기능
  // ========================================

  goHome() {
    // 홈 화면 표시
    this.homeView?.removeAttribute('hidden');
    this.workspaceView?.setAttribute('hidden', '');

    this.currentView = 'home';
    this.currentWorkspaceId = null;

    // Store의 activeTabId 클리어 (새로고침 시 홈 유지)
    if (window.__store) {
      window.__store.setState({ activeTabId: null });
      window.__store.persist();
    }

    // 브라우저 탭 제목 업데이트
    document.title = '내 작업공간 | AI 생각 작업공간';

    // 헤더 상태 변경
    this.setHomeHeaderState();

    // 목록 새로고침 (새로 만든 작업공간 반영)
    this.render(this.getAll());

    // 이벤트 발생
    window.dispatchEvent(new CustomEvent('route-change', {
      detail: { view: 'home' }
    }));
  }

  goWorkspace(workspaceId) {
    console.log('[ModuleB] goWorkspace 호출:', workspaceId);

    // 작업공간 찾기 (workspaceStore 우선)
    let workspace = this.getById(workspaceId);
    console.log('[ModuleB] 작업공간:', workspace);

    // 삭제된 작업공간인 경우 삭제 메시지 표시
    if (workspace?.deleted) {
      console.log('[ModuleB] 삭제된 작업공간 감지:', workspaceId);
      this.homeView?.setAttribute('hidden', '');
      this.workspaceView?.removeAttribute('hidden');
      this.currentView = 'workspace';
      this.currentWorkspaceId = workspaceId;
      this.setWorkspaceHeaderState();

      // 삭제됨 메시지 표시
      if (window.chatManager?.renderDeletedState) {
        window.chatManager.renderDeletedState(workspace.name, workspaceId);
      }
      return;
    }

    this.homeView?.setAttribute('hidden', '');
    this.workspaceView?.removeAttribute('hidden');
    this.currentView = 'workspace';
    this.currentWorkspaceId = workspaceId;

    // 헤더 상태 변경
    this.setWorkspaceHeaderState();

    // 작업공간 이름 업데이트
    const nameEl = document.getElementById('current-workspace-name');
    if (nameEl && workspace) {
      nameEl.textContent = workspace.name;
    }

    // 브라우저 탭 제목 업데이트
    if (workspace) {
      document.title = `${workspace.name} | AI 생각 작업공간`;
    }

    // workspaceStore 현재 작업공간 설정
    if (this._hasStore()) {
      window.workspaceStore.setCurrentWorkspace(workspaceId);
    }

    // 레거시 data.js 호환 (기존 렌더러가 사용)
    if (typeof setWorkspace === 'function') {
      setWorkspace(workspaceId);
    }

    // 작업공간 콘텐츠 렌더링
    if (window.app && typeof window.app.renderWorkspace === 'function') {
      window.app.renderWorkspace();
    }

    // 모듈 C에 현재 작업공간 ID 전달
    if (window.workspaceManager) {
      window.workspaceManager.currentWorkspaceId = workspaceId;
    }

    // 이벤트 발생
    window.dispatchEvent(new CustomEvent('route-change', {
      detail: { view: 'workspace', workspaceId }
    }));

    window.dispatchEvent(new CustomEvent('workspace-change', {
      detail: { workspace }
    }));
  }

  getCurrentView() {
    return this.currentView;
  }

  // ========================================
  // 작업공간 데이터 관리 (workspaceStore 통합)
  // ========================================

  /**
   * workspaceStore 사용 가능 여부
   */
  _hasStore() {
    return window.workspaceStore && typeof window.workspaceStore.getWorkspaceList === 'function';
  }

  loadWorkspaces() {
    // workspaceStore가 있으면 그것을 사용 (목업 + 사용자 데이터 통합)
    if (this._hasStore()) {
      console.log('[ModuleB] workspaceStore에서 작업공간 로드');
      return; // workspaceStore가 관리하므로 별도 로드 불필요
    }
    // 폴백: 기존 localStorage
    const data = localStorage.getItem('workspaces');
    this.workspaces = data ? JSON.parse(data) : [];
  }

  saveWorkspaces() {
    if (this._hasStore()) {
      window.workspaceStore.persist();
      return;
    }
    localStorage.setItem('workspaces', JSON.stringify(this.workspaces));
  }

  getAll() {
    if (this._hasStore()) {
      return window.workspaceStore.getWorkspaceList();
    }
    return [...this.workspaces].sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  getById(id) {
    if (this._hasStore()) {
      return window.workspaceStore.getWorkspace(id);
    }
    return this.workspaces.find(w => w.id === id);
  }

  create(name = '새 작업공간') {
    if (this._hasStore()) {
      return window.workspaceStore.createWorkspace(name);
    }
    // 폴백: 기존 방식
    const workspace = {
      id: this.generateId(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      branchCount: 0,
      nodeCount: 0,
      tree: null
    };
    this.workspaces.push(workspace);
    this.saveWorkspaces();
    return workspace;
  }

  rename(id, newName) {
    if (this._hasStore()) {
      return window.workspaceStore.updateWorkspace(id, { name: newName });
    }
    const workspace = this.getById(id);
    if (workspace) {
      workspace.name = newName;
      workspace.updatedAt = new Date().toISOString();
      this.saveWorkspaces();
    }
    return workspace;
  }

  delete(id) {
    console.log('[모듈 B] delete() 호출:', id, 'hasStore:', this._hasStore());
    if (this._hasStore()) {
      const result = window.workspaceStore.deleteWorkspace(id);
      console.log('[모듈 B] workspaceStore.deleteWorkspace 결과:', result);
      return result;
    }
    const index = this.workspaces.findIndex(w => w.id === id);
    if (index !== -1) {
      this.workspaces.splice(index, 1);
      this.saveWorkspaces();
      return true;
    }
    return false;
  }

  duplicate(id) {
    const original = this.getById(id);
    if (!original) return null;

    const copyName = `${original.name} (복사본)`;

    if (this._hasStore()) {
      // workspaceStore로 새 작업공간 생성 후 데이터 복사
      const copy = window.workspaceStore.createWorkspace(copyName, original.icon || '💭');
      // 원본의 messages, tree, perspectives 복사
      if (original.messages) {
        window.workspaceStore.updateWorkspace(copy.id, {
          messages: JSON.parse(JSON.stringify(original.messages)),
          tree: original.tree ? JSON.parse(JSON.stringify(original.tree)) : copy.tree,
          perspectives: original.perspectives ? JSON.parse(JSON.stringify(original.perspectives)) : []
        });
      }
      return window.workspaceStore.getWorkspace(copy.id);
    }

    // 폴백
    const copy = {
      ...original,
      id: this.generateId(),
      name: copyName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.workspaces.push(copy);
    this.saveWorkspaces();
    return copy;
  }

  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();

    return this.getAll().filter(w =>
      w.name.toLowerCase().includes(q)
    );
  }

  touch(id) {
    if (this._hasStore()) {
      window.workspaceStore.updateWorkspace(id, {});
      return;
    }
    const workspace = this.getById(id);
    if (workspace) {
      workspace.updatedAt = new Date().toISOString();
      this.saveWorkspaces();
    }
  }

  updateStats(id, stats) {
    if (this._hasStore()) {
      window.workspaceStore.updateWorkspace(id, stats);
      return;
    }
    const workspace = this.getById(id);
    if (workspace) {
      if (stats.branchCount !== undefined) {
        workspace.branchCount = stats.branchCount;
      }
      if (stats.nodeCount !== undefined) {
        workspace.nodeCount = stats.nodeCount;
      }
      workspace.updatedAt = new Date().toISOString();
      this.saveWorkspaces();
    }
  }

  formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  }

  generateId() {
    return 'ws_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // ========================================
  // UI 렌더링
  // ========================================

  render(workspaces) {
    if (!this.listEl) return;

    if (workspaces.length === 0) {
      this.listEl.setAttribute('hidden', '');
      this.emptyEl?.removeAttribute('hidden');
    } else {
      this.listEl.removeAttribute('hidden');
      this.emptyEl?.setAttribute('hidden', '');
      this.listEl.innerHTML = workspaces.map(w => this.renderCard(w)).join('');
    }

    // 휴지통 섹션 렌더링
    this.renderTrashSection();
  }

  /**
   * 휴지통 섹션 렌더링
   */
  renderTrashSection() {
    // 휴지통 컨테이너 찾기 또는 생성
    let trashSection = document.getElementById('home-trash-section');
    const trashList = this.getTrashList();

    if (trashList.length === 0) {
      // 휴지통이 비어있으면 섹션 숨기기
      if (trashSection) trashSection.setAttribute('hidden', '');
      return;
    }

    // 섹션이 없으면 생성
    if (!trashSection) {
      const homeContainer = document.querySelector('.home-container');
      if (!homeContainer) return;

      trashSection = document.createElement('div');
      trashSection.id = 'home-trash-section';
      trashSection.className = 'home-trash-section';
      homeContainer.appendChild(trashSection);
    }

    trashSection.removeAttribute('hidden');
    trashSection.innerHTML = `
      <div class="trash-header">
        <h3 class="trash-title">🗑️ 휴지통 <span class="trash-count">${trashList.length}</span></h3>
        <button class="btn-empty-trash" ${trashList.length === 0 ? 'disabled' : ''}>비우기</button>
      </div>
      <div class="trash-list">
        ${trashList.map(w => this.renderTrashCard(w)).join('')}
      </div>
    `;

    // 이벤트 바인딩
    trashSection.querySelector('.btn-empty-trash')?.addEventListener('click', () => {
      if (confirm('휴지통을 비우시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        this.emptyTrash();
      }
    });

    // 복구/영구삭제 버튼 이벤트 위임
    trashSection.querySelector('.trash-list')?.addEventListener('click', (e) => {
      const restoreBtn = e.target.closest('.btn-trash-restore');
      const deleteBtn = e.target.closest('.btn-trash-delete');
      const card = e.target.closest('.trash-card');
      const id = card?.dataset.workspaceId;

      if (restoreBtn && id) {
        e.stopPropagation();
        this.restoreWorkspace(id);
      } else if (deleteBtn && id) {
        e.stopPropagation();
        if (confirm('이 작업공간을 영구 삭제하시겠습니까?')) {
          this.permanentlyDelete(id);
        }
      }
    });
  }

  /**
   * 휴지통 카드 렌더링
   */
  renderTrashCard(workspace) {
    return `
      <div class="trash-card" data-workspace-id="${workspace.id}">
        <div class="trash-card-info">
          <span class="trash-card-name">${this.escapeHtml(workspace.name)}</span>
          <span class="trash-card-date">삭제: ${this.formatRelativeTime(workspace.deletedAt)}</span>
        </div>
        <div class="trash-card-actions">
          <button class="btn-trash-restore" title="복구">↩️</button>
          <button class="btn-trash-delete" title="영구 삭제">✕</button>
        </div>
      </div>
    `;
  }

  /**
   * 휴지통 목록 가져오기
   */
  getTrashList() {
    if (this._hasStore()) {
      return window.workspaceStore.getTrashList();
    }
    return [];
  }

  /**
   * 작업공간 복구
   */
  restoreWorkspace(id) {
    if (this._hasStore()) {
      window.workspaceStore.restoreWorkspace(id);
      this.render(this.getAll());
    }
  }

  /**
   * 작업공간 영구 삭제
   */
  permanentlyDelete(id) {
    if (this._hasStore()) {
      window.workspaceStore.permanentlyDeleteWorkspace(id);
      this.render(this.getAll());
    }
  }

  /**
   * 휴지통 비우기
   */
  emptyTrash() {
    if (this._hasStore()) {
      window.workspaceStore.emptyTrash();
      this.render(this.getAll());
    }
  }

  renderCard(workspace) {
    return `
      <article class="workspace-card" data-workspace-id="${workspace.id}" role="listitem" tabindex="0">
        <div class="workspace-card-header">
          <h2 class="workspace-card-title">${this.escapeHtml(workspace.name)}</h2>
          <button class="workspace-card-menu" aria-label="더 보기" aria-haspopup="menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
              <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
        </div>

        <p class="workspace-card-meta">
          <span class="workspace-card-time">${this.formatRelativeTime(workspace.updatedAt)}</span>
          <span class="workspace-card-dot" aria-hidden="true">·</span>
          <span class="workspace-card-stats">${workspace.branchCount}개 분기, ${workspace.nodeCount}개 노드</span>
        </p>

        <!-- 드롭다운은 포탈 방식으로 body에 생성됨 (toggleCardMenu 참조) -->
      </article>
    `;
  }

  closeAllDropdowns() {
    // 포탈 방식 드롭다운 닫기
    document.getElementById('workspace-dropdown-portal')?.remove();
  }

  toggleCardMenu(menuBtn) {
    console.log('[모듈 B] toggleCardMenu 호출');

    if (!menuBtn) return;

    const card = menuBtn.closest('.workspace-card');
    const workspaceId = card?.dataset.workspaceId;

    // 이미 열린 포탈이 같은 카드의 것이면 닫기만 함
    const existingPortal = document.getElementById('workspace-dropdown-portal');
    if (existingPortal && existingPortal.dataset.workspaceId === workspaceId) {
      existingPortal.remove();
      return;
    }

    // 다른 포탈 닫기
    this.closeAllDropdowns();

    // 버튼 위치 계산
    const rect = menuBtn.getBoundingClientRect();

    // 팝업 생성 (body에 추가)
    const portal = document.createElement('div');
    portal.id = 'workspace-dropdown-portal';
    portal.dataset.workspaceId = workspaceId;
    portal.innerHTML = `
      <button class="dropdown-item" data-action="rename">
        <span>✏️ 이름 변경</span>
      </button>
      <button class="dropdown-item" data-action="duplicate">
        <span>📋 복제</span>
      </button>
      <button class="dropdown-item danger" data-action="delete">
        <span>🗑️ 삭제</span>
      </button>
    `;
    portal.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 4}px;
      right: ${window.innerWidth - rect.right}px;
      min-width: 140px;
      padding: 6px;
      background: var(--bg-dropdown, #fff);
      border: 1px solid var(--border, #e5e5e5);
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 99999;
    `;

    document.body.appendChild(portal);

    // 항목 클릭 이벤트
    portal.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        console.log('[모듈 B] 포탈 항목 클릭:', action, workspaceId);
        this.handleCardAction(workspaceId, action);
        portal.remove();
      });
    });

    console.log('[모듈 B] 드롭다운 포탈 열림');
  }

  handleCardAction(id, action) {
    console.log('[모듈 B] handleCardAction 호출:', { id, action });

    switch (action) {
      case 'rename': {
        const workspace = this.getById(id);
        const newName = prompt('새 이름을 입력하세요:', workspace?.name);
        if (newName && newName.trim()) {
          this.rename(id, newName.trim());
          this.render(this.getAll());
        }
        break;
      }

      case 'duplicate': {
        this.duplicate(id);
        this.render(this.getAll());
        break;
      }

      case 'delete': {
        const workspace = this.getById(id);
        console.log('[모듈 B] 삭제 시도:', { id, name: workspace?.name });
        if (confirm(`"${workspace?.name || id}" 작업공간을 삭제하시겠습니까?`)) {
          // 탭이 열려있으면 먼저 닫기
          if (window.newTabManager?.closeTabByWorkspace) {
            window.newTabManager.closeTabByWorkspace(id);
          }

          const result = this.delete(id);
          console.log('[모듈 B] 삭제 결과:', result);
          if (result) {
            console.log('[모듈 B] 삭제 성공, 목록 새로고침');
            this.render(this.getAll());
          } else {
            console.error('[모듈 B] 삭제 실패');
            alert('작업공간 삭제에 실패했습니다.');
          }
        }
        break;
      }
    }
  }

  openWorkspace(id) {
    const workspace = this.getById(id);
    const name = workspace?.name || '작업공간';

    // NewTabManager가 있으면 탭 생성
    if (window.newTabManager && typeof window.newTabManager.openWorkspace === 'function') {
      console.log('[모듈 B] NewTabManager로 작업공간 열기:', id);
      window.newTabManager.openWorkspace(id, name);
    } else {
      // 폴백: 직접 전환
      console.log('[모듈 B] 폴백 - 직접 작업공간 전환:', id);
      this.goWorkspace(id);
    }
  }

  createWorkspace() {
    const name = prompt('작업공간 이름을 입력하세요:', '새 작업공간');
    if (name && name.trim()) {
      const workspace = this.create(name.trim());
      this.openWorkspace(workspace.id);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 노출
window.ModuleB = new ModuleB();

// 모듈 간 연동을 위한 alias (모듈 C가 이 이름으로 찾음)
window.workspaceManager = window.ModuleB;
window.router = window.ModuleB;

// DOMContentLoaded 시 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.ModuleB.init();
});
