// ========================================
// 메인 앱 - AI 생각 작업공간
// ========================================

class App {
  constructor() {
    this.panels = {
      sidebar: { element: null, expanded: false, width: 260, position: 'left' },
      panel: { element: null, expanded: false, width: 300, currentTab: 'perspectives', position: 'right' }
    };
    this.resizing = null;
    this.dragging = null;
    this.dropZones = { left: null, right: null };
    // 활성 탭 컨테이너 참조 (탭 시스템용)
    this.activeContainer = document;
    this.activeTabId = null;
    // 캐싱된 요소 참조
    this.els = {};
    this.init();
  }

  // 탭 스코핑 가능한 요소 조회
  _el(id) {
    if (this.activeTabId && this.activeContainer) {
      const scoped = this.activeContainer.querySelector(`#${id}--${this.activeTabId}`);
      if (scoped) return scoped;
    }
    return document.getElementById(id);
  }

  // 활성 탭의 DOM 컨테이너에 바인딩
  bindToActiveTab(container, tabId) {
    this.activeContainer = container || document;
    this.activeTabId = tabId || null;

    // 패널 요소 캐싱
    this.panels.sidebar.element = this._el('sidebar');
    this.panels.panel.element = this._el('panel');
    this.dropZones.left = this._el('drop-zone-left');
    this.dropZones.right = this._el('drop-zone-right');
    this.resizeHandles = {
      left: this._el('resize-sidebar'),
      right: this._el('resize-panel')
    };

    // 자주 사용하는 요소 캐싱
    this.els.edgeDockLeft = this._el('edge-dock-left');
    this.els.edgeDockRight = this._el('edge-dock-right');
    this.els.dockTree = this._el('dock-tree');
    this.els.dockExpand = this._el('dock-expand');
    this.els.panelCloseBtn = this._el('panel-close-btn');
    this.els.panelSwitchBtn = this._el('panel-switch-btn');
    this.els.sidebarCloseBtn = this._el('sidebar-close-btn');
    this.els.panelCurrentIcon = this._el('panel-current-icon');
    this.els.panelTitle = this._el('panel-title');

    // 탭 전환 시 토글 이벤트 재바인딩
    if (tabId) {
      this.rebindToggleEvents();
    }
  }

  // 탭 전환 시 토글 이벤트 재바인딩 (새 컨테이너의 요소에)
  rebindToggleEvents() {
    const dockTree = this.els.dockTree;
    const edgeDockLeft = this.els.edgeDockLeft;
    const dockExpand = this.els.dockExpand;
    const edgeDockRight = this.els.edgeDockRight;

    if (dockTree) {
      // 기존 리스너 제거를 위해 클론 교체
      const newDockTree = dockTree.cloneNode(true);
      dockTree.parentNode.replaceChild(newDockTree, dockTree);
      this.els.dockTree = newDockTree;
      newDockTree.addEventListener('click', () => this.toggleSidebar());
    }

    if (dockExpand && edgeDockRight) {
      const newDockExpand = dockExpand.cloneNode(true);
      dockExpand.parentNode.replaceChild(newDockExpand, dockExpand);
      this.els.dockExpand = newDockExpand;
      newDockExpand.addEventListener('click', (e) => {
        e.stopPropagation();
        edgeDockRight.classList.toggle('menu-open');
      });
    }

    // 미니 메뉴 항목 (활성 탭 컨테이너 내에서)
    const root = this.activeContainer || document;
    const menuItems = root.querySelectorAll('.edge-dock-menu-item');
    menuItems.forEach(item => {
      const newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);
      newItem.addEventListener('click', (e) => {
        e.stopPropagation();
        const panelType = newItem.dataset.panel;
        this.openPanel(panelType);
        if (edgeDockRight) edgeDockRight.classList.remove('menu-open');
        menuItems.forEach(m => m.classList?.remove('active'));
        newItem.classList.add('active');
      });
    });

