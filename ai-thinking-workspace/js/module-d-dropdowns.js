// ========================================
// 모듈 D: 설정/계정 드롭다운
// ========================================

/**
 * 드롭다운 매니저 - 단일 열림 보장
 */
class DropdownManager {
  constructor() {
    this.openDropdown = null;
    this.dropdowns = new Map();
    this.initialized = false;
  }

  /**
   * 매니저 초기화
   */
  init() {
    if (this.initialized) return;

    // 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (this.openDropdown && !e.target.closest('.header-dropdown-wrapper')) {
        this.closeAll();
      }
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.openDropdown) {
        this.closeAll();
      }
    });

    // 다른 모듈(작업공간 드롭다운 등)에서 발행하는 이벤트 수신
    window.addEventListener('dropdown-exclusive-open', (e) => {
      if (e.detail.source !== 'header-dropdown') {
        this.closeAll();
      }
    });

    this.initialized = true;
  }

  /**
   * 드롭다운 등록
   */
  register(id, { btn, dropdown, onOpen, onClose }) {
    this.dropdowns.set(id, { btn, dropdown, onOpen, onClose });

    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle(id);
    });
  }

  /**
   * 토글
   */
  toggle(id) {
    if (this.openDropdown === id) {
      this.close(id);
    } else {
      this.open(id);
    }
  }

  /**
   * 열기
   */
  open(id) {
    // 다른 드롭다운 닫기
    if (this.openDropdown && this.openDropdown !== id) {
      this.close(this.openDropdown);
    }

    const data = this.dropdowns.get(id);
    if (!data) return;

    // 다른 시스템 드롭다운도 닫기 요청
    window.dispatchEvent(new CustomEvent('dropdown-exclusive-open', {
      detail: { source: 'header-dropdown', id }
    }));

    this.openDropdown = id;
    data.btn?.setAttribute('aria-expanded', 'true');
    data.dropdown?.removeAttribute('hidden');
    data.onOpen?.();

    // 첫 번째 메뉴 항목에 포커스
    const firstItem = data.dropdown?.querySelector('.dropdown-menu-item');
    firstItem?.focus();
  }

  /**
   * 닫기
   */
  close(id) {
    const data = this.dropdowns.get(id);
    if (!data) return;

    if (this.openDropdown === id) {
      this.openDropdown = null;
    }

    data.btn?.setAttribute('aria-expanded', 'false');
    data.dropdown?.setAttribute('hidden', '');
    data.onClose?.();

    // 버튼으로 포커스 복귀
    data.btn?.focus();
  }

  /**
   * 모두 닫기
   */
  closeAll() {
    if (this.openDropdown) {
      this.close(this.openDropdown);
    }
  }
}

/**
 * 설정 드롭다운 컨트롤러
 */
class SettingsDropdown {
  constructor(manager) {
    this.manager = manager;
    this.btn = null;
    this.dropdown = null;
    this.themeBadge = null;
  }

  async init() {
    this.btn = document.getElementById('settings-btn');
    if (!this.btn) {
      console.warn('SettingsDropdown: #settings-btn을 찾을 수 없습니다.');
      return;
    }

    // 버튼을 wrapper로 감싸기
    await this.wrapButton();

    // 템플릿 로드 및 삽입
    await this.loadTemplate();

    this.dropdown = document.getElementById('settings-dropdown');
    this.themeBadge = document.getElementById('theme-badge');

    if (!this.dropdown) {
      console.warn('SettingsDropdown: 드롭다운을 생성할 수 없습니다.');
      return;
    }

    // 드롭다운 매니저에 등록
    this.manager.register('settings', {
      btn: this.btn,
      dropdown: this.dropdown,
      onOpen: () => this.updateThemeBadge()
    });

    // 메뉴 항목 클릭 이벤트
    this.bindMenuEvents();

    // 키보드 네비게이션
    this.dropdown.addEventListener('keydown', (e) => this.handleKeydown(e));

    // 초기 테마 배지 설정
    this.updateThemeBadge();
  }

