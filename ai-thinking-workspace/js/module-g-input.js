// ========================================
// 모듈 G: 입력창 + UX
//
// 담당:
// - 입력창 placeholder 동적 변경 (1:1 vs 페르소나)
// - 입력 높이 자동 조절
// - 키보드 단축키 (Enter 전송, Shift+Enter 줄바꿈)
// - 전송 버튼 상태 관리
//
// 이벤트 수신:
// - input:mode-change { mode, persona? }
// - input:focus {}
//
// 이벤트 발행:
// - message:send { content, mode, persona? }
// ========================================

class ModuleG {
  constructor() {
    this.initialized = false;
    this.chatInput = null;
  }

  /**
   * 모듈 초기화
   */
  async init() {
    // ChatInput 인스턴스 생성
    this.chatInput = new ChatInput();

    this.initialized = true;
    console.log('[모듈 G] 입력창 초기화 완료');
  }
}

// ========================================
// ChatInput 클래스
// ========================================

class ChatInput {
  constructor(container, tabId) {
    this.tabId = tabId || null;
    this.parentContainer = container || document;
    this.input = this._el('chat-input');
    this.sendBtn = this._el('send-btn');

    // 모드 상태
    this.mode = '1:1';  // '1:1' | 'persona'
    this.selectedPersona = null;  // 'analyst', 'designer', etc.

    // placeholder 매핑
    this.placeholders = {
      '1:1': 'AI에게 질문하기...',
      'persona-all': '전문가들에게 질문하기...',
      'persona-analyst': '데이터 분석가에게 질문하기...',
      'persona-designer': '디자이너에게 질문하기...',
      'persona-marketer': '마케터에게 질문하기...',
      'persona-strategist': '전략가에게 질문하기...',
      'persona-critic': '비평가에게 질문하기...'
    };

    this.init();
  }

  _el(id) {
    if (this.tabId) {
      const scoped = this.parentContainer.querySelector(`#${id}--${this.tabId}`);
      if (scoped) return scoped;
    }
    return document.getElementById(id);
  }

  /**
   * 초기화
   */
  init() {
    console.log('[ChatInput] init 시작', {
      input: this.input,
      sendBtn: this.sendBtn
    });

    if (!this.input) {
      console.warn('[ChatInput] 입력창을 찾을 수 없습니다 (#chat-input)');
      return;
    }

    // 기존 input을 textarea로 업그레이드 (필요 시)
    this.upgradeToTextarea();

    // 이벤트 바인딩
    this.bindEvents();

    // EventBus 구독
    this.subscribeEvents();

    // 초기 상태 설정
    this.updatePlaceholder();
    this.updateSendButton();
  }

  /**
   * input을 textarea로 업그레이드
   * (설계서에서 textarea 사용 권장)
   */
  upgradeToTextarea() {
    if (this.input.tagName === 'TEXTAREA') {
      return; // 이미 textarea
    }

    // 기존 input 속성 저장
    const attributes = {
      id: this.input.id,
      class: this.input.className,
      placeholder: this.input.placeholder,
      value: this.input.value
    };

    // textarea 생성
    const textarea = document.createElement('textarea');
    textarea.id = attributes.id;
    textarea.className = attributes.class;
    textarea.placeholder = attributes.placeholder;
    textarea.value = attributes.value;
    textarea.rows = 1;
    textarea.setAttribute('aria-label', '메시지 입력');

    // 기존 input 교체
    this.input.parentNode.replaceChild(textarea, this.input);
    this.input = textarea;

    // label 업데이트 (있다면)
    const scopedId = this.tabId ? `chat-input--${this.tabId}` : 'chat-input';
    const root = (this.tabId && this.parentContainer) ? this.parentContainer : document;
    const label = root.querySelector(`label[for="${scopedId}"]`) || root.querySelector('label[for="chat-input"]');
    if (label) {
      label.setAttribute('for', scopedId);
    }
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    console.log('[ChatInput] bindEvents 시작');

    // 입력 이벤트
    this.input.addEventListener('input', () => {
      this.autoResize();
      this.updateSendButton();
    });

    // 키보드 이벤트
    this.input.addEventListener('keydown', (e) => {
      // 한글 IME 조합 중이면 무시 (이중 입력 방지)
      if (e.isComposing || e.keyCode === 229) return;

      if (e.key === 'Enter') {
        if (e.shiftKey) {
          // Shift+Enter: 줄바꿈 (기본 동작)
          return;
        }
        // Enter: 전송
        e.preventDefault();
        console.log('[ChatInput] Enter 전송 시도');
        this.send();
      }
    });

    // 전송 버튼 클릭
    this.sendBtn?.addEventListener('click', () => {
      console.log('[ChatInput] 버튼 클릭 전송 시도');
      this.send();
    });

    // 초기 리사이즈
    this.autoResize();
    console.log('[ChatInput] bindEvents 완료');
  }

