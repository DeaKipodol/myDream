// modules/edge-dock.js
// 04: EdgeDock - 좌우 가장자리 빠른 접근 독

import { store } from '../core/store.js';
import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';

/**
 * EdgeDock 클래스
 * 화면 좌우 가장자리의 빠른 접근 독
 * 사이드패널과 상호작용하며, 사용자 커스텀 가능
 */
export class EdgeDock {
  /**
   * @param {string} leftSelector - 좌측 독 CSS 셀렉터
   * @param {string} rightSelector - 우측 독 CSS 셀렉터
   * @param {string} panelContainerSelector - 패널 컨테이너 CSS 셀렉터
   */
  constructor(leftSelector, rightSelector, panelContainerSelector) {
    this.leftContainer = document.querySelector(leftSelector);
    this.rightContainer = document.querySelector(rightSelector);
    this.panelContainer = document.querySelector(panelContainerSelector);
    this._subscriptions = [];

    this._bindEvents();
    this._subscribeEvents();
  }

  // ===== 표시/숨김 =====

  /**
   * 독 표시
   */
  show() {
    const { edgeDock } = store.getState();
    if (edgeDock.isVisible) return;

    store.setState(state => ({
      ...state,
      edgeDock: { ...state.edgeDock, isVisible: true }
    }));

    if (this.leftContainer) this.leftContainer.classList.remove('hidden');
    if (this.rightContainer) this.rightContainer.classList.remove('hidden');

    EventBus.emit(EVENTS.EDGEDOCK_SHOW, {});
  }

  /**
   * 독 숨김 (열린 패널도 닫음)
   */
  hide() {
    const { edgeDock } = store.getState();
    if (!edgeDock.isVisible) return;

    // 열린 패널 먼저 닫기
    if (edgeDock.activePanel) {
      this.closePanel();
    }

    store.setState(state => ({
      ...state,
      edgeDock: { ...state.edgeDock, isVisible: false }
    }));

    if (this.leftContainer) this.leftContainer.classList.add('hidden');
    if (this.rightContainer) this.rightContainer.classList.add('hidden');

    EventBus.emit(EVENTS.EDGEDOCK_HIDE, {});
  }

  /**
   * 독 표시 여부 반환
   * @returns {boolean}
   */
  isVisible() {
    return store.getState().edgeDock.isVisible;
  }

  // ===== 패널 관리 =====

  /**
   * 패널 열기 (같은 패널이면 닫기)
   * @param {string} panelId - 패널 ID ('tree', 'workspace', 'advisor', 'docs')
   */
  openPanel(panelId) {
    const { edgeDock } = store.getState();

    // 같은 패널이면 닫기
    if (edgeDock.activePanel === panelId) {
      this.closePanel();
      return;
    }

    // 기존 패널 UI 닫기
    if (edgeDock.activePanel) {
      this._hidePanelUI(edgeDock.activePanel);
    }

    // Store 업데이트
    store.setState(state => ({
      ...state,
      edgeDock: { ...state.edgeDock, activePanel: panelId }
    }));

    // UI 업데이트
    this._showPanelUI(panelId);
    this.render();

    EventBus.emit(EVENTS.EDGEDOCK_PANEL_OPEN, { panelId });
  }

  /**
   * 열린 패널 닫기
   */
  closePanel() {
    const { edgeDock } = store.getState();
    if (!edgeDock.activePanel) return;

    const closedPanelId = edgeDock.activePanel;

    // UI 업데이트
    this._hidePanelUI(closedPanelId);

    // Store 업데이트
    store.setState(state => ({
      ...state,
      edgeDock: { ...state.edgeDock, activePanel: null }
    }));

    this.render();

    EventBus.emit(EVENTS.EDGEDOCK_PANEL_CLOSE, { panelId: closedPanelId });
  }

  /**
   * 패널 토글 (열려있으면 닫고, 닫혀있으면 열기)
   * @param {string} panelId
   */
  togglePanel(panelId) {
    const { edgeDock } = store.getState();
    if (edgeDock.activePanel === panelId) {
      this.closePanel();
    } else {
      this.openPanel(panelId);
    }
  }

  /**
   * 현재 활성 패널 ID 반환
   * @returns {string | null}
   */
  getActivePanel() {
    return store.getState().edgeDock.activePanel;
  }

  /**
   * 패널 UI 표시 (내부 메서드)
   * @private
   * @param {string} panelId
   */
  _showPanelUI(panelId) {
    const panelEl = this.panelContainer?.querySelector(`[data-panel="${panelId}"]`);
    if (panelEl) {
      panelEl.classList.add('open');
      // 컨테이너도 표시
      this.panelContainer?.classList.add('visible');
    }
  }

  /**
   * 패널 UI 숨김 (내부 메서드)
   * @private
   * @param {string} panelId
   */
  _hidePanelUI(panelId) {
    const panelEl = this.panelContainer?.querySelector(`[data-panel="${panelId}"]`);
    if (panelEl) {
      panelEl.classList.remove('open');
    }
    // 열린 패널이 없으면 컨테이너도 숨김
    const hasOpenPanel = this.panelContainer?.querySelector('.dock-panel.open');
    if (!hasOpenPanel) {
      this.panelContainer?.classList.remove('visible');
    }
  }

  // ===== 커스텀 아이템 =====