  /**
   * 버튼을 wrapper로 감싸기
   */
  async wrapButton() {
    if (this.btn.parentElement.classList.contains('header-dropdown-wrapper')) {
      return; // 이미 감싸져 있음
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'header-dropdown-wrapper';
    wrapper.id = 'settings-dropdown-wrapper';
    this.btn.parentNode.insertBefore(wrapper, this.btn);
    wrapper.appendChild(this.btn);
  }

  /**
   * 템플릿 로드
   */
  async loadTemplate() {
    try {
      const res = await fetch('templates/settings-dropdown.html');
      const html = await res.text();
      const wrapper = document.getElementById('settings-dropdown-wrapper');
      wrapper.insertAdjacentHTML('beforeend', html);
    } catch (error) {
      console.error('SettingsDropdown: 템플릿 로드 실패', error);
    }
  }

  /**
   * 메뉴 이벤트 바인딩
   */
  bindMenuEvents() {
    this.dropdown.querySelectorAll('.dropdown-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        this.handleAction(item.dataset.action);
      });
    });
  }

  /**
   * 액션 처리
   */
  handleAction(action) {
    switch (action) {
      case 'theme':
        this.toggleTheme();
        break;
      case 'notifications':
        this.openNotificationSettings();
        break;
      case 'shortcuts':
        this.openShortcutsModal();
        break;
      case 'layout':
        this.openLayoutModal();
        break;
      case 'help':
        this.openHelp();
        break;
    }

    // 테마 제외하고는 드롭다운 닫기
    if (action !== 'theme') {
      this.manager.close('settings');
    }
  }

  /**
   * 테마 토글
   */
  toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    this.updateThemeBadge();
  }

  /**
   * 테마 배지 업데이트
   */
  updateThemeBadge() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    if (this.themeBadge) {
      this.themeBadge.textContent = theme === 'light' ? '라이트' : '다크';
    }
  }

  /**
   * 알림 설정
   */
  openNotificationSettings() {
    alert('알림 설정 기능은 추후 구현됩니다.');
  }

  /**
   * 단축키 모달
   */
  openShortcutsModal() {
    alert('키보드 단축키:\n\n' +
      '새 작업공간: Ctrl/Cmd + N\n' +
      '검색: Ctrl/Cmd + K\n' +
      '설정: Ctrl/Cmd + ,');
  }

  /**
   * 레이아웃 모달 (app.js의 기존 기능 호출)
   */
  openLayoutModal() {
    // app.js의 App 인스턴스가 있으면 레이아웃 모달 열기
    if (window.app && typeof window.app.openLayoutModal === 'function') {
      window.app.openLayoutModal();
    } else {
      // 직접 모달 열기
      const overlay = document.getElementById('layout-modal-overlay');
      if (overlay) {
        overlay.classList.add('visible');
      } else {
        alert('레이아웃 설정은 작업공간에서 사용할 수 있습니다.');
      }
    }
  }

  /**
   * 도움말
   */
  openHelp() {
    alert('도움말 페이지는 추후 제공됩니다.');
  }

  /**
   * 키보드 네비게이션
   */
  handleKeydown(e) {
    const items = Array.from(this.dropdown.querySelectorAll('.dropdown-menu-item'));
    const currentIndex = items.findIndex(item => item === document.activeElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[nextIndex]?.focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prevIndex]?.focus();
        break;

      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;

      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (document.activeElement?.dataset.action) {
          this.handleAction(document.activeElement.dataset.action);
        }
        break;
    }
  }
}

/**
 * 계정 드롭다운 컨트롤러
 */
class AccountDropdown {
  constructor(manager) {
    this.manager = manager;
    this.btn = null;
    this.dropdown = null;
    this.userAvatar = null;
    this.userName = null;
    this.userEmail = null;

    // 사용자 데이터 (TODO: 실제 인증 시스템 연동)
    this.user = {
      name: '김대기',
      email: 'user@email.com',
      initials: 'DK',
      avatarColor: 'orange'
    };
  }

  async init() {
    this.btn = document.getElementById('account-btn');
    if (!this.btn) {
      console.warn('AccountDropdown: #account-btn을 찾을 수 없습니다.');
      return;
    }

    // 버튼을 wrapper로 감싸기
    await this.wrapButton();

    // 템플릿 로드 및 삽입
    await this.loadTemplate();

    this.dropdown = document.getElementById('account-dropdown');
    this.userAvatar = document.getElementById('dropdown-user-avatar');
    this.userName = document.getElementById('dropdown-user-name');
    this.userEmail = document.getElementById('dropdown-user-email');

    if (!this.dropdown) {
      console.warn('AccountDropdown: 드롭다운을 생성할 수 없습니다.');
      return;
    }

    // 드롭다운 매니저에 등록
    this.manager.register('account', {
      btn: this.btn,
      dropdown: this.dropdown,
      onOpen: () => this.updateUserInfo()
    });

    // 메뉴 항목 클릭 이벤트
    this.bindMenuEvents();

    // 키보드 네비게이션
    this.dropdown.addEventListener('keydown', (e) => this.handleKeydown(e));

    // 초기 아바타 설정
    this.initAvatar();
  }