  /**
   * EventBus 이벤트 구독
   */
  subscribeEvents() {
    // 모드 변경 이벤트 수신
    if (window.EventBus) {
      EventBus.on('input:mode-change', (data) => {
        this.setMode(data.mode, data.persona);
      });

      EventBus.on('input:focus', () => {
        this.focus();
      });
    }
  }

  /**
   * 높이 자동 조절
   */
  autoResize() {
    if (!this.input || this.input.tagName !== 'TEXTAREA') return;

    // 높이 초기화 후 scrollHeight로 조절
    this.input.style.height = 'auto';
    const newHeight = Math.min(this.input.scrollHeight, 200);
    this.input.style.height = newHeight + 'px';
  }

  /**
   * 전송 버튼 상태 업데이트
   */
  updateSendButton() {
    const hasContent = this.input?.value.trim().length > 0;
    if (this.sendBtn) {
      this.sendBtn.disabled = !hasContent;
    }
  }

  /**
   * 모드 변경
   * @param {string} mode - '1:1' | 'persona'
   * @param {string|null} persona - 페르소나 ID (persona 모드일 때)
   */
  setMode(mode, persona = null) {
    this.mode = mode;
    this.selectedPersona = persona;
    this.updatePlaceholder();

    console.log(`[ChatInput] 모드 변경: ${mode}${persona ? ` (${persona})` : ''}`);
  }

  /**
   * placeholder 업데이트
   */
  updatePlaceholder() {
    if (!this.input) return;

    let key = this.mode;
    if (this.mode === 'persona') {
      key = this.selectedPersona
        ? `persona-${this.selectedPersona}`
        : 'persona-all';
    }

    this.input.placeholder = this.placeholders[key] || this.placeholders['1:1'];
  }

  /**
   * 메시지 전송
   */
  send() {
    console.log('[ChatInput] send() 호출');
    const content = this.input?.value.trim();
    console.log('[ChatInput] content:', content);
    if (!content) {
      console.log('[ChatInput] 빈 내용, 종료');
      return;
    }

    // chatManager가 있으면 직접 호출 (텍스트 전달)
    console.log('[ChatInput] chatManager 확인:', !!window.chatManager);
    if (window.chatManager && typeof chatManager.sendMessage === 'function') {
      console.log('[ChatInput] chatManager.sendMessage(content) 호출');
      chatManager.sendMessage(content);  // 텍스트를 파라미터로 전달!

      // 입력창 초기화
      if (this.input) {
        this.input.value = '';
        this.autoResize();
        this.updateSendButton();
        this.input.focus();
      }
      return;
    }

    // EventBus로 전송 이벤트 발행 (fallback)
    if (window.EventBus) {
      EventBus.emit('message:send', {
        content,
        mode: this.mode,
        persona: this.selectedPersona
      });
    }

    // 입력창 초기화
    if (this.input) {
      this.input.value = '';
      this.autoResize();
      this.updateSendButton();
      this.input.focus();
    }
  }

  /**
   * 입력창 포커스
   */
  focus() {
    this.input?.focus();
  }

  /**
   * 현재 값 가져오기
   */
  getValue() {
    return this.input?.value || '';
  }

  /**
   * 값 설정
   */
  setValue(value) {
    if (this.input) {
      this.input.value = value;
      this.autoResize();
      this.updateSendButton();
    }
  }

  /**
   * 입력창 비활성화/활성화
   */
  setDisabled(disabled) {
    if (this.input) {
      this.input.disabled = disabled;
    }
    if (this.sendBtn) {
      this.sendBtn.disabled = disabled;
    }
  }
}

// ========================================
// 전역 노출 및 모듈 등록
// ========================================

window.ModuleG = new ModuleG();

// ModuleRegistry에 등록 (통합자 시스템 연동)
if (window.ModuleRegistry) {
  ModuleRegistry.register('module-g', window.ModuleG);
}

// chatInput 직접 접근용 (하위 호환)
Object.defineProperty(window, 'chatInput', {
  get() {
    return window.ModuleG?.chatInput;
  }
});

// DOMContentLoaded 시 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.ModuleG.init();
});
