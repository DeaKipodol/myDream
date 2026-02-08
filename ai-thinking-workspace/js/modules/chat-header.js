/**
 * 모듈 03: ChatHeader
 *
 * 채팅 영역 상단에 현재 노드 정보 표시 및 액션 제공
 *
 * @module modules/chat-header
 */

import { store } from '../core/store.js';
import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { TAB_STATES } from '../core/state-machine.js';

export class ChatHeader {
  /**
   * @param {string} containerSelector - DOM 셀렉터 (예: '#chat-header')
   */
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      throw new Error(`ChatHeader: ${containerSelector} 요소를 찾을 수 없습니다.`);
    }

    this.menuEl = null;
    this.menuOpen = false;
    this._subscriptions = [];
    this._outsideClickHandler = null;

    this._subscribeEvents();
  }

  // ===== 노드 정보 =====

  /**
   * 현재 노드 정보 설정
   * @param {string} nodeId - 노드 ID
   * @param {string} nodeName - 노드 이름
   */
  setCurrentNode(nodeId, nodeName) {
    const activeTabId = store.getState().activeTabId;
    if (!activeTabId) return;

    store.setTabState(activeTabId, {
      currentNodeId: nodeId,
      currentNodeName: nodeName
    });

    this.render();
  }

  /**
   * 현재 노드 ID 조회
   * @returns {string | null}
   */
  getCurrentNodeId() {
    const tabState = store.getActiveTabState();
    return tabState?.currentNodeId || null;
  }

  /**
   * 현재 노드 이름 조회
   * @returns {string}
   */
  getCurrentNodeName() {
    const tabState = store.getActiveTabState();
    return tabState?.currentNodeName || '';
  }

  // ===== 렌더링 =====

  /**
   * 헤더 렌더링 (상태별 UI)
   */
  render() {
    const tabState = store.getActiveTabState();
    const { activeTabId } = store.getState();

    // 탭 없으면 숨김
    if (!activeTabId || !tabState) {
      this.hide();
      return;
    }

    const { currentNodeId, currentNodeName, status } = tabState;

    // 로딩 중이면 스켈레톤
    if (status === TAB_STATES.LOADING) {
      this.container.innerHTML = `
        <div class="ch-skeleton">
          <div class="ch-skeleton-text"></div>
        </div>
      `;
      this.container.classList.remove('hidden');
      return;
    }

    // 에러 상태
    if (status === TAB_STATES.ERROR) {
      this.container.innerHTML = `
        <div class="ch-error">
          <span class="ch-error-icon">⚠️</span>
          <span class="ch-error-text">데이터를 불러오지 못했습니다</span>
        </div>
      `;
      this.container.classList.remove('hidden');
      return;
    }

    // 정상 상태
    this.container.innerHTML = `
      <button class="ch-node-btn">
        <span class="ch-node-icon">📍</span>
        <span class="ch-node-name">${this._escapeHtml(currentNodeName || '노드 없음')}</span>
      </button>

      <div class="ch-actions">
        <button class="ch-branch-btn" title="새 분기 만들기">
          <span>+ 분기</span>
        </button>
        <button class="ch-more-btn" title="더보기">
          <span>···</span>
        </button>
      </div>

      <!-- 더보기 메뉴 -->
      <div class="ch-menu ${this.menuOpen ? '' : 'hidden'}">
        <button class="ch-menu-item" data-action="rename">이름 변경</button>
        <button class="ch-menu-item" data-action="checkpoint">체크포인트 저장</button>
        <div class="ch-menu-divider"></div>
        <button class="ch-menu-item ch-menu-danger" data-action="delete">삭제</button>
      </div>
    `;

    this.menuEl = this.container.querySelector('.ch-menu');
    this.container.classList.remove('hidden');

    this._bindEvents();
  }

  // ===== 표시/숨김 =====

  /**
   * 헤더 표시
   */
  show() {
    this.container.classList.remove('hidden');
  }

  /**
   * 헤더 숨김 (홈 화면에서 사용)
   */
  hide() {
    this.container.classList.add('hidden');
  }

  // ===== 메뉴 =====

  /**
   * 더보기 메뉴 토글
   * @private
   */
  _toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (this.menuEl) {
      this.menuEl.classList.toggle('hidden', !this.menuOpen);
    }
  }

  /**
   * 메뉴 닫기
   * @private
   */
  _closeMenu() {
    this.menuOpen = false;
    if (this.menuEl) {
      this.menuEl.classList.add('hidden');
    }
  }

  // ===== 이벤트 핸들러 =====

  /**
   * 노드명 클릭 핸들러 (트리 열기)
   * @private
   */
  _onNodeClick() {
    const nodeId = this.getCurrentNodeId();
    if (!nodeId) return;

    EventBus.emit(EVENTS.CHATHEADER_NAVIGATE, { nodeId });
  }

  /**
   * 분기 버튼 클릭 핸들러
   * @private
   */
  _onBranchClick() {
    const nodeId = this.getCurrentNodeId();
    if (!nodeId) return;

    EventBus.emit(EVENTS.CHATHEADER_BRANCH, { nodeId });
  }

  /**
   * 메뉴 아이템 선택 핸들러
   * @private
   * @param {string} action - 선택된 액션 (rename/checkpoint/delete)
   */
  _onMenuSelect(action) {
    const nodeId = this.getCurrentNodeId();
    if (!nodeId) return;

    EventBus.emit(EVENTS.CHATHEADER_MENU, { nodeId, action });
    this._closeMenu();
  }

  // ===== 이벤트 바인딩 =====

  /**
   * DOM 이벤트 리스너 등록
   * @private
   */
  _bindEvents() {
    // 노드 버튼 클릭
    const nodeBtn = this.container.querySelector('.ch-node-btn');
    if (nodeBtn) {
      nodeBtn.addEventListener('click', () => this._onNodeClick());
    }

    // 분기 버튼 클릭
    const branchBtn = this.container.querySelector('.ch-branch-btn');
    if (branchBtn) {
      branchBtn.addEventListener('click', () => this._onBranchClick());
    }

    // 더보기 버튼 클릭
    const moreBtn = this.container.querySelector('.ch-more-btn');
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleMenu();
      });
    }

    // 메뉴 아이템 클릭
    const menuItems = this.container.querySelectorAll('.ch-menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        this._onMenuSelect(item.dataset.action);
      });
    });

    // 외부 클릭 시 메뉴 닫기
    this._outsideClickHandler = (e) => {
      if (!this.container.contains(e.target)) {
        this._closeMenu();
      }
    };
    document.addEventListener('click', this._outsideClickHandler);
  }

  /**
   * EventBus 이벤트 구독
   * @private
   */
  _subscribeEvents() {
    // 탭 전환 시
    this._subscriptions.push(
      EventBus.on(EVENTS.TAB_SWITCHED, () => {
        this._closeMenu();
        this.render();
      })
    );

    // 노드 변경 시
    this._subscriptions.push(
      EventBus.on(EVENTS.NODE_CHANGED, ({ nodeId, nodeName }) => {
        this.setCurrentNode(nodeId, nodeName);
      })
    );

    // 탭 상태 변경 시 (로딩/에러)
    this._subscriptions.push(
      EventBus.on(EVENTS.TAB_STATE_CHANGED, ({ tabId }) => {
        const { activeTabId } = store.getState();
        if (tabId === activeTabId) {
          this.render();
        }
      })
    );
  }

  // ===== 유틸리티 =====

  /**
   * HTML 이스케이프 (XSS 방지)
   * @private
   * @param {string} text
   * @returns {string}
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== 정리 =====

  /**
   * 리소스 정리 (구독 해제, 이벤트 리스너 제거)
   */
  destroy() {
    // EventBus 구독 해제
    this._subscriptions.forEach(unsub => unsub());
    this._subscriptions = [];

    // 외부 클릭 리스너 제거
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler);
      this._outsideClickHandler = null;
    }

    // 컨테이너 비우기
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