  /**
   * 버튼을 wrapper로 감싸기
   */
  async wrapButton() {
    if (this.btn.parentElement.classList.contains('header-dropdown-wrapper')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'header-dropdown-wrapper';
    wrapper.id = 'account-dropdown-wrapper';
    this.btn.parentNode.insertBefore(wrapper, this.btn);
    wrapper.appendChild(this.btn);
  }

  /**
   * 템플릿 로드
   */
  async loadTemplate() {
    try {
      const res = await fetch('templates/account-dropdown.html');
      const html = await res.text();
      const wrapper = document.getElementById('account-dropdown-wrapper');
      wrapper.insertAdjacentHTML('beforeend', html);
    } catch (error) {
      console.error('AccountDropdown: 템플릿 로드 실패', error);
    }
  }

  /**
   * 메뉴 이벤트 바인딩
   */
  bindMenuEvents() {
    this.dropdown.querySelectorAll('.dropdown-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        this.handleAction(item.dataset.action);
        this.manager.close('account');
      });
    });
  }

  /**
   * 아바타 초기화
   */
  initAvatar() {
    const headerAvatar = document.getElementById('account-avatar');
    if (headerAvatar) {
      headerAvatar.textContent = this.user.initials;
      headerAvatar.setAttribute('data-color', this.user.avatarColor);
    }
  }

  /**
   * 사용자 정보 업데이트
   */
  updateUserInfo() {
    if (this.userAvatar) {
      this.userAvatar.textContent = this.user.initials;
    }
    if (this.userName) {
      this.userName.textContent = this.user.name;
    }
    if (this.userEmail) {
      this.userEmail.textContent = this.user.email;
    }
  }

  /**
   * 사용자 정보 설정 (외부에서 호출 가능)
   */
  setUser(userData) {
    this.user = { ...this.user, ...userData };
    this.initAvatar();
  }

  /**
   * 액션 처리
   */
  handleAction(action) {
    switch (action) {
      case 'upgrade':
        this.openUpgrade();
        break;
      case 'personalize':
        this.openPersonalize();
        break;
      case 'settings':
        // 설정 드롭다운 열기
        this.manager.open('settings');
        break;
      case 'help':
        this.openHelp();
        break;
      case 'logout':
        this.logout();
        break;
    }
  }

  /**
   * 플랜 업그레이드
   */
  openUpgrade() {
    alert('플랜 업그레이드 페이지로 이동합니다.');
  }

  /**
   * 개인 맞춤 설정
   */
  openPersonalize() {
    alert('개인 맞춤 설정 페이지로 이동합니다.');
  }

  /**
   * 도움말
   */
  openHelp() {
    alert('도움말 페이지는 추후 제공됩니다.');
  }

  /**
   * 로그아웃
   */
  logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
      alert('로그아웃되었습니다.');
      // window.location.href = '/login';
    }
  }

  /**
   * 키보드 네비게이션
   */
  handleKeydown(e) {
    const items = Array.from(this.dropdown.querySelectorAll('.dropdown-menu-item'));
    const currentIndex = items.findIndex(item => item === document.activeElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[nextIndex]?.focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prevIndex]?.focus();
        break;

      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;

      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (document.activeElement?.dataset.action) {
          this.handleAction(document.activeElement.dataset.action);
        }
        break;
    }
  }
}

/**
 * 모듈 D 메인 클래스
 */
class ModuleD {
  constructor() {
    this.manager = new DropdownManager();
    this.settingsDropdown = new SettingsDropdown(this.manager);
    this.accountDropdown = new AccountDropdown(this.manager);
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    console.log('🔧 모듈 D (설정/계정) 초기화 시작');

    // 드롭다운 매니저 초기화
    this.manager.init();

    // 설정 드롭다운 초기화
    await this.settingsDropdown.init();

    // 계정 드롭다운 초기화
    await this.accountDropdown.init();

    this.initialized = true;

    // 초기화 완료 이벤트
    window.dispatchEvent(new CustomEvent('module-d-ready'));

    console.log('✅ 모듈 D (설정/계정) 초기화 완료');
  }

  /**
   * 드롭다운 매니저 반환 (외부 모듈에서 사용)
   */
  getManager() {
    return this.manager;
  }

  /**
   * 사용자 정보 업데이트
   */
  setUser(userData) {
    this.accountDropdown.setUser(userData);
  }
}

// 전역 노출
window.ModuleD = new ModuleD();

// 전역 dropdownManager도 노출 (다른 모듈과 호환성)
window.dropdownManager = window.ModuleD.getManager();

// DOMContentLoaded 시 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.ModuleD.init();
});
