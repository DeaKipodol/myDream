// ========================================
// 모듈 A: 헤더 + 작업공간 선택기
// ========================================

class ModuleA {
  static SLOT_ID = 'header-slot';
  static TEMPLATE_PATH = 'templates/header.html';

  constructor() {
    this.initialized = false;
    this.workspaceSelector = null;
  }

  /**
   * 모듈 초기화
   */
  async init() {
    const slot = document.getElementById(ModuleA.SLOT_ID);
    if (!slot) {
      console.warn('[모듈 A] 헤더 슬롯(#header-slot)을 찾을 수 없습니다');
      return;
    }

    // 템플릿 로드 및 주입
    const html = await this.loadTemplate();
    slot.innerHTML = html;

    // 이벤트 바인딩
    this.bindEvents();

    // 계정 아바타 초기화
    this.initAccountAvatar();

    this.initialized = true;

    // 다른 모듈에게 준비 완료 알림
    window.dispatchEvent(new CustomEvent('module-a-ready'));
    console.log('[모듈 A] 헤더 초기화 완료');
  }

  /**
   * 템플릿 로드
   */
  async loadTemplate() {
    try {
      const res = await fetch(ModuleA.TEMPLATE_PATH);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.error('[모듈 A] 템플릿 로드 실패:', err);
      return this.getFallbackTemplate();
    }
  }

  /**
   * 폴백 템플릿 (fetch 실패 시)
   */
  getFallbackTemplate() {
    return `
      <header class="app-header">
        <div class="header-left">
          <div class="logo" id="app-logo">
            <span class="logo-icon" aria-hidden="true">🧠</span>
          </div>
          <div class="workspace-selector" id="workspace-selector">
            <button class="workspace-selector-btn" id="workspace-selector-btn" aria-haspopup="listbox" aria-expanded="false">
              <span class="workspace-name" id="current-workspace-name">작업공간</span>
              <span class="workspace-chevron" aria-hidden="true"></span>
            </button>
            <div class="workspace-dropdown" id="workspace-dropdown" role="listbox" hidden></div>
          </div>
        </div>
        <div class="header-right">
          <div id="settings-slot"></div>
          <div id="account-slot"></div>
        </div>
      </header>
    `;
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // WorkspaceSelector 초기화
    this.workspaceSelector = new WorkspaceSelector();
  }

  /**
   * 계정 아바타 초기화
   */
  initAccountAvatar() {
    const avatar = document.getElementById('account-avatar');
    if (!avatar) return;

    // 사용자 이름에서 이니셜 추출
    const userName = '김대기'; // TODO: 실제 사용자 데이터에서 가져오기
    const initials = this.getInitials(userName);

    avatar.textContent = initials;

    // 이름 기반 고정 색상
    const colors = ['orange', 'green', 'blue', 'purple', 'pink'];
    const colorIndex = userName.charCodeAt(0) % colors.length;
    avatar.setAttribute('data-color', colors[colorIndex]);
  }

  /**
   * 이름에서 이니셜 추출
   */
  getInitials(name) {
    // 한글 이름: 성만 반환 (예: "김대기" → "김")
    // 영문 이름: 첫 글자들 (예: "John Doe" → "JD")
    if (/[가-힣]/.test(name)) {
      return name.charAt(0);
    }
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  /**
   * 현재 작업공간 이름 변경
   */
  setCurrentWorkspace(name) {
    this.workspaceSelector?.setCurrentWorkspace(name);
  }
}

// ========================================
// 작업공간 선택기 (드롭다운 토글)
// ========================================

class WorkspaceSelector {
  constructor() {
    this.btn = document.getElementById('workspace-selector-btn');
    this.dropdown = document.getElementById('workspace-dropdown');
    this.nameEl = document.getElementById('current-workspace-name');

    this.isOpen = false;
    this.init();
  }

  init() {
    // 버튼 클릭
    this.btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.workspace-selector')) {
        this.close();
      }
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
        this.btn?.focus();
      }
    });

    // 모듈 C가 발행하는 닫기 이벤트 수신
    window.addEventListener('workspace-dropdown-close', () => this.close());

    // 다른 드롭다운 열릴 때 닫기 (배타적)
    window.addEventListener('dropdown-exclusive-open', (e) => {
      if (e.detail?.source !== 'workspace-selector') {
        this.close();
      }
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.btn?.setAttribute('aria-expanded', 'true');
    this.dropdown?.removeAttribute('hidden');

    // 배타적 드롭다운 이벤트 발행
    window.dispatchEvent(new CustomEvent('dropdown-exclusive-open', {
      detail: { source: 'workspace-selector' }
    }));

    // 모듈 C에게 열림 알림
    window.dispatchEvent(new CustomEvent('workspace-dropdown-open'));
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.btn?.setAttribute('aria-expanded', 'false');
    this.dropdown?.setAttribute('hidden', '');

    // 모듈 C에게 닫힘 알림
    window.dispatchEvent(new CustomEvent('workspace-dropdown-close'));
  }

  setCurrentWorkspace(name) {
    if (this.nameEl) {
      this.nameEl.textContent = name;
    }
  }
}

// 전역 노출
window.ModuleA = new ModuleA();

// workspaceSelector 직접 접근용 (하위 호환)
Object.defineProperty(window, 'workspaceSelector', {
  get() {
    return window.ModuleA?.workspaceSelector;
  }
});

// DOMContentLoaded 시 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
  // HTML에 헤더가 이미 있으면 WorkspaceSelector만 초기화
  const headerSlot = document.getElementById('header-slot');
  if (headerSlot) {
    // 템플릿 방식 - init() 호출
    window.ModuleA.init();
  } else {
    // 직접 HTML 방식 - WorkspaceSelector만 초기화
    window.ModuleA.workspaceSelector = new WorkspaceSelector();
    window.ModuleA.initAccountAvatar();
    window.ModuleA.initialized = true;
    window.dispatchEvent(new CustomEvent('module-a-ready'));
    console.log('[모듈 A] 헤더 초기화 완료 (직접 HTML 방식)');
  }

  // 로고 클릭 → 홈으로 이동
  const logo = document.querySelector('.logo');
  if (logo) {
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', () => {
      if (window.router && typeof window.router.goHome === 'function') {
        window.router.goHome();
      }
    });
  }
});
