/* ========================================
   모듈 초기화 관리자 (통합자 관리)

   이 파일은 모듈 로딩 순서와 초기화를 관리합니다.
   수정이 필요하면 통합자에게 요청하세요.
   ======================================== */

/**
 * 모듈 초기화 순서 및 의존성 정의
 * Phase 순서대로 초기화됩니다.
 */
const MODULE_CONFIG = {
  // Phase 1: 기반 모듈 (의존성 없음, 병렬 초기화 가능)
  phase1: ['module-e', 'module-a', 'module-b'],

  // Phase 2: Phase 1 의존 모듈
  phase2: ['module-c', 'module-d', 'module-f'],

  // Phase 3: 최종 모듈
  phase3: ['module-g']
};

/**
 * 로고 설정 (쉽게 교체 가능하도록 분리)
 * 로고 변경 시 이 설정만 수정하면 됩니다.
 */
const LOGO_CONFIG = {
  // 로고 타입: 'emoji' | 'svg' | 'image'
  type: 'emoji',

  // 이모지 로고 (type: 'emoji'일 때 사용)
  emoji: '🧠',

  // SVG 로고 (type: 'svg'일 때 사용)
  svg: null,  // '<svg>...</svg>' 형태의 문자열

  // 이미지 로고 (type: 'image'일 때 사용)
  imagePath: null,  // 'assets/logo/logo.png'

  // 로고 대체 텍스트
  alt: 'AI 생각 작업공간'
};

/**
 * 로고 HTML 반환
 * @returns {string} 로고 HTML 문자열
 */
function getLogo() {
  switch (LOGO_CONFIG.type) {
    case 'emoji':
      return `<span class="logo-emoji" aria-label="${LOGO_CONFIG.alt}">${LOGO_CONFIG.emoji}</span>`;
    case 'svg':
      return LOGO_CONFIG.svg || '';
    case 'image':
      return `<img src="${LOGO_CONFIG.imagePath}" alt="${LOGO_CONFIG.alt}" class="logo-image" />`;
    default:
      return LOGO_CONFIG.emoji;
  }
}

/**
 * 모듈 레지스트리
 * 각 모듈은 여기에 자신의 init 함수를 등록합니다.
 */
const ModuleRegistry = {
  modules: {},

  /**
   * 모듈 등록
   * @param {string} name - 모듈 이름 (예: 'module-a')
   * @param {object} module - 모듈 객체 (init 함수 필수)
   */
  register(name, module) {
    if (!module.init || typeof module.init !== 'function') {
      console.warn(`[ModuleRegistry] ${name}: init 함수가 없습니다.`);
      return;
    }
    this.modules[name] = module;
    console.log(`[ModuleRegistry] ${name} 등록 완료`);
  },

  /**
   * 모듈 초기화
   * @param {string} name - 모듈 이름
   */
  async initModule(name) {
    const module = this.modules[name];
    if (!module) {
      console.warn(`[ModuleRegistry] ${name}: 등록되지 않은 모듈입니다.`);
      return;
    }

    try {
      await module.init();
      console.log(`[ModuleRegistry] ${name} 초기화 완료`);

      // 모듈 초기화 완료 이벤트 발생
      document.dispatchEvent(new CustomEvent('module:ready', {
        detail: { name }
      }));
    } catch (error) {
      console.error(`[ModuleRegistry] ${name} 초기화 실패:`, error);
    }
  },

  /**
   * 모듈 가져오기
   * @param {string} name - 모듈 이름
   * @returns {object|null} 모듈 객체
   */
  get(name) {
    return this.modules[name] || null;
  }
};

/**
 * 이벤트 버스 - 모듈 간 통신용
 */
const EventBus = {
  /**
   * 이벤트 발행
   * @param {string} eventName - 이벤트 이름
   * @param {object} data - 전달할 데이터
   */
  emit(eventName, data = {}) {
    document.dispatchEvent(new CustomEvent(eventName, {
      detail: data
    }));
  },

  /**
   * 이벤트 구독
   * @param {string} eventName - 이벤트 이름
   * @param {function} callback - 콜백 함수
   */
  on(eventName, callback) {
    document.addEventListener(eventName, (e) => callback(e.detail));
  },

  /**
   * 이벤트 구독 해제
   * @param {string} eventName - 이벤트 이름
   * @param {function} callback - 콜백 함수
   */
  off(eventName, callback) {
    document.removeEventListener(eventName, callback);
  }
};

