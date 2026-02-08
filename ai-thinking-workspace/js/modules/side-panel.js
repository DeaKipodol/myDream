// modules/side-panel.js

import { store } from '../core/store.js';
import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';

/**
 * SidePanel - 좌측 슬라이드 패널
 *
 * 역할:
 * - 작업공간 탐색
 * - 검색
 * - 설정 접근
 */

export class SidePanel {
  /**
   * @param {string} containerSelector - 패널 컨테이너 selector
   * @param {string} overlaySelector - 오버레이 selector
   */
  constructor(containerSelector, overlaySelector) {
    this.container = document.querySelector(containerSelector);
    this.overlay = document.querySelector(overlaySelector);
    this.searchQuery = '';
    this._subscriptions = [];

    this._bindEvents();
    this._subscribeEvents();
  }

  // ===== 열기/닫기 =====

  /**
   * 사이드패널 열기
   */
  open() {
    const { sidePanel } = store.getState();
    if (sidePanel.isOpen) return;

    // Store 업데이트
    store.setState(state => ({
      ...state,
      sidePanel: { ...state.sidePanel, isOpen: true }
    }));

    // UI 업데이트
    this.container?.classList.add('open');
    this.overlay?.classList.add('visible');

    // 이벤트 발행
    EventBus.emit(EVENTS.SIDEPANEL_OPEN);

    // 포커스
    const searchInput = this.container?.querySelector('.sp-search-input');
    if (searchInput) searchInput.focus();
  }

  /**
   * 사이드패널 닫기
   */
  close() {
    const { sidePanel } = store.getState();
    if (!sidePanel.isOpen) return;

    // Store 업데이트
    store.setState(state => ({
      ...state,
      sidePanel: { ...state.sidePanel, isOpen: false }
    }));

    // UI 업데이트
    this.container?.classList.remove('open');
    this.overlay?.classList.remove('visible');

    // 검색어 초기화
    this.searchQuery = '';
    const searchInput = this.container?.querySelector('.sp-search-input');
    if (searchInput) searchInput.value = '';

    // 이벤트 발행
    EventBus.emit(EVENTS.SIDEPANEL_CLOSE);
  }

  /**
   * 사이드패널 토글
   */
  toggle() {
    const { sidePanel } = store.getState();
    sidePanel.isOpen ? this.close() : this.open();
  }

  /**
   * 열림 상태 확인
   * @returns {boolean}
   */
  isOpen() {
    return store.getState().sidePanel.isOpen;
  }

  // ===== 렌더링 =====

  /**
   * 전체 렌더링
   */
  render() {
    if (!this.container) return;

    const workspaces = this._getWorkspaces();
    const currentWorkspaceId = this._getCurrentWorkspaceId();

    this.container.innerHTML = `
      <!-- 검색 -->
      <div class="sp-search">
        <input type="text"
               class="sp-search-input"
               placeholder="검색..."
               value="${this.searchQuery}" />
      </div>

      <!-- 작업공간 섹션 -->
      <div class="sp-section">
        <h3 class="sp-section-title">작업공간</h3>
        <ul class="sp-workspace-list">
          ${this._renderWorkspaceList(workspaces, currentWorkspaceId)}
        </ul>
      </div>

      <!-- 하단 고정 -->
      <div class="sp-footer">
        <button class="sp-footer-item" data-action="settings">
          <span class="sp-icon">⚙️</span>
          <span>설정</span>
        </button>
        <div class="sp-account">
          <div class="sp-avatar">DK</div>
          <div class="sp-account-info">
            <span class="sp-account-name">사용자</span>
            <span class="sp-account-plan">Free Plan</span>
          </div>
        </div>
      </div>
    `;

    // 검색 입력 이벤트 재바인딩
    this._bindSearchEvents();
  }