    // 패널 닫기 버튼
    const closeBtn = this.els.panelCloseBtn;
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      this.els.panelCloseBtn = newCloseBtn;
      newCloseBtn.addEventListener('click', () => {
        this.closePanel('panel');
        this.updateEdgeDockVisibility();
      });
    }

    // 패널 전환 버튼
    const switchBtn = this.els.panelSwitchBtn;
    if (switchBtn) {
      const newSwitchBtn = switchBtn.cloneNode(true);
      switchBtn.parentNode.replaceChild(newSwitchBtn, switchBtn);
      this.els.panelSwitchBtn = newSwitchBtn;
      newSwitchBtn.addEventListener('click', () => {
        const switchTo = newSwitchBtn.dataset.switchTo;
        this.switchPanelTab(switchTo);
      });
    }

    // 사이드바 닫기 버튼
    const sidebarCloseBtn = this.els.sidebarCloseBtn;
    if (sidebarCloseBtn) {
      const newSCB = sidebarCloseBtn.cloneNode(true);
      sidebarCloseBtn.parentNode.replaceChild(newSCB, sidebarCloseBtn);
      this.els.sidebarCloseBtn = newSCB;
      newSCB.addEventListener('click', () => {
        this.closePanel('sidebar');
        this.updateEdgeDockVisibility();
      });
    }

    // 패널 상태 초기화
    this.updateEdgeDockVisibility();
    this.updatePanelPosition('sidebar');
    this.updatePanelPosition('panel');
    this.updateEdgeDockPosition();
  }

  init() {
    // 기본 (비탭) 모드에서 요소 바인딩
    this.bindToActiveTab(document, null);

    // 초기 위치 설정
    this.updatePanelPosition('sidebar');
    this.updatePanelPosition('panel');
    this.updateEdgeDockPosition();

    // 초기 작업공간 렌더링
    this.renderWorkspace();

    // 토글 이벤트 바인딩
    this.bindToggleEvents();

    // 리사이즈 이벤트 바인딩
    this.bindResizeEvents();

    // 드래그 이벤트 바인딩
    this.bindDragEvents();

    // 네비게이션 이벤트
    this.bindNavEvents();

    // 설정 모달 이벤트
    this.bindSettingsEvents();

    // 포크 뷰 이벤트
    this.bindForkViewEvents();

    // 트리 노드 클릭 이벤트 → NODE_SWITCHED 이벤트로 동기화
    treeManager.onNodeClick = (nodeId) => {
      console.log('[App] 트리 노드 클릭:', nodeId);

      // workspaceStore.setCurrentNode()가 NODE_SWITCHED 이벤트 발생
      // → _init.js의 이벤트 핸들러가 모든 뷰를 동기화
      if (window.workspaceStore) {
        const workspace = window.workspaceStore.getCurrentWorkspace();
        if (workspace) {
          window.workspaceStore.setCurrentNode(workspace.id, nodeId);
        }
      }
    };

    // 분기 버튼 클릭 이벤트 → NODE_SWITCHED 이벤트로 동기화
    chatManager.onBranchClick = (branchId) => {
      console.log('[App] 분기 클릭:', branchId);

      // 트리와 동일하게 workspaceStore 통해 이벤트 발생
      if (window.workspaceStore) {
        const workspace = window.workspaceStore.getCurrentWorkspace();
        if (workspace) {
          window.workspaceStore.setCurrentNode(workspace.id, branchId);
        }
      }
    };

    console.log('AI 생각 작업공간이 시작되었습니다!');
  }

  // 드래그 이벤트 바인딩 (헤더 드래그 비활성화 — 설정 모달에서 처리)
  bindDragEvents() {
    this.dropPreviews = {
      left: document.getElementById('drop-preview-left'),
      right: document.getElementById('drop-preview-right')
    };
    this.dragStartX = 0;
    this.dragPending = null;
    this.dragging = null;
  }

  moveToPosition(type, position) {
    const panel = this.panels[type];
    const otherType = type === 'sidebar' ? 'panel' : 'sidebar';
    const otherPanel = this.panels[otherType];
    
    // 같은 위치면 무시
    if (panel.position === position) return;
    
    // 다른 패널이 같은 위치에 있으면 교체
    if (otherPanel.position === position && otherPanel.expanded) {
      otherPanel.position = panel.position;
      this.updatePanelPosition(otherType);
    }
    
    panel.position = position;
    this.updatePanelPosition(type);
  }

  updatePanelPosition(type) {
    const panel = this.panels[type];
    const element = panel.element;
    if (!element) return;

    // 위치 클래스 업데이트
    element.classList.remove('position-left', 'position-right');
    
    if (type === 'sidebar') {
      if (panel.position === 'right') {
        element.classList.add('position-right');
      }
    } else {
      if (panel.position === 'left') {
        element.classList.add('position-left');
      }
    }
    
    console.log(`Panel ${type} position updated to: ${panel.position}`);
  }

  // 리사이즈 이벤트 바인딩
  bindResizeEvents() {
    const sidebarHandle = document.getElementById('resize-sidebar');
    const panelHandle = document.getElementById('resize-panel');
    
    // 사이드바 리사이즈
    if (sidebarHandle) {
      sidebarHandle.addEventListener('mousedown', (e) => {
        if (!this.panels.sidebar.expanded) return;
        this.startResize(e, 'sidebar');
      });
    }
    
    // 패널 리사이즈
    if (panelHandle) {
      panelHandle.addEventListener('mousedown', (e) => {
        if (!this.panels.panel.expanded) return;
        this.startResize(e, 'panel');
      });
    }
    
    // 전역 마우스 이벤트
    document.addEventListener('mousemove', (e) => this.onResize(e));
    document.addEventListener('mouseup', () => this.stopResize());
  }

  startResize(e, type) {
    e.preventDefault();
    this.resizing = type;
    document.body.classList.add('resizing');
    const handle = this._el(`resize-${type === 'sidebar' ? 'sidebar' : 'panel'}`);
    if (handle) handle.classList.add('active');
  }

  onResize(e) {
    if (!this.resizing) return;
    
    const minWidth = 200;
    const maxWidth = 450;
    
    if (this.resizing === 'sidebar') {
      const sidebar = this.panels.sidebar;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX));
      sidebar.width = newWidth;
      sidebar.element.style.width = `${newWidth}px`;
    } else if (this.resizing === 'panel') {
      const panel = this.panels.panel;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, window.innerWidth - e.clientX));
      panel.width = newWidth;
      panel.element.style.width = `${newWidth}px`;
    }
  }

  stopResize() {
    if (!this.resizing) return;
    document.body.classList.remove('resizing');
    document.querySelectorAll('.resize-handle').forEach(h => h.classList.remove('active'));
    this.resizing = null;
  }

  // 엣지 독 이벤트 바인딩
  bindToggleEvents() {
    // 좌측 엣지 독: 🌳 트리 (1-tap)
    const dockTree = document.getElementById('dock-tree');
    const edgeDockLeft = document.getElementById('edge-dock-left');

    if (dockTree) {
      dockTree.addEventListener('click', () => {
        this.toggleSidebar();
      });
    }

    // 우측 엣지 독: 💡 관점 도구 (2-tap 폴더)
    const dockExpand = document.getElementById('dock-expand');
    const edgeDockRight = document.getElementById('edge-dock-right');

    if (dockExpand) {
      dockExpand.addEventListener('click', (e) => {
        e.stopPropagation();
        edgeDockRight.classList.toggle('menu-open');
      });
    }

    // 미니 메뉴 항목 클릭
    const menuItems = document.querySelectorAll('.edge-dock-menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const panelType = item.dataset.panel;
        this.openPanel(panelType);
        edgeDockRight.classList.remove('menu-open');

        // 메뉴 항목 active 표시
        menuItems.forEach(m => m.classList.remove('active'));
        item.classList.add('active');
      });
    });

    // 패널 닫기 버튼
    const closeBtn = document.getElementById('panel-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closePanel('panel');
        this.updateEdgeDockVisibility();
        document.querySelectorAll('.edge-dock-menu-item').forEach(m => m.classList.remove('active'));
      });
    }

    // 패널 전환 버튼
    const switchBtn = document.getElementById('panel-switch-btn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        const switchTo = switchBtn.dataset.switchTo;
        this.switchPanelTab(switchTo);
      });
    }

    // 사이드바 닫기 버튼
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    if (sidebarCloseBtn) {
      sidebarCloseBtn.addEventListener('click', () => {
        this.closePanel('sidebar');
        this.updateEdgeDockVisibility();
      });
    }

    // 바깥 클릭으로 미니 메뉴 닫기
    document.addEventListener('click', (e) => {
      if (edgeDockRight && !edgeDockRight.contains(e.target)) {
        edgeDockRight.classList.remove('menu-open');
      }
    });
  }

  // 사이드바 토글 (1-tap)
  toggleSidebar() {
    const sidebar = this.panels.sidebar;
    sidebar.expanded = !sidebar.expanded;
    const dockBtn = this.els.dockTree || this._el('dock-tree');

    if (sidebar.expanded) {
      sidebar.element.classList.remove('collapsed');
      sidebar.element.classList.add('expanded');
      sidebar.element.style.width = `${sidebar.width}px`;
      if (dockBtn) dockBtn.classList.add('active');
    } else {
      sidebar.element.classList.remove('expanded');
      sidebar.element.classList.add('collapsed');
      sidebar.element.style.width = '';
      if (dockBtn) dockBtn.classList.remove('active');
    }

    this.updateEdgeDockVisibility();
  }

  // 패널 열기 (엣지 독 메뉴에서 호출)
  openPanel(panelType) {
    const panel = this.panels.panel;

    panel.expanded = true;
    panel.currentTab = panelType;
    panel.element.classList.remove('collapsed');
    panel.element.classList.add('expanded');
    panel.element.style.width = `${panel.width}px`;

    // 패널 헤더 업데이트
    this.updatePanelHeader(panelType);

    // 콘텐츠 표시 (모듈 5: 최신 상태 반영을 위해 renderPerspectives 호출)
    if (panelType === 'perspectives') {
      panelManager.renderPerspectives(getWorkspace());
    } else {
      panelManager.showSources();
    }

    this.updateEdgeDockVisibility();
  }

  // 패널 탭 전환 (패널 내부 전환 버튼에서 호출)
  switchPanelTab(panelType) {
    const panel = this.panels.panel;
    panel.currentTab = panelType;

    // 패널 헤더 업데이트
    this.updatePanelHeader(panelType);

    // 콘텐츠 표시
    if (panelType === 'perspectives') {
      panelManager.showPerspectives();
    } else {
      panelManager.showSources();
    }
  }

  // 패널 헤더 업데이트 (아이콘, 제목, 전환 버튼)
  updatePanelHeader(currentType) {
    const icon = this.els.panelCurrentIcon || this._el('panel-current-icon');
    const title = this.els.panelTitle || this._el('panel-title');
    const switchBtn = this.els.panelSwitchBtn || this._el('panel-switch-btn');

    if (currentType === 'perspectives') {
      if (icon) icon.textContent = '🎭';
      if (title) title.textContent = '조언자';
      if (switchBtn) {
        switchBtn.dataset.switchTo = 'sources';
        switchBtn.querySelector('.panel-switch-icon').textContent = '📄';
        switchBtn.querySelector('.panel-switch-name').textContent = '문서';
      }
    } else {
      if (icon) icon.textContent = '📄';
      if (title) title.textContent = '문서';
      if (switchBtn) {
        switchBtn.dataset.switchTo = 'perspectives';
        switchBtn.querySelector('.panel-switch-icon').textContent = '🎭';
        switchBtn.querySelector('.panel-switch-name').textContent = '조언자';
      }
    }
  }


  // 패널 닫기
  closePanel(type) {
    const panel = this.panels[type];
    panel.expanded = false;
    panel.element.classList.remove('expanded');
    panel.element.classList.add('collapsed');
    panel.element.style.width = '';
    this.updateEdgeDockVisibility();
  }

  // 엣지 독 표시/숨김 (패널 열릴 때 독 숨기기)
  updateEdgeDockVisibility() {
    const edgeLeft = this.els.edgeDockLeft || this._el('edge-dock-left');
    const edgeRight = this.els.edgeDockRight || this._el('edge-dock-right');

    if (edgeLeft) {
      // 사이드바 열리면 독 숨김 (헤더 클릭으로 닫기)
      edgeLeft.classList.toggle('hidden', this.panels.sidebar.expanded);
    }
    if (edgeRight) {
      edgeRight.classList.toggle('hidden', this.panels.panel.expanded);
    }
  }

  // 작업공간 렌더링
  renderWorkspace() {
    console.log('[App] renderWorkspace 시작');

    // workspaceStore 우선 사용 (목업 + 사용자 통합)
    let workspace = null;
    if (window.workspaceStore && typeof window.workspaceStore.getCurrentWorkspace === 'function') {
      workspace = window.workspaceStore.getCurrentWorkspace();
    }
    // 폴백: 기존 data.js
    if (!workspace && typeof getWorkspace === 'function') {
      workspace = getWorkspace();
    }

    console.log('[App] workspace 데이터:', workspace ? {
      id: workspace.id,
      name: workspace.name || workspace.title,
      hasTree: !!workspace.tree,
      hasMessages: !!workspace.messages
    } : null);

    if (!workspace) {
      console.error('[App] workspace가 없습니다!');
      return;
    }

    // name/title 호환성 (workspaceStore는 name, data.js는 title)
    const workspaceTitle = workspace.name || workspace.title;

    // 사이드바 제목 업데이트
    const root = (this.activeTabId && this.activeContainer) ? this.activeContainer : document;
    const sidebarIcon = root.querySelector('.sidebar-icon');
    const sidebarTitle = root.querySelector('.sidebar-title');
    if (sidebarIcon) sidebarIcon.textContent = workspace.icon;
    if (sidebarTitle) sidebarTitle.textContent = workspaceTitle;

    // 각 영역 렌더링
    console.log('[App] 매니저 상태:', {
      treeManager: !!treeManager,
      chatManager: !!chatManager,
      panelManager: !!panelManager
    });

    try {
      treeManager.render(workspace);
      console.log('[App] treeManager.render 완료');
    } catch (e) {
      console.error('[App] treeManager.render 오류:', e);
    }

    try {
      // currentNode가 있으면 해당 노드의 대화를 표시, 없으면 messages 배열 표시
      if (workspace.currentNode && chatManager.switchToNode) {
        chatManager.switchToNode(workspace.currentNode);
        console.log('[App] chatManager.switchToNode 완료:', workspace.currentNode);
      } else {
        chatManager.render(workspace);
        console.log('[App] chatManager.render 완료');
      }
    } catch (e) {
      console.error('[App] chatManager 오류:', e);
    }

    try {
      panelManager.render(workspace);
      console.log('[App] panelManager.render 완료');
    } catch (e) {
      console.error('[App] panelManager.render 오류:', e);
    }

    console.log('[App] renderWorkspace 완료');
  }

  // 작업공간 전환 이벤트 (탭바 제거됨 - 드롭다운으로 대체)
  bindNavEvents() {
    // 탭바가 모듈 A에서 제거되고 드롭다운으로 대체됨
    // 작업공간 전환은 WorkspaceSelector 및 모듈 C에서 처리
  }

  // 레이아웃 모달 (settings-btn은 모듈 D가 처리)
  bindSettingsEvents() {
    // settings-btn 이벤트는 모듈 D(설정 드롭다운)가 처리
    // 레이아웃 모달은 추후 설정 드롭다운에서 접근 가능하도록 변경

    const overlay = document.getElementById('layout-modal-overlay');
    const closeBtn = document.getElementById('layout-modal-close');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeLayoutModal());
    }
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeLayoutModal();
      });
    }

    // 모달 내 드래그
    this.bindLayoutDrag();
  }

  openLayoutModal() {
    const overlay = document.getElementById('layout-modal-overlay');
    overlay.classList.add('visible');

    // 현재 위치에 맞게 박스 배치
    this.syncLayoutBoxes();
  }

  closeLayoutModal() {
    const overlay = document.getElementById('layout-modal-overlay');
    overlay.classList.remove('visible');
  }

  // 모달 박스를 현재 패널 위치에 맞게 배치
  syncLayoutBoxes() {
    const slotLeft = document.getElementById('layout-slot-left');
    const slotRight = document.getElementById('layout-slot-right');
    const boxSidebar = document.getElementById('layout-box-sidebar');
    const boxPanel = document.getElementById('layout-box-panel');

    // 기존 박스 제거
    if (boxSidebar.parentElement) boxSidebar.remove();
    if (boxPanel.parentElement) boxPanel.remove();

    // 위치에 따라 배치
    if (this.panels.sidebar.position === 'left') {
      slotLeft.appendChild(boxSidebar);
      slotRight.appendChild(boxPanel);
    } else {
      slotLeft.appendChild(boxPanel);
      slotRight.appendChild(boxSidebar);
    }
  }

  // 모달 내 드래그 로직
  bindLayoutDrag() {
    const boxes = document.querySelectorAll('.layout-box[draggable]');
    const slots = [document.getElementById('layout-slot-left'), document.getElementById('layout-slot-right')];

    boxes.forEach(box => {
      box.addEventListener('dragstart', (e) => {
        box.classList.add('dragging');
        e.dataTransfer.setData('text/plain', box.dataset.panel);
        e.dataTransfer.effectAllowed = 'move';
      });

      box.addEventListener('dragend', () => {
        box.classList.remove('dragging');
        slots.forEach(s => s.classList.remove('drag-over'));
      });
    });

    slots.forEach(slot => {
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        slot.classList.add('drag-over');
      });

      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });

      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');

        const panelType = e.dataTransfer.getData('text/plain');
        const box = document.getElementById(`layout-box-${panelType}`);
        const targetPosition = slot.dataset.position;

        if (!box || !targetPosition) return;

        // 이미 같은 슬롯이면 무시
        if (box.parentElement === slot) return;

        // 기존 슬롯에 있던 박스와 교체
        const otherBox = slot.querySelector('.layout-box[draggable]');
        const sourceSlot = box.parentElement;

        if (otherBox && sourceSlot) {
          sourceSlot.appendChild(otherBox);
        }
        slot.appendChild(box);

        // 즉시 반영
        this.applyLayoutFromModal();
      });
    });
  }

  // 모달 배치를 실제 앱에 반영
  applyLayoutFromModal() {
    const slotLeft = document.getElementById('layout-slot-left');
    const leftBox = slotLeft.querySelector('.layout-box[draggable]');

    if (leftBox) {
      const leftPanel = leftBox.dataset.panel; // 'sidebar' or 'panel'
      const rightPanel = leftPanel === 'sidebar' ? 'panel' : 'sidebar';

      this.panels[leftPanel].position = 'left';
      this.panels[rightPanel].position = 'right';

      this.updatePanelPosition(leftPanel);
      this.updatePanelPosition(rightPanel);
      this.updateEdgeDockPosition();
    }
  }

  // 엣지 독 위치를 패널 위치에 동기화
  updateEdgeDockPosition() {
    const edgeLeft = this.els.edgeDockLeft || this._el('edge-dock-left');
    const edgeRight = this.els.edgeDockRight || this._el('edge-dock-right');

    if (edgeLeft) {
      edgeLeft.classList.remove('dock-left', 'dock-right');
      edgeLeft.classList.add(this.panels.sidebar.position === 'left' ? 'dock-left' : 'dock-right');
    }
    if (edgeRight) {
      edgeRight.classList.remove('dock-left', 'dock-right');
      edgeRight.classList.add(this.panels.panel.position === 'right' ? 'dock-right' : 'dock-left');
    }
  }

  // 포크 뷰 이벤트 바인딩
  bindForkViewEvents() {
    const forkViewBtn = document.getElementById('fork-view-btn');
    const overlay = document.getElementById('fork-view-overlay');
    const closeBtn = document.getElementById('fork-view-close-btn');

    if (forkViewBtn) {
      forkViewBtn.addEventListener('click', () => this.openForkView());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeForkView());
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeForkView();
      });

      // ESC 키로 닫기
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('visible')) {
          this.closeForkView();
        }
      });
    }

    // 줌 버튼
    document.getElementById('fork-zoom-in')?.addEventListener('click', () => {
      if (d3TreeView) d3TreeView.zoomIn();
    });
    document.getElementById('fork-zoom-out')?.addEventListener('click', () => {
      if (d3TreeView) d3TreeView.zoomOut();
    });
    document.getElementById('fork-zoom-reset')?.addEventListener('click', () => {
      if (d3TreeView) d3TreeView.zoomReset();
    });
  }

  // 포크 뷰 열기
  openForkView() {
    const overlay = document.getElementById('fork-view-overlay');
    overlay.classList.add('visible');

    // D3TreeView 초기화 및 렌더링
    const treeView = initD3TreeView('fork-view-canvas');

    // 현재 작업공간 데이터 가져오기 (workspaceStore 우선 사용)
    let workspace = null;
    if (window.workspaceStore) {
      workspace = window.workspaceStore.getCurrentWorkspace();
    }
    // 폴백: 기존 data.js
    if (!workspace && typeof getWorkspace === 'function') {
      workspace = getWorkspace();
    }

    if (!workspace || !workspace.tree) {
      console.error('[ForkView] workspace 또는 tree가 없습니다');
      return;
    }

    const currentNodeId = workspace.currentNode || null;
    const previousNodeId = workspace.previousNode || null;

    // 트리 렌더링
    treeView.render(workspace.tree, currentNodeId, previousNodeId);

    // 노드 클릭 이벤트 (싱글 클릭: 시각적 활성화만)
    treeView.onNodeClick = (nodeId) => {
      // workspace 다시 가져오기
      let ws = null;
      if (window.workspaceStore) {
        ws = window.workspaceStore.getCurrentWorkspace();
      }
      if (!ws && typeof getWorkspace === 'function') {
        ws = getWorkspace();
      }
      if (!ws) return;

      const previousNodeId = ws.currentNode;

      // 포크 뷰에서 시각적으로만 업데이트 (데이터 변경 X)
      treeView.render(ws.tree, nodeId, previousNodeId);
    };

    // 노드 더블 클릭 이벤트 (더블 클릭: 실제 대화 이동)
    treeView.onNodeDoubleClick = (nodeId) => {
      // workspace 가져오기
      let ws = null;
      if (window.workspaceStore) {
        ws = window.workspaceStore.getCurrentWorkspace();
      }
      if (!ws && typeof getWorkspace === 'function') {
        ws = getWorkspace();
      }
      if (!ws) return;

      // 이전 노드 저장
      ws.previousNode = ws.currentNode;

      // 포크 뷰 닫기
      this.closeForkView();

      // workspaceStore.setCurrentNode()가 NODE_SWITCHED 이벤트 발생
      // → 모든 뷰(트리, 채팅, ChatHeader) 자동 동기화
      if (window.workspaceStore) {
        window.workspaceStore.setCurrentNode(ws.id, nodeId);
      }
    };
  }

  // 포크 뷰 닫기
  closeForkView() {
    const overlay = document.getElementById('fork-view-overlay');
    overlay.classList.remove('visible');
  }
}

// 모듈 A 코드 → js/module-a-header.js로 분리됨

// 앱 시작
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
