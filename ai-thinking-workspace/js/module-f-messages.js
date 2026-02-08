// ========================================
// 모듈 F: 메시지 UI
// - 새로운 말풍선 스타일 렌더링
// - 이니셜 아바타 + 좌측 컬러 라인
// - chat.js에서 호출하여 사용
// ========================================

/**
 * 페르소나 정의
 */
const PERSONAS = {
  analyst: { name: '데이터 분석가', initial: 'D', color: 'analyst' },
  designer: { name: '디자이너', initial: 'De', color: 'designer' },
  marketer: { name: '마케터', initial: 'M', color: 'marketer' },
  strategist: { name: '전략가', initial: 'S', color: 'strategist' },
  critic: { name: '비평가', initial: 'C', color: 'critic' },
  ai: { name: 'AI 어시스턴트', initial: 'AI', color: 'ai' }
};

/**
 * 모듈 F 클래스
 */
class ModuleFMessages {
  constructor() {
    this.container = null;
    this.initialized = false;
  }

  /**
   * 초기화
   */
  async init() {
    this.container = document.getElementById('chat-messages');
    if (!this.container) {
      console.warn('[ModuleF] #chat-messages 컨테이너를 찾을 수 없습니다.');
      return;
    }

    this.initialized = true;
    window.dispatchEvent(new CustomEvent('module-f-ready'));
    console.log('[ModuleF] 메시지 UI 모듈 초기화 완료');
  }

  // ========================================
  // 렌더링 함수들
  // ========================================

  /**
   * 사용자 메시지 렌더링
   * @param {string} content - 메시지 내용
   * @returns {string} HTML 문자열
   */
  renderUserMessage(content) {
    return `
      <div class="message message-user">
        <div class="message-content">
          <p>${this.escapeHtml(content)}</p>
        </div>
      </div>
    `;
  }

  /**
   * AI 메시지 렌더링 (1:1 모드)
   * @param {string} content - 메시지 내용
   * @param {Object} options - 옵션 (showActions, showAskExperts 등)
   * @returns {string} HTML 문자열
   */
  renderAIMessage(content, options = {}) {
    const { showActions = true, showAskExperts = true } = options;

    return `
      <div class="message message-ai">
        <div class="message-avatar" data-persona="ai">
          <span class="avatar-initial">AI</span>
        </div>
        <div class="message-body">
          <div class="message-header">
            <span class="message-name">AI 어시스턴트</span>
          </div>
          <div class="message-content">
            ${this.formatContent(content)}
          </div>
          ${showActions ? this.renderMessageActions(null, { showAskExperts }) : ''}
        </div>
      </div>
    `;
  }

  /**
   * 페르소나 메시지 렌더링
   * @param {string} personaKey - 페르소나 키 (analyst, designer 등)
   * @param {string} content - 메시지 내용
   * @param {Object} options - 옵션
   * @returns {string} HTML 문자열
   */
  renderPersonaMessage(personaKey, content, options = {}) {
    const { showActions = true } = options;
    const persona = PERSONAS[personaKey];

    if (!persona) {
      console.warn(`[ModuleF] 알 수 없는 페르소나: ${personaKey}`);
      return '';
    }

    return `
      <div class="message message-persona" data-persona="${personaKey}">
        <div class="message-indicator" aria-hidden="true"></div>
        <div class="message-avatar" data-persona="${personaKey}">
          <span class="avatar-initial">${persona.initial}</span>
        </div>
        <div class="message-body">
          <div class="message-header">
            <span class="message-name">${persona.name}</span>
          </div>
          <div class="message-content">
            ${this.formatContent(content)}
          </div>
          ${showActions ? this.renderMessageActions(personaKey) : ''}
        </div>
      </div>
    `;
  }

  /**
   * 페르소나 그룹 렌더링 (여러 페르소나 응답)
   * @param {Array} responses - [{persona: string, content: string}, ...]
   * @returns {string} HTML 문자열
   */
  renderPersonaGroup(responses) {
    if (!responses || responses.length === 0) {
      return '';
    }

    const messages = responses.map(r =>
      this.renderPersonaMessage(r.persona, r.content, { showActions: true })
    ).join('');

    return `
      <div class="persona-group">
        ${messages}
      </div>
    `;
  }

  /**
   * 시스템 메시지 렌더링
   * @param {string} content - 메시지 내용
   * @returns {string} HTML 문자열
   */
  renderSystemMessage(content) {
    return `
      <div class="message message-system">
        <span class="system-content">${this.escapeHtml(content)}</span>
      </div>
    `;
  }

