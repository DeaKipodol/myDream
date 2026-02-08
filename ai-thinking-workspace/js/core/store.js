// core/store.js

const STORAGE_KEY = 'myDream_appState';

const initialState = {
  tabs: [],
  activeTabId: null,
  sidePanel: { isOpen: false },
  edgeDock: {
    isVisible: true,
    activePanel: null,
    leftItems: [
      { id: 'tree', icon: '🌳', label: '트리', panelId: 'tree' },
      { id: 'workspace', icon: '📁', label: '작업공간', panelId: 'workspace' },
    ],
    rightItems: [
      { id: 'advisor', icon: '🎭', label: '조언자', panelId: 'advisor' },
      { id: 'docs', icon: '📄', label: '문서', panelId: 'docs' },
    ],
  },
  tabStates: {},
  isInitialized: false,
  lastSavedAt: null,
};

const initialTabState = {
  status: 'idle',
  error: null,
  currentNodeId: null,
  currentNodeName: '',
  nodePath: [],
  scrollTop: 0,
  inputDraft: '',
  invitedExperts: [],
};

class Store {
  constructor() {
    this.state = this._deepClone(initialState);
    this.listeners = [];
  }

  // ===== 읽기 =====

  getState() {
    return this.state;
  }

  getTabState(tabId) {
    return this.state.tabStates[tabId];
  }

  getActiveTabState() {
    const { activeTabId } = this.state;
    return activeTabId ? this.state.tabStates[activeTabId] : undefined;
  }

  // ===== 쓰기 =====

  setState(updater) {
    const prevState = this.state;

    if (typeof updater === 'function') {
      this.state = updater(prevState);
    } else {
      this.state = { ...prevState, ...updater };
    }

    this.state.lastSavedAt = Date.now();
    this._notify(prevState);
  }

  setTabState(tabId, updater) {
    const prevTabState = this.state.tabStates[tabId] || initialTabState;

    let newTabState;
    if (typeof updater === 'function') {
      newTabState = updater(prevTabState);
    } else {
      newTabState = { ...prevTabState, ...updater };
    }

    this.setState(state => ({
      ...state,
      tabStates: {
        ...state.tabStates,
        [tabId]: newTabState,
      },
    }));
  }

  createTabState(tabId) {
    this.setTabState(tabId, this._deepClone(initialTabState));
  }

  removeTabState(tabId) {
    this.setState(state => {
      const { [tabId]: removed, ...rest } = state.tabStates;
      return { ...state, tabStates: rest };
    });
  }

  reset() {
    const prevState = this.state;
    this.state = this._deepClone(initialState);
    this._notify(prevState);
  }

  // ===== 구독 =====

  subscribe(listener) {
    this.listeners.push(listener);

    // unsubscribe 함수 반환
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  _notify(prevState) {
    this.listeners.forEach(listener => {
      try {
        listener(this.state, prevState);
      } catch (error) {
        console.error('[Store] Listener error:', error);
      }
    });
  }

  // ===== 영속성 =====

  persist() {
    try {
      const serializable = this._getSerializableState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('[Store] Persist error:', error);
    }
  }

  hydrate() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = this._mergeWithInitial(parsed);
        this.state.isInitialized = true;
      }
    } catch (error) {
      console.error('[Store] Hydrate error:', error);
      this.reset();
    }
  }

  clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
  }

  _getSerializableState() {
    // 저장에 불필요한 것 제외
    const { isInitialized, ...rest } = this.state;
    return rest;
  }

  _mergeWithInitial(saved) {
    // 새 필드가 추가되었을 때 대비
    return {
      ...initialState,
      ...saved,
      edgeDock: {
        ...initialState.edgeDock,
        ...saved.edgeDock,
      },
      sidePanel: {
        ...initialState.sidePanel,
        ...saved.sidePanel,
      },
    };
  }

  // ===== 유틸 =====

  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

// 싱글톤 인스턴스
export const store = new Store();

// 디버깅용 전역 노출 (개발 모드)
if (typeof window !== 'undefined') {
  window.__store = store;
}
