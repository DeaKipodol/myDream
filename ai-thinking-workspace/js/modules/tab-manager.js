// modules/tab-manager.js

import { store } from '../core/store.js';
import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { createTabStateMachine, TAB_STATES } from '../core/state-machine.js';

export class TabManager {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.stateMachines = new Map();
    this._subscriptions = [];

    this._bindEvents();
    this._subscribeEvents();
  }

  // ===== 탭 생성 =====

  createTab(workspaceId, workspaceName) {
    const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const tab = {
      tabId,
      workspaceId,
      workspaceName,
      createdAt: Date.now(),
    };

    // Store에 탭 추가
    store.setState(state => ({
      ...state,
      tabs: [...state.tabs, tab],
    }));

    // 탭 상태 초기화
    store.createTabState(tabId);

    // StateMachine 생성
    this.stateMachines.set(tabId, createTabStateMachine(tabId));

    // 렌더링
    this.render();

    // 이벤트 발행
    EventBus.emit(EVENTS.TAB_CREATED, { tabId, workspaceId, workspaceName });

    // 자동 전환
    this.switchTab(tabId);

    // 데이터 로딩
    this._loadTabData(tabId, workspaceId);

    return tabId;
  }

  // ===== 탭 전환 =====

  switchTab(tabId) {
    const state = store.getState();
    const prevTabId = state.activeTabId;

    if (prevTabId === tabId) return;

    // 이전 탭 상태 저장
    if (prevTabId) {
      this._saveTabUIState(prevTabId);
    }

    // 활성 탭 변경
    store.setState({ activeTabId: tabId });

    // 렌더링
    this.render();

    // 새 탭 UI 상태 복원
    this._restoreTabUIState(tabId);

    // 이벤트 발행
    const tab = state.tabs.find(t => t.tabId === tabId);
    EventBus.emit(EVENTS.TAB_SWITCHED, {
      tabId,
      prevTabId,
      workspaceId: tab?.workspaceId,
      deleted: tab?.deleted || false,
      workspaceName: tab?.workspaceName,
    });
  }

  // ===== 탭 닫기 =====

  closeTab(tabId) {
    const state = store.getState();
    const tab = state.tabs.find(t => t.tabId === tabId);
    if (!tab) return;

    const tabIndex = state.tabs.findIndex(t => t.tabId === tabId);

    // Store에서 제거
    store.setState(state => ({
      ...state,
      tabs: state.tabs.filter(t => t.tabId !== tabId),
    }));
    store.removeTabState(tabId);

    // StateMachine 제거
    this.stateMachines.delete(tabId);

    // 이벤트 발행
    EventBus.emit(EVENTS.TAB_CLOSED, {
      tabId,
      workspaceId: tab.workspaceId,
    });

    // 다른 탭으로 전환
    if (state.activeTabId === tabId) {
      const remainingTabs = store.getState().tabs;
      if (remainingTabs.length > 0) {
        // 인접 탭으로 전환
        const newIndex = Math.min(tabIndex, remainingTabs.length - 1);
        this.switchTab(remainingTabs[newIndex].tabId);
      } else {
        // 탭 없으면 홈으로
        store.setState({ activeTabId: null });
        this._showHome();
      }
    }

    this.render();
  }

  // ===== 작업공간 열기 =====

  openWorkspace(workspaceId, workspaceName) {
    console.log('[TabManager] openWorkspace 호출:', { workspaceId, workspaceName });
    console.log('[TabManager] 현재 탭 목록:', store.getState().tabs);

    // 이미 열려있는지 확인
    const existingTabId = this.findTabByWorkspace(workspaceId);
    console.log('[TabManager] 기존 탭 검색 결과:', existingTabId);

    if (existingTabId) {
      console.log('[TabManager] 기존 탭으로 전환:', existingTabId);
      this.switchTab(existingTabId);
      return existingTabId;
    }

    // 새 탭 생성
    console.log('[TabManager] 새 탭 생성');
    return this.createTab(workspaceId, workspaceName);
  }

  // ===== 조회 =====

  getActiveTabId() {
    return store.getState().activeTabId;
  }

  getActiveWorkspaceId() {
    const { tabs, activeTabId } = store.getState();
    const tab = tabs.find(t => t.tabId === activeTabId);
    return tab?.workspaceId || null;
  }

  getTabs() {
    return store.getState().tabs;
  }

  findTabByWorkspace(workspaceId) {
    const tab = store.getState().tabs.find(t => t.workspaceId === workspaceId);
    return tab?.tabId || null;
  }

  /**
   * 특정 작업공간의 탭 닫기
   */
  closeTabByWorkspace(workspaceId) {
    const tabId = this.findTabByWorkspace(workspaceId);
    if (tabId) {
      console.log('[TabManager] 작업공간 삭제로 탭 닫기:', workspaceId, tabId);
      this.closeTab(tabId);
    }
  }

  /**
   * 특정 작업공간의 탭을 삭제됨 상태로 표시
   */
  markTabAsDeleted(workspaceId) {
    const tabId = this.findTabByWorkspace(workspaceId);
    if (tabId) {
      const tab = store.getState().tabs.find(t => t.tabId === tabId);
      const workspaceName = tab?.workspaceName || '작업공간';
      const currentActiveTabId = store.getState().activeTabId;

      console.log('[TabManager] 작업공간 삭제됨 표시:', {
        workspaceId,
        tabId,
        currentActiveTabId,
        isActiveTab: currentActiveTabId === tabId
      });

      // 탭 상태에 deleted 플래그 추가
      store.setTabState(tabId, { deleted: true });

      // 탭 이름 업데이트
      store.setState(state => ({
        ...state,
        tabs: state.tabs.map(t =>
          t.tabId === tabId
            ? { ...t, deleted: true }
            : t
        )
      }));

      this.render();

      // 현재 활성 탭이면 즉시 삭제됨 메시지 표시
      // 중요: 최신 activeTabId를 다시 확인
      const latestActiveTabId = store.getState().activeTabId;
      if (latestActiveTabId === tabId) {
        console.log('[TabManager] 활성 탭이므로 삭제 메시지 표시');
        EventBus.emit(EVENTS.TAB_SWITCHED, {
          tabId,
          prevTabId: null,
          workspaceId,
          deleted: true,
          workspaceName,
        });
      } else {
        console.log('[TabManager] 활성 탭 아님 - 삭제 메시지 표시 안함');
      }

      // 삭제됨 이벤트 발행
      EventBus.emit(EVENTS.WORKSPACE_DELETED, { workspaceId, tabId });
    }
  }

  /**
   * 탭의 삭제됨 상태 해제 (복구 시)
   */
  unmarkTabAsDeleted(workspaceId) {
    const tabId = this.findTabByWorkspace(workspaceId);
    if (tabId) {
      console.log('[TabManager] 작업공간 복구됨 표시:', workspaceId, tabId);

      // 탭 상태에서 deleted 제거
      const tabState = store.getTabState(tabId);
      if (tabState) {
        delete tabState.deleted;
        store.setTabState(tabId, tabState);
      }

      // 탭에서 deleted 플래그 제거
      store.setState(state => ({
        ...state,
        tabs: state.tabs.map(t =>
          t.tabId === tabId
            ? { ...t, deleted: false }
            : t
        )
      }));

      this.render();
    }
  }

  getTabStatus(tabId) {
    return this.stateMachines.get(tabId)?.getState() || TAB_STATES.IDLE;
  }

  // ===== 복원 =====

  restoreTabs() {
    const { tabs, activeTabId } = store.getState();

    // 탭이 없으면 홈 화면 유지
    if (!tabs || tabs.length === 0) {
      console.log('[TabManager] 복원할 탭 없음 - 홈 화면 유지');
      this.render();
      return;
    }

    // StateMachine 복원
    tabs.forEach(tab => {
      const sm = createTabStateMachine(tab.tabId);
      const tabState = store.getTabState(tab.tabId);
      if (tabState?.status) {
        sm.setState(tabState.status);
      }
      this.stateMachines.set(tab.tabId, sm);
    });

    // 렌더링
    this.render();

    // 활성 탭이 없으면 홈 표시
    if (!activeTabId) {
      console.log('[TabManager] 활성 탭 없음 - 홈 화면 표시');
      this._showHome();
      return;
    }

    // 활성 탭이 있으면 화면 전환
    const tab = tabs.find(t => t.tabId === activeTabId);
    if (tab) {
      this._restoreTabUIState(activeTabId);
      // 화면 전환 이벤트 발행 (deleted 상태 포함)
      EventBus.emit(EVENTS.TAB_SWITCHED, {
        tabId: activeTabId,
        prevTabId: null,
        workspaceId: tab.workspaceId,
        deleted: tab.deleted || false,
        workspaceName: tab.workspaceName,
      });
      console.log('[TabManager] 활성 탭 복원:', tab.workspaceName, '삭제됨:', tab.deleted);
    } else {
      // activeTabId가 있지만 해당 탭이 없으면 홈으로
      console.log('[TabManager] 활성 탭 ID는 있지만 탭 없음 - 홈 화면 표시');
      store.setState({ activeTabId: null });
      this._showHome();
    }
  }

  // ===== 데이터 로딩 =====

  async _loadTabData(tabId, workspaceId) {
    const sm = this.stateMachines.get(tabId);
    if (!sm || !sm.canTransition('LOAD')) return;

    sm.transition('LOAD');
    store.setTabState(tabId, { status: sm.getState(), error: null });

    try {
      // 작업공간 데이터 로드
      const workspace = await this._fetchWorkspace(workspaceId);

      sm.transition('SUCCESS');
      store.setTabState(tabId, {
        status: sm.getState(),
        currentNodeId: workspace.tree?.id || null,
        currentNodeName: workspace.tree?.text || workspace.name,
        nodePath: workspace.tree ? [workspace.tree.id] : [],
      });

    } catch (error) {
      sm.transition('FAIL');
      store.setTabState(tabId, {
        status: sm.getState(),
        error: error.message,
      });
    }
  }

  async _fetchWorkspace(workspaceId) {
    // workspaceStore 사용 (우선)
    if (window.workspaceStore) {
      const workspace = window.workspaceStore.getWorkspace(workspaceId);
      if (!workspace) throw new Error('Workspace not found');
      return workspace;
    }

    // 폴백: 전역 getWorkspaceById 함수 (data.js)
    if (typeof getWorkspaceById === 'function') {
      const workspace = getWorkspaceById(workspaceId);
      if (!workspace) throw new Error('Workspace not found');
      return workspace;
    }

    // 최종 폴백: 더미 데이터 반환
    return {
      id: workspaceId,
      name: `Workspace ${workspaceId}`,
      tree: null
    };
  }

  retryLoad(tabId) {
    const sm = this.stateMachines.get(tabId);
    if (!sm || !sm.canTransition('RETRY')) return;

    sm.transition('RETRY');
    const tab = store.getState().tabs.find(t => t.tabId === tabId);
    if (tab) {
      this._loadTabData(tabId, tab.workspaceId);
    }
  }

  // ===== UI 상태 저장/복원 =====

  _saveTabUIState(tabId) {
    const scrollTop = this._getScrollTop();
    const inputDraft = this._getInputDraft();

    store.setTabState(tabId, { scrollTop, inputDraft });
  }

  _restoreTabUIState(tabId) {
    const tabState = store.getTabState(tabId);
    if (!tabState) return;

    this._setScrollTop(tabState.scrollTop || 0);
    this._setInputDraft(tabState.inputDraft || '');
  }

  _getScrollTop() {
    const chatContainer = document.querySelector('#chat-messages');
    return chatContainer?.scrollTop || 0;
  }

  _setScrollTop(value) {
    const chatContainer = document.querySelector('#chat-messages');
    if (chatContainer) chatContainer.scrollTop = value;
  }

  _getInputDraft() {
    const input = document.querySelector('#chat-input');
    return input?.value || '';
  }

  _setInputDraft(value) {
    const input = document.querySelector('#chat-input');
    if (input) input.value = value;
  }

  _showHome() {
    console.log('[TabManager] Show home - no tabs');
    // 홈 화면 표시
    if (window.ModuleB) {
      window.ModuleB.goHome();
    }
  }

  // ===== 렌더링 =====

  render() {
    const { tabs, activeTabId } = store.getState();

    const tabsHtml = tabs.map(tab => {
      const isActive = tab.tabId === activeTabId;
      const status = this.getTabStatus(tab.tabId);
      const isDeleted = tab.deleted;

      return `
        <div class="tab ${isActive ? 'active' : ''} ${status === 'loading' ? 'loading' : ''} ${isDeleted ? 'deleted' : ''}"
             data-tab-id="${tab.tabId}">
          ${status === 'loading' ? '<span class="tab-spinner"></span>' : ''}
          ${status === 'error' ? '<span class="tab-error">!</span>' : ''}
          ${isDeleted ? '<span class="tab-deleted-icon">🗑️</span>' : ''}
          <span class="tab-name ${isDeleted ? 'strikethrough' : ''}">${tab.workspaceName}</span>
          <button class="tab-close" data-tab-id="${tab.tabId}">×</button>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      ${tabsHtml}
      <button class="tab-new">+</button>
    `;
  }

  // ===== 이벤트 바인딩 =====

  _bindEvents() {
    this.container.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      const closeBtn = e.target.closest('.tab-close');
      const newBtn = e.target.closest('.tab-new');

      if (closeBtn) {
        e.stopPropagation();
        this.closeTab(closeBtn.dataset.tabId);
      } else if (tab) {
        this.switchTab(tab.dataset.tabId);
      } else if (newBtn) {
        EventBus.emit(EVENTS.TAB_NEW_REQUESTED);
      }
    });
  }

  _subscribeEvents() {
    this._subscriptions.push(
      EventBus.on(EVENTS.SIDEPANEL_WORKSPACE_SELECT, ({ workspaceId, workspaceName }) => {
        this.openWorkspace(workspaceId, workspaceName);
      })
    );
  }

  // ===== 정리 =====

  destroy() {
    this._subscriptions.forEach(unsub => unsub());
    this._subscriptions = [];
    this.stateMachines.clear();
  }
}