  /**
   * 독에 아이템 추가
   * @param {'left' | 'right'} side - 추가할 독 위치
   * @param {Object} item - 아이템 객체 { id, icon, label, panelId }
   */
  addItem(side, item) {
    if (side !== 'left' && side !== 'right') {
      console.error('[EdgeDock] Invalid side:', side);
      return;
    }

    // 아이템 유효성 검증
    if (!item.id || !item.icon || !item.label || !item.panelId) {
      console.error('[EdgeDock] Invalid item:', item);
      return;
    }

    const key = side === 'left' ? 'leftItems' : 'rightItems';

    store.setState(state => ({
      ...state,
      edgeDock: {
        ...state.edgeDock,
        [key]: [...state.edgeDock[key], item]
      }
    }));

    this.render();
    EventBus.emit(EVENTS.EDGEDOCK_ITEM_ADDED, { side, item });
  }

  /**
   * 독에서 아이템 제거
   * @param {string} itemId - 제거할 아이템 ID
   */
  removeItem(itemId) {
    const { edgeDock } = store.getState();

    // 양쪽에서 찾아서 제거
    const newLeftItems = edgeDock.leftItems.filter(i => i.id !== itemId);
    const newRightItems = edgeDock.rightItems.filter(i => i.id !== itemId);

    // 변경사항이 없으면 리턴
    if (
      newLeftItems.length === edgeDock.leftItems.length &&
      newRightItems.length === edgeDock.rightItems.length
    ) {
      console.warn('[EdgeDock] Item not found:', itemId);
      return;
    }

    store.setState(state => ({
      ...state,
      edgeDock: {
        ...state.edgeDock,
        leftItems: newLeftItems,
        rightItems: newRightItems
      }
    }));

    this.render();
    EventBus.emit(EVENTS.EDGEDOCK_ITEM_REMOVED, { itemId });
  }

  /**
   * 독의 아이템 목록 반환
   * @param {'left' | 'right'} side
   * @returns {Array}
   */
  getItems(side) {
    const { edgeDock } = store.getState();
    return side === 'left' ? [...edgeDock.leftItems] : [...edgeDock.rightItems];
  }

  // ===== 렌더링 =====

  /**
   * 양쪽 독 렌더링
   */
  render() {
    const { edgeDock } = store.getState();

    this._renderSide(this.leftContainer, edgeDock.leftItems, edgeDock.activePanel);
    this._renderSide(this.rightContainer, edgeDock.rightItems, edgeDock.activePanel);
  }

  /**
   * 한쪽 독 렌더링 (내부 메서드)
   * 레거시 CSS (.edge-dock-btn)와 호환되도록 렌더링
   * @private
   * @param {HTMLElement} container
   * @param {Array} items
   * @param {string | null} activePanel
   */
  _renderSide(container, items, activePanel) {
    if (!container) return;

    // 레거시 CSS 클래스 사용 (style.css의 .edge-dock-btn과 호환)
    const itemsHtml = items.map(item => `
      <button class="edge-dock-btn ${activePanel === item.panelId ? 'active' : ''}"
              data-panel-id="${item.panelId}"
              aria-label="${item.label}">
        <span class="edge-dock-icon">${item.icon}</span>
        <span class="edge-dock-label">${item.label}</span>
      </button>
    `).join('');

    container.innerHTML = itemsHtml;
  }

  // ===== 이벤트 바인딩 =====

  /**
   * DOM 이벤트 바인딩 (내부 메서드)
   * @private
   */
  _bindEvents() {
    // 좌측 독 클릭
    if (this.leftContainer) {
      this.leftContainer.addEventListener('click', (e) => {
        this._handleDockClick(e, 'left');
      });
    }

    // 우측 독 클릭
    if (this.rightContainer) {
      this.rightContainer.addEventListener('click', (e) => {
        this._handleDockClick(e, 'right');
      });
    }
  }

  /**
   * 독 클릭 핸들러 (내부 메서드)
   * @private
   * @param {Event} e
   * @param {'left' | 'right'} side
   */
  _handleDockClick(e, side) {
    const item = e.target.closest('.edge-dock-btn');
    if (!item) return;

    const panelId = item.dataset.panelId;
    if (panelId) {
      this.togglePanel(panelId);
    }
  }

  /**
   * + 버튼 클릭 핸들러 (내부 메서드)
   * @private
   * @param {'left' | 'right'} side
   */
  _onAddClick(side) {
    // TODO: 커스텀 아이템 추가 UI (Part B에서 구현)
    console.log('[EdgeDock] Add item to', side);
  }

  /**
   * EventBus 이벤트 구독 (내부 메서드)
   * @private
   */
  _subscribeEvents() {
    // 사이드패널 열림 → 독 숨김
    this._subscriptions.push(
      EventBus.on(EVENTS.SIDEPANEL_OPEN, () => {
        this.hide();
      })
    );

    // 사이드패널 닫힘 → 독 표시
    this._subscriptions.push(
      EventBus.on(EVENTS.SIDEPANEL_CLOSE, () => {
        this.show();
      })
    );

    // 채팅헤더 노드 클릭 → 트리 패널 열기
    this._subscriptions.push(
      EventBus.on(EVENTS.CHATHEADER_NAVIGATE, () => {
        if (this.isVisible()) {
          this.openPanel('tree');
        }
      })
    );

    // 탭 전환 시 패널 닫기 (선택적)
    this._subscriptions.push(
      EventBus.on(EVENTS.TAB_SWITCHED, () => {
        // UX 결정: 탭 전환 시 패널 유지 vs 닫기
        // 현재는 유지 (주석 처리)
        // this.closePanel();
      })
    );
  }

  // ===== 정리 =====

  /**
   * 구독 해제 및 정리
   */
  destroy() {
    this._subscriptions.forEach(unsub => unsub());
    this._subscriptions = [];
  }
}