  /**
   * 타이핑 인디케이터 렌더링
   * @param {string} personaKey - 페르소나 키 (optional)
   * @returns {string} HTML 문자열
   */
  renderTypingIndicator(personaKey = 'ai') {
    const persona = PERSONAS[personaKey] || PERSONAS.ai;

    return `
      <div class="message message-ai typing" data-persona="${personaKey}">
        <div class="message-avatar" data-persona="${personaKey}">
          <span class="avatar-initial">${persona.initial}</span>
        </div>
        <div class="message-body">
          <div class="typing-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 메시지 액션 버튼 렌더링
   * @param {string} personaKey - 페르소나 키 (분기 시 사용)
   * @param {Object} options - 옵션 {showAskExperts: boolean}
   * @returns {string} HTML 문자열
   */
  renderMessageActions(personaKey = null, options = {}) {
    const { showAskExperts = false } = options;
    const branchData = personaKey ? ` data-persona="${personaKey}"` : '';

    const askExpertsBtn = showAskExperts ? `
        <button class="message-action-btn ask-experts-btn" data-action="ask-experts">
          <span class="action-emoji">🎭</span>
          <span>전문가에게 물어보기</span>
        </button>
    ` : '';

    return `
      <div class="message-actions">
        <button class="message-action-btn" data-action="branch"${branchData}>
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 3v12"/>
            <circle cx="18" cy="6" r="3"/>
            <circle cx="6" cy="18" r="3"/>
            <path d="M18 9a9 9 0 0 1-9 9"/>
          </svg>
          <span>분기하기</span>
        </button>
        <button class="message-action-btn" data-action="copy">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          <span>복사</span>
        </button>
        ${askExpertsBtn}
      </div>
    `;
  }

  // ========================================
  // 유틸리티 함수들
  // ========================================

  /**
   * 콘텐츠 포맷팅 (간단한 마크다운 → HTML)
   * @param {string} content - 원본 콘텐츠
   * @returns {string} HTML 문자열
   */
  formatContent(content) {
    // 이미 HTML 태그가 포함된 경우 그대로 반환
    if (/<[a-z][\s\S]*>/i.test(content)) {
      return content;
    }

    let html = this.escapeHtml(content);

    // 줄바꿈 → <p>
    html = html.split('\n\n').map(p => `<p>${p}</p>`).join('');

    // 단일 줄바꿈 → <br>
    html = html.replace(/\n/g, '<br>');

    // **bold**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // *italic*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // `code`
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    return html;
  }

  /**
   * HTML 이스케이프
   * @param {string} text - 원본 텍스트
   * @returns {string} 이스케이프된 텍스트
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========================================
  // 컨테이너 조작 함수들
  // ========================================

  /**
   * 메시지 추가
   * @param {string} html - HTML 문자열
   */
  append(html) {
    if (!this.container) return;
    this.container.insertAdjacentHTML('beforeend', html);
    this.scrollToBottom();
  }

  /**
   * 사용자 메시지 추가
   * @param {string} content - 메시지 내용
   */
  addUserMessage(content) {
    const html = this.renderUserMessage(content);
    this.append(html);
  }

  /**
   * AI 메시지 추가
   * @param {string} content - 메시지 내용
   * @param {Object} options - 옵션
   */
  addAIMessage(content, options = {}) {
    const html = this.renderAIMessage(content, options);
    this.append(html);
    this.bindMessageActions();
  }

  /**
   * 페르소나 메시지 추가
   * @param {string} personaKey - 페르소나 키
   * @param {string} content - 메시지 내용
   * @param {Object} options - 옵션
   */
  addPersonaMessage(personaKey, content, options = {}) {
    const html = this.renderPersonaMessage(personaKey, content, options);
    this.append(html);
    this.bindMessageActions();
  }

  /**
   * 페르소나 그룹 추가
   * @param {Array} responses - 응답 배열
   */
  addPersonaGroup(responses) {
    const html = this.renderPersonaGroup(responses);
    this.append(html);
    this.bindMessageActions();
  }

  /**
   * 시스템 메시지 추가
   * @param {string} content - 메시지 내용
   */
  addSystemMessage(content) {
    const html = this.renderSystemMessage(content);
    this.append(html);
  }

  /**
   * 타이핑 인디케이터 표시
   * @param {string} personaKey - 페르소나 키
   */
  showTyping(personaKey = 'ai') {
    this.removeTyping();
    const html = this.renderTypingIndicator(personaKey);
    this.append(html);
  }

  /**
   * 타이핑 인디케이터 제거
   */
  removeTyping() {
    if (!this.container) return;
    const typing = this.container.querySelector('.message.typing');
    if (typing) {
      typing.remove();
    }
  }

  /**
   * 스크롤을 하단으로 이동
   */
  scrollToBottom() {
    // 탭 모드일 때 container의 가장 가까운 .chat-area를 찾음
    const chatArea = this.container?.closest('.chat-area') || document.getElementById('chat-area');
    if (chatArea) {
      chatArea.scrollTop = chatArea.scrollHeight;
    } else if (this.container) {
      this.container.scrollTop = this.container.scrollHeight;
    }
  }

  /**
   * 메시지 클리어
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  // ========================================
  // 이벤트 바인딩
  // ========================================

  /**
   * 메시지 액션 이벤트 바인딩
   */
  bindMessageActions() {
    if (!this.container) return;

    this.container.querySelectorAll('.message-action-btn').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';

      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        const message = btn.closest('.message');

        if (action === 'branch') {
          this.handleBranch(message, btn.dataset.persona);
        } else if (action === 'copy') {
          this.handleCopy(message);
        } else if (action === 'ask-experts') {
          this.handleAskExperts(message);
        }
      });
    });
  }

  /**
   * 전문가에게 물어보기 액션 핸들러
   * @param {Element} message - 메시지 요소
   */
  handleAskExperts(message) {
    // chatManager의 showExpertSelector 호출
    if (window.chatManager && typeof window.chatManager.showExpertSelector === 'function') {
      window.chatManager.showExpertSelector();
    } else {
      console.log('[ModuleF] chatManager.showExpertSelector를 찾을 수 없습니다.');
    }
  }

  /**
   * 분기 액션 핸들러
   * @param {Element} message - 메시지 요소
   * @param {string} personaKey - 페르소나 키 (optional)
   */
  handleBranch(message, personaKey = null) {
    const content = message.querySelector('.message-content')?.textContent;

    // 커스텀 이벤트 발행
    window.dispatchEvent(new CustomEvent('message-branch', {
      detail: {
        content,
        personaKey,
        element: message
      }
    }));

    console.log('[ModuleF] 분기 요청:', { content, personaKey });
  }

  /**
   * 복사 액션 핸들러
   * @param {Element} message - 메시지 요소
   */
  handleCopy(message) {
    const content = message.querySelector('.message-content')?.textContent;
    if (!content) return;

    navigator.clipboard.writeText(content).then(() => {
      // 복사 완료 피드백
      const btn = message.querySelector('[data-action="copy"]');
      if (btn) {
        const originalText = btn.querySelector('span').textContent;
        btn.querySelector('span').textContent = '복사됨!';
        setTimeout(() => {
          btn.querySelector('span').textContent = originalText;
        }, 1500);
      }

      console.log('[ModuleF] 클립보드에 복사됨');
    }).catch(err => {
      console.error('[ModuleF] 복사 실패:', err);
    });
  }

  // ========================================
  // 페르소나 유틸리티
  // ========================================

  /**
   * 페르소나 정보 가져오기
   * @param {string} key - 페르소나 키
   * @returns {Object|null} 페르소나 정보
   */
  getPersona(key) {
    return PERSONAS[key] || null;
  }

  /**
   * 모든 페르소나 목록 가져오기
   * @returns {Object} 페르소나 맵
   */
  getAllPersonas() {
    return { ...PERSONAS };
  }

  /**
   * 커스텀 페르소나 추가
   * @param {string} key - 페르소나 키
   * @param {Object} persona - {name, initial, color}
   */
  addPersona(key, persona) {
    if (!persona.name || !persona.initial) {
      console.warn('[ModuleF] 페르소나에 name, initial이 필요합니다.');
      return;
    }
    PERSONAS[key] = persona;
    console.log('[ModuleF] 페르소나 추가:', key, persona);
  }
}

// ========================================
// 전역 노출 및 모듈 등록
// ========================================

window.ModuleF = new ModuleFMessages();

// PERSONAS도 전역으로 노출 (다른 모듈에서 참조용)
window.PERSONAS = PERSONAS;

// ModuleRegistry에 등록 (_init.js에서 초기화됨)
if (typeof ModuleRegistry !== 'undefined') {
  ModuleRegistry.register('module-f', window.ModuleF);
}

// DOMContentLoaded 시 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.ModuleF.init();
});