/**
 * 슬롯에 템플릿 로드
 * @param {string} slotId - 슬롯 ID (예: 'header-slot')
 * @param {string} templatePath - 템플릿 파일 경로
 */
async function loadTemplate(slotId, templatePath) {
  const slot = document.getElementById(slotId);
  if (!slot) {
    console.warn(`[loadTemplate] 슬롯을 찾을 수 없음: ${slotId}`);
    return;
  }

  try {
    const response = await fetch(templatePath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    slot.innerHTML = html;
    console.log(`[loadTemplate] ${slotId} <- ${templatePath}`);
  } catch (error) {
    console.error(`[loadTemplate] 템플릿 로드 실패: ${templatePath}`, error);
  }
}

/**
 * Phase별 모듈 초기화
 * @param {string[]} moduleNames - 초기화할 모듈 이름 배열
 */
async function initPhase(moduleNames) {
  const promises = moduleNames.map(name => ModuleRegistry.initModule(name));
  await Promise.all(promises);
}

/**
 * 전역 모듈 초기화 (ModuleRegistry에 등록되지 않은 모듈 대응)
 * @param {string} name - 모듈 이름 (예: 'module-a' → window.ModuleA)
 */
async function initGlobalModule(name) {
  // module-a → ModuleA 형태로 변환
  const globalName = name.replace('module-', 'Module').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  const module = window[globalName];

  if (module && typeof module.init === 'function' && !module.initialized) {
    try {
      await module.init();
      console.log(`[App] ${globalName} 초기화 완료`);
    } catch (error) {
      console.error(`[App] ${globalName} 초기화 실패:`, error);
    }
  }
}

/**
 * Phase별 모듈 초기화 (확장: ModuleRegistry + 전역 모듈)
 * @param {string[]} moduleNames - 초기화할 모듈 이름 배열
 */
async function initPhaseExtended(moduleNames) {
  const promises = moduleNames.map(async (name) => {
    // 1. ModuleRegistry에 등록된 경우 우선 사용
    if (ModuleRegistry.modules[name]) {
      return ModuleRegistry.initModule(name);
    }
    // 2. 전역 모듈 초기화 시도
    return initGlobalModule(name);
  });
  await Promise.all(promises);
}

/**
 * 전체 초기화 실행
 */
async function initializeApp() {
  console.log('[App] 모듈 초기화 시작...');

  // ===== WorkspaceStore 먼저 초기화 (다른 모듈보다 먼저!) =====
  try {
    const { workspaceStore } = await import('./core/workspace-store.js');
    workspaceStore.init();
    window.workspaceStore = workspaceStore;
    console.log('[App] WorkspaceStore 초기화 완료 (Phase 0)');

    // ModuleB가 이미 init되었다면 목록 다시 렌더링
    if (window.ModuleB && window.ModuleB.initialized) {
      console.log('[App] ModuleB 목록 재렌더링...');
      window.ModuleB.render(window.ModuleB.getAll());
    }
  } catch (e) {
    console.error('[App] WorkspaceStore 초기화 실패:', e);
  }

  // Phase 1 초기화 (병렬)
  console.log('[App] Phase 1 초기화...');
  await initPhaseExtended(MODULE_CONFIG.phase1);

  // Phase 2 초기화 (병렬)
  console.log('[App] Phase 2 초기화...');
  await initPhaseExtended(MODULE_CONFIG.phase2);

  // Phase 3 초기화 (병렬)
  console.log('[App] Phase 3 초기화...');
  await initPhaseExtended(MODULE_CONFIG.phase3);

  console.log('[App] 모든 모듈 초기화 완료');

  // 레거시 탭 매니저 비활성화 (NewTabManager로 대체됨)
  // if (window.TabManager) {
  //   window.tabManager = new TabManager();
  //   window.tabManager.init();
  //   console.log('[App] TabManager 초기화 완료');
  // }

  // ===== 새 모듈 시스템 초기화 (Core + UI) =====
  await initNewModules();

  // 앱 준비 완료 이벤트
  EventBus.emit('app:ready');
}

/**
 * 새 모듈 시스템 초기화 (Core + UI 모듈)
 * 순서가 중요합니다!
 */
async function initNewModules() {
  console.log('[App] 새 모듈 시스템 초기화...');

  try {
    // Core 모듈 import (workspaceStore는 이미 Phase 0에서 초기화됨)
    const { store } = await import('./core/store.js');
    const { EventBus: CoreEventBus } = await import('./core/event-bus.js');
    const { EVENTS } = await import('./core/events.js');
    const { workspaceStore } = await import('./core/workspace-store.js');
    const { aiClient } = await import('./core/ai-client.js');

    // 개발 모드에서 로깅 활성화
    CoreEventBus.enableLogging(true);

    // Store hydrate (localStorage에서 복원)
    store.hydrate();

    // AI Client 전역 노출 (chat.js에서 사용)
    window.aiClient = aiClient;
    console.log('[App] Core 모듈 로드 완료 (aiClient 포함)');

    // UI 모듈 import
    const { AppHeader } = await import('./modules/app-header.js');
    const { TabManager: NewTabManager } = await import('./modules/tab-manager.js');
    const { SidePanel } = await import('./modules/side-panel.js');
    const { ChatHeader } = await import('./modules/chat-header.js');
    const { EdgeDock } = await import('./modules/edge-dock.js');
    console.log('[App] UI 모듈 로드 완료');

    // DOM 요소 확인
    const appHeaderEl = document.querySelector('#app-header');
    const sidePanelEl = document.querySelector('#side-panel');
    const sidePanelOverlay = document.querySelector('#side-panel-overlay');
    const chatHeaderEl = document.querySelector('#chat-header');
    const edgeDockLeft = document.querySelector('#edge-dock-left');
    const edgeDockRight = document.querySelector('#edge-dock-right');
    const dockPanelContainer = document.querySelector('#dock-panel-container');

    // 1. AppHeader - 임시 비활성화 (레거시 헤더와 충돌 방지)
    // TODO: 레거시 드롭다운(module-d)과 통합 후 활성화
    // if (appHeaderEl) {
    //   window.appHeader = new AppHeader('#app-header');
    //   window.appHeader.render();
    //   console.log('[App] AppHeader 초기화 완료');
    // }

    // 대신 기존 헤더에 탭 컨테이너만 추가 (header-left와 header-right 사이)
    const headerRight = document.querySelector('.header-right');
    if (headerRight && !document.querySelector('#tab-container')) {
      const tabContainer = document.createElement('div');
      tabContainer.id = 'tab-container';
      tabContainer.className = 'ah-tabs';
      headerRight.parentNode.insertBefore(tabContainer, headerRight);
    }

    // 2. SidePanel (AppHeader의 햄버거에서 사용)
    if (sidePanelEl && sidePanelOverlay) {
      window.sidePanel = new SidePanel('#side-panel', '#side-panel-overlay');
      window.sidePanel.render();
      console.log('[App] SidePanel 초기화 완료');

      // 햄버거 버튼 연결
      const hamburgerBtn = document.getElementById('hamburger-btn');
      if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
          window.sidePanel.toggle();
        });
        console.log('[App] 햄버거 버튼 연결 완료');
      }
    }

    // 3. 탭 전환 핸들러 먼저 등록 (restoreTabs 전에!)
    CoreEventBus.on(EVENTS.TAB_SWITCHED, ({ tabId, workspaceId, deleted, workspaceName }) => {
      if (deleted) {
        // 삭제된 작업공간 탭 - 삭제됨 메시지 표시
        console.log('[App] 삭제된 작업공간 탭:', workspaceId);
        if (window.chatManager?.renderDeletedState) {
          window.chatManager.renderDeletedState(workspaceName, workspaceId);
        }
        // 홈으로 가지 않고 workspace-view는 그대로 표시
        if (window.ModuleB) {
          window.ModuleB.homeView?.setAttribute('hidden', '');
          window.ModuleB.workspaceView?.removeAttribute('hidden');
        }
        return;
      }

      if (workspaceId) {
        // WorkspaceStore 현재 작업공간 업데이트
        workspaceStore.setCurrentWorkspace(workspaceId);

        // 레거시 뷰 전환 (app.renderWorkspace()가 treeManager와 chatManager 동기화)
        if (window.ModuleB) {
          window.ModuleB.goWorkspace(workspaceId);
          console.log('[App] 뷰 전환:', workspaceId);
        }
      }
    });

    // 4. TabManager (AppHeader가 만든 #tab-container 사용)
    const tabContainer = document.querySelector('#tab-container');
    if (tabContainer) {
      // 탭 상태와 workspaceStore 동기화 (존재하지 않는 작업공간 탭 제거)
      const { tabs } = store.getState();
      if (tabs && tabs.length > 0) {
        const validTabs = tabs.filter(tab => {
          const exists = workspaceStore.hasWorkspace(tab.workspaceId);
          if (!exists) {
            console.log('[App] 존재하지 않는 작업공간 탭 제거:', tab.workspaceId);
          }
          return exists;
        });
        if (validTabs.length !== tabs.length) {
          store.setState(state => ({
            ...state,
            tabs: validTabs,
            activeTabId: validTabs.length > 0 ? validTabs[0].tabId : null
          }));
          console.log('[App] 탭 상태 정리 완료:', validTabs.length, '개 유효');
        }
      }

      window.newTabManager = new NewTabManager('#tab-container');
      window.newTabManager.restoreTabs();
      console.log('[App] NewTabManager 초기화 완료');
    }

    // 4. ChatHeader
    if (chatHeaderEl) {
      window.chatHeader = new ChatHeader('#chat-header');
      window.chatHeader.render();
      console.log('[App] ChatHeader 초기화 완료');
    }

    // 5. EdgeDock - 비활성화 (레거시 app.js가 edge-dock 제어)
    // 새 모듈 시스템의 EdgeDock은 dock-panel-container를 사용하지만,
    // 레거시 시스템은 #sidebar, #panel을 사용하므로 충돌 방지를 위해 비활성화
    // if (edgeDockLeft && edgeDockRight) {
    //   window.edgeDock = new EdgeDock('#edge-dock-left', '#edge-dock-right', '#dock-panel-container');
    //   window.edgeDock.render();
    //   console.log('[App] EdgeDock 초기화 완료');
    // }
    console.log('[App] EdgeDock 모듈 비활성화됨 - 레거시 app.js 사용');

    // 6. ChatHeader 이벤트 브릿지 설정 (새 모듈 → 레거시 연결)
    setupChatHeaderBridge(CoreEventBus, EVENTS);

    // beforeunload에서 상태 저장
    window.addEventListener('beforeunload', () => {
      store.persist();
      workspaceStore.persist();
      CoreEventBus.emit(EVENTS.APP_BEFORE_UNLOAD);
    });

    // 초기화 완료 이벤트
    CoreEventBus.emit(EVENTS.APP_INITIALIZED);
    console.log('[App] 새 모듈 시스템 초기화 완료!');

  } catch (error) {
    console.error('[App] 새 모듈 초기화 실패:', error);
  }
}

