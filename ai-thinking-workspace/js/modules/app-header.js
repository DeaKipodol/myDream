// modules/app-header.js

import { store } from '../core/store.js';
import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';

export class AppHeader {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this._subscriptions = [];

    this._bindEvents();
  }

  // ===== 렌더링 =====

  render() {
    // 정적 부분만 렌더링 (탭은 TabManager가 관리)
    this.container.innerHTML = `
      <!-- 좌측: 햄버거 + 로고 -->
      <div class="ah-left">
        <button class="ah-hamburger" aria-label="메뉴 열기">
          <span class="ah-hamburger-icon">≡</span>
        </button>
        <div class="ah-logo">
          <span class="ah-logo-icon">🧠</span>
          <span class="ah-logo-text">MyDream</span>
        </div>
      </div>

      <!-- 중앙: 탭 영역 (TabManager가 렌더링) -->
      <div id="tab-container" class="ah-tabs"></div>

      <!-- 우측: 설정 + 계정 -->
      <div class="ah-right">
        <button class="ah-btn ah-settings" aria-label="설정">
          <span>⚙️</span>
        </button>
        <button class="ah-btn ah-account" aria-label="계정">
          <div class="ah-avatar">DK</div>
        </button>
      </div>
    `;

    // 이벤트 재바인딩
    this._bindButtonEvents();
  }

  // ===== 표시/숨김 =====

  show() {
    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }

  // ===== 이벤트 핸들러 =====

  _onHamburgerClick() {
    // SidePanel 토글
    if (window.sidePanel) {
      window.sidePanel.toggle();
    }
  }

  _onSettingsClick() {
    // TODO: 설정 화면 열기
    console.log('Open settings');
  }

  _onAccountClick() {
    // TODO: 계정 메뉴 열기
    console.log('Open account menu');
  }

  _onLogoClick() {
    // 홈으로 이동 (모든 탭 닫기 또는 홈 화면)
    console.log('Go home');
  }

  // ===== 이벤트 바인딩 =====

  _bindEvents() {
    // 컨테이너 레벨 이벤트 (초기 1회)
    this.container.addEventListener('click', (e) => {
      // 햄버거 버튼
      if (e.target.closest('.ah-hamburger')) {
        this._onHamburgerClick();
        return;
      }

      // 설정 버튼
      if (e.target.closest('.ah-settings')) {
        this._onSettingsClick();
        return;
      }

      // 계정 버튼
      if (e.target.closest('.ah-account')) {
        this._onAccountClick();
        return;
      }

      // 로고 클릭
      if (e.target.closest('.ah-logo')) {
        this._onLogoClick();
        return;
      }
    });
  }

  _bindButtonEvents() {
    // render() 후 추가 바인딩이 필요하면 여기에
    // 현재는 이벤트 위임으로 처리하므로 불필요
  }

  // ===== 정리 =====

  destroy() {
    this._subscriptions.forEach(unsub => unsub());
    this._subscriptions = [];
  }
}