  /**
   * 작업공간 목록 렌더링
   * @private
   */
  _renderWorkspaceList(workspaces, currentWorkspaceId) {
    // 검색 필터
    const filtered = this.searchQuery
      ? workspaces.filter(ws =>
          ws.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
      : workspaces;

    const listHtml = filtered.map(ws => `
      <li class="sp-workspace-item ${ws.id === currentWorkspaceId ? 'active' : ''}"
          data-workspace-id="${ws.id}"
          data-workspace-name="${ws.name}">
        <span class="sp-workspace-name">${ws.name}</span>
      </li>
    `).join('');

    return listHtml + `
      <li class="sp-workspace-item sp-new-workspace">
        <span>+ 새 작업공간</span>
      </li>
    `;
  }

  /**
   * 작업공간 목록 업데이트 (부분 렌더링)
   * @param {Array} workspaces
   * @param {string} currentWorkspaceId
   */
  renderWorkspaces(workspaces, currentWorkspaceId) {
    const listEl = this.container?.querySelector('.sp-workspace-list');
    if (listEl) {
      listEl.innerHTML = this._renderWorkspaceList(workspaces, currentWorkspaceId);
    }
  }

  // ===== 데이터 조회 =====

  /**
   * 작업공간 목록 가져오기 (workspaceStore 통합)
   * @private
   */
  _getWorkspaces() {
    // workspaceStore 우선 사용 (목업 + 사용자 통합)
    if (window.workspaceStore && typeof window.workspaceStore.getWorkspaceList === 'function') {
      return window.workspaceStore.getWorkspaceList();
    }
    // 폴백: 기존 data.js
    return typeof getWorkspaces === 'function' ? getWorkspaces() : [];
  }

  /**
   * 현재 활성 탭의 작업공간 ID
   * @private
   */
  _getCurrentWorkspaceId() {
    const { tabs, activeTabId } = store.getState();
    const activeTab = tabs.find(t => t.tabId === activeTabId);
    return activeTab?.workspaceId || null;
  }

  // ===== 이벤트 핸들러 =====

  /**
   * 작업공간 클릭 핸들러
   * @private
   */
  _onWorkspaceClick(workspaceId, workspaceName) {
    // 이벤트 발행 (TabManager가 구독)
    EventBus.emit(EVENTS.SIDEPANEL_WORKSPACE_SELECT, {
      workspaceId,
      workspaceName
    });

    // 패널 닫기
    this.close();
  }

  /**
   * 새 작업공간 클릭 핸들러
   * @private
   */
  _onNewWorkspace() {
    const name = prompt('작업공간 이름을 입력하세요:', '새 작업공간');
    if (!name || !name.trim()) return;

    // workspaceStore로 작업공간 생성
    if (window.workspaceStore?.createWorkspace) {
      const workspace = window.workspaceStore.createWorkspace(name.trim());
      console.log('[SidePanel] 작업공간 생성:', workspace);

      // 목록 새로고침
      this.renderWorkspaces(this._getWorkspaces(), this._getCurrentWorkspaceId());

      // 새 작업공간 열기
      EventBus.emit(EVENTS.SIDEPANEL_WORKSPACE_SELECT, {
        workspaceId: workspace.id,
        workspaceName: workspace.name
      });

      this.close();
    } else if (window.ModuleB?.createWorkspace) {
      // 폴백: ModuleB 사용
      window.ModuleB.createWorkspace();
      this.close();
    }
  }

  /**
   * 설정 클릭 핸들러
   * @private
   */
  _onSettings() {
    // TODO: 설정 화면으로 이동
    console.log('Open settings');
    this.close();
  }

  /**
   * 검색 입력 핸들러
   * @private
   */
  _onSearch(query) {
    this.searchQuery = query;
    this.renderWorkspaces(this._getWorkspaces(), this._getCurrentWorkspaceId());
  }

  // ===== 이벤트 바인딩 =====

  /**
   * DOM 이벤트 바인딩
   * @private
   */
  _bindEvents() {
    // 오버레이 클릭 → 닫기
    this.overlay?.addEventListener('click', () => this.close());

    // 패널 내부 클릭
    this.container?.addEventListener('click', (e) => {
      // 작업공간 클릭
      const wsItem = e.target.closest('.sp-workspace-item:not(.sp-new-workspace)');
      if (wsItem) {
        const { workspaceId, workspaceName } = wsItem.dataset;
        this._onWorkspaceClick(workspaceId, workspaceName);
        return;
      }

      // 새 작업공간
      if (e.target.closest('.sp-new-workspace')) {
        this._onNewWorkspace();
        return;
      }

      // 설정
      if (e.target.closest('[data-action="settings"]')) {
        this._onSettings();
        return;
      }
    });

    // ESC 키
    this._escHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  /**
   * 검색 입력 이벤트 바인딩
   * @private
   */
  _bindSearchEvents() {
    const searchInput = this.container?.querySelector('.sp-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._onSearch(e.target.value);
      });
    }
  }

  /**
   * EventBus 구독
   * @private
   */
  _subscribeEvents() {
    // 새 탭 요청 시 열기
    this._subscriptions.push(
      EventBus.on(EVENTS.TAB_NEW_REQUESTED, () => this.open())
    );

    // 작업공간 생성/삭제/복구 시 목록 새로고침
    this._subscriptions.push(
      EventBus.on(EVENTS.WORKSPACE_CREATED, () => {
        if (this.isOpen()) {
          this.renderWorkspaces(this._getWorkspaces(), this._getCurrentWorkspaceId());
        }
      })
    );

    this._subscriptions.push(
      EventBus.on(EVENTS.WORKSPACE_DELETED, () => {
        if (this.isOpen()) {
          this.renderWorkspaces(this._getWorkspaces(), this._getCurrentWorkspaceId());
        }
      })
    );

    this._subscriptions.push(
      EventBus.on(EVENTS.WORKSPACE_RESTORED, () => {
        if (this.isOpen()) {
          this.renderWorkspaces(this._getWorkspaces(), this._getCurrentWorkspaceId());
        }
      })
    );

    // Store 변경 감지 (작업공간 목록 업데이트 등)
    this._subscriptions.push(
      store.subscribe((state, prevState) => {
        // 활성 탭 변경 시 현재 작업공간 하이라이트 업데이트
        if (state.activeTabId !== prevState.activeTabId) {
          if (this.isOpen()) {
            this.renderWorkspaces(this._getWorkspaces(), this._getCurrentWorkspaceId());
          }
        }
      })
    );
  }

  // ===== 정리 =====

  /**
   * 이벤트 리스너 정리
   */
  destroy() {
    this._subscriptions.forEach(unsub => unsub());
    this._subscriptions = [];
    document.removeEventListener('keydown', this._escHandler);
  }
}

/* ========================================
   사용 예시 (통합 시)
   ========================================

// 초기화
const sidePanel = new SidePanel('#side-panel', '#side-panel-overlay');
sidePanel.render();

// 열기/닫기
sidePanel.open();
sidePanel.close();
sidePanel.toggle();

// 상태 확인
console.log(sidePanel.isOpen());

// 정리
sidePanel.destroy();

*/