/**
 * DOM 로드 후 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
  initializeApp().catch(error => {
    console.error('[App] 초기화 중 오류 발생:', error);
  });
});

// 전역 노출 (모듈에서 사용)
window.ModuleRegistry = ModuleRegistry;
window.EventBus = EventBus;
window.LOGO_CONFIG = LOGO_CONFIG;
window.getLogo = getLogo;
window.loadTemplate = loadTemplate;

/**
 * ChatHeader 이벤트 브릿지 설정
 * 새 모듈 시스템(ChatHeader)의 이벤트를 레거시 시스템(app.js)과 연결
 *
 * @param {Object} CoreEventBus - Core 이벤트 버스
 * @param {Object} EVENTS - 이벤트 상수
 */
function setupChatHeaderBridge(CoreEventBus, EVENTS) {
  console.log('[Bridge] ChatHeader 이벤트 브릿지 설정...');

  // 1. 노드 클릭 → 사이드바(트리) 열기
  CoreEventBus.on(EVENTS.CHATHEADER_NAVIGATE, ({ nodeId }) => {
    console.log('[Bridge] CHATHEADER_NAVIGATE:', nodeId);

    // 레거시 사이드바 열기 (트리 표시)
    if (window.app && !window.app.panels.sidebar.expanded) {
      window.app.toggleSidebar();
    }

    // 트리에서 해당 노드 강조
    if (window.treeManager && nodeId) {
      window.treeManager.setActiveNode(nodeId);
    }
  });

  // 2. 분기 버튼 클릭 → 포크뷰 열기
  CoreEventBus.on(EVENTS.CHATHEADER_BRANCH, ({ nodeId }) => {
    console.log('[Bridge] CHATHEADER_BRANCH:', nodeId);

    // 레거시 포크뷰 열기
    if (window.app) {
      window.app.openForkView();
    }
  });

  // 3. 메뉴 액션 → 해당 기능 실행
  CoreEventBus.on(EVENTS.CHATHEADER_MENU, ({ nodeId, action }) => {
    console.log('[Bridge] CHATHEADER_MENU:', action, nodeId);

    switch (action) {
      case 'rename':
        // 노드 이름 변경 (prompt 사용)
        const newName = prompt('새 이름 입력:');
        if (newName && newName.trim() && window.workspaceStore) {
          const workspace = window.workspaceStore.getCurrentWorkspace();
          if (workspace && workspace.tree) {
            // 트리에서 노드 찾아서 이름 변경
            const node = findNodeInTree(workspace.tree, nodeId);
            if (node) {
              node.text = newName.trim();

              // conversation.question도 업데이트 (대화 내용과 동기화)
              if (node.conversation) {
                node.conversation.question = newName.trim();
              }

              window.workspaceStore.updateTree(workspace.id, workspace.tree);

              // 트리 UI 업데이트
              if (window.treeManager) {
                window.treeManager.render(workspace);
              }

              // 현재 노드라면 채팅 UI도 업데이트
              if (workspace.currentNode === nodeId) {
                // 채팅 헤더 제목 업데이트
                CoreEventBus.emit(EVENTS.NODE_CHANGED, {
                  nodeId: nodeId,
                  nodeName: newName.trim()
                });

                // 채팅 화면도 업데이트
                if (window.chatManager) {
                  window.chatManager.switchToNode(nodeId);
                }
              }

              console.log('[Bridge] 노드 이름 변경됨:', nodeId, '->', newName.trim());
            }
          }
        }
        break;
      case 'checkpoint':
        // 체크포인트 저장
        alert('체크포인트 저장됨: ' + nodeId);
        // TODO: 실제 체크포인트 저장 로직 구현
        break;
      case 'delete':
        // 노드 삭제 확인
        if (confirm('이 노드를 삭제하시겠습니까?')) {
          if (window.treeManager && window.treeManager.deleteNode) {
            window.treeManager.deleteNode(nodeId);
          }
        }
        break;
    }
  });

  // 4. NODE_SWITCHED 이벤트 → 모든 뷰 동기화 (실시간 동기화)
  CoreEventBus.on(EVENTS.NODE_SWITCHED, ({ workspaceId, nodeId }) => {
    console.log('[Bridge] NODE_SWITCHED:', nodeId);

    // 1. 트리 뷰 업데이트
    if (window.treeManager) {
      window.treeManager.setActiveNode(nodeId);
    }

    // 2. 채팅 뷰 업데이트
    if (window.chatManager && window.chatManager.switchToNode) {
      window.chatManager.switchToNode(nodeId);
    }

    // 3. 포크뷰가 열려있으면 업데이트
    const forkOverlay = document.getElementById('fork-view-overlay');
    console.log('[Bridge] 포크뷰 체크:', {
      forkOverlay: !!forkOverlay,
      visible: forkOverlay?.classList.contains('visible'),
      d3TreeView: !!window.d3TreeView
    });

    if (forkOverlay && forkOverlay.classList.contains('visible') && window.d3TreeView) {
      const workspace = window.workspaceStore?.getCurrentWorkspace();
      console.log('[Bridge] 포크뷰 업데이트 시도:', { workspace: !!workspace, tree: !!workspace?.tree });
      if (workspace?.tree) {
        window.d3TreeView.render(workspace.tree, nodeId, workspace.previousNode);
        console.log('[Bridge] 포크뷰 render 호출 완료');
      }
    }

    // 4. ChatHeader 업데이트 (현재 노드 표시)
    if (window.chatHeader) {
      const workspace = window.workspaceStore?.getCurrentWorkspace();
      if (workspace?.tree) {
        const node = findNodeInTree(workspace.tree, nodeId);
        if (node) {
          window.chatHeader.setCurrentNode(nodeId, node.text);
        }
      }
    }
  });

  console.log('[Bridge] ChatHeader 이벤트 브릿지 설정 완료');
  console.log('[Bridge] NODE_SWITCHED 동기화 설정 완료');
}

/**
 * 트리에서 노드 찾기 (재귀)
 * @param {Object} node - 트리 노드
 * @param {string} targetId - 찾을 노드 ID
 * @returns {Object|null} 찾은 노드 또는 null
 */
function findNodeInTree(node, targetId) {
  if (!node) return null;
  if (node.id === targetId) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeInTree(child, targetId);
      if (found) return found;
    }
  }
  return null;
}
