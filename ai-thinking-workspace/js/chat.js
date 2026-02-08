// ========================================
// 채팅 관리 - AI 생각 작업공간
// ========================================

class ChatManager {
  constructor(container, tabId) {
    this.tabId = tabId || null;
    this.container = container || document;

    this.messagesContainer = this._el('chat-messages');
    this.titleEl = this._el('chat-title');
    this.breadcrumbEl = this._el('chat-breadcrumb');
    this.inputEl = this._el('chat-input');
    this.sendBtn = this._el('send-btn');

    // 모듈 1: 채팅 모드 및 전문가 상태
    this.chatMode = 'standard'; // 'standard' | 'persona'
    this.activeExperts = []; // 초대된 전문가 목록

    this.onBranchClick = null;
    this.bindEvents();
    this.bindMessageActions();
  }

  _el(id) {
    if (this.tabId) {
      const scoped = this.container.querySelector(`#${id}--${this.tabId}`);
      if (scoped) return scoped;
    }
    return document.getElementById(id);
  }

  // 채팅 렌더링
  render(workspace) {
    console.log('[ChatManager] render 시작:', {
      workspace: workspace?.title,
      messagesContainer: !!this.messagesContainer,
      titleEl: !!this.titleEl,
      messageCount: workspace?.messages?.length
    });

    // 제목 & 브레드크럼
    if (this.titleEl) this.titleEl.textContent = this.getNodeTitle(workspace);
    if (this.breadcrumbEl) this.breadcrumbEl.textContent = this.getBreadcrumb(workspace);

    // 메시지들
    if (!this.messagesContainer) {
      console.error('[ChatManager] messagesContainer가 없습니다!');
      return;
    }

    // 기존 메시지 삭제 (환영 메시지 #chat-welcome 유지)
    const existingMessages = this.messagesContainer.querySelectorAll('.message');
    existingMessages.forEach(el => el.remove());

    // 삭제됨 메시지도 제거 (탭 전환 시 이전 삭제 메시지 정리)
    const deletedMsg = this.messagesContainer.querySelector('.deleted-workspace-message');
    if (deletedMsg) deletedMsg.remove();

    // 환영 메시지 처리
    const welcomeEl = this._el('chat-welcome');
    const hasMessages = workspace.messages && workspace.messages.length > 0;

    if (hasMessages) {
      // 메시지가 있으면 환영 메시지 숨김
      if (welcomeEl) welcomeEl.classList.add('hidden');

      // 메시지 렌더링 (insertAdjacentHTML로 기존 DOM 유지)
      for (const msg of workspace.messages) {
        this.messagesContainer.insertAdjacentHTML('beforeend', this.renderMessage(msg));
      }
    } else {
      // 메시지가 없으면 환영 메시지 표시
      if (welcomeEl) welcomeEl.classList.remove('hidden');
    }

    console.log('[ChatManager] 렌더링된 메시지 수:', workspace.messages?.length || 0);

    // 분기 버튼 이벤트
    this.bindBranchEvents();

    // 스크롤 하단으로
    this.scrollToBottom();
  }

  /**
   * 삭제된 작업공간 상태 표시
   */
  renderDeletedState(workspaceName, workspaceId) {
    if (!this.messagesContainer) return;

    // 현재 활성 탭의 작업공간인지 확인
    const activeTab = window.newTabManager?.getTabs()?.find(t =>
      t.tabId === window.newTabManager?.getActiveTabId()
    );

    if (activeTab && workspaceId && activeTab.workspaceId !== workspaceId) {
      console.log('[ChatManager] renderDeletedState 무시 - 활성 탭이 아님:', {
        요청: workspaceId,
        활성탭: activeTab.workspaceId
      });
      return;
    }

    console.log('[ChatManager] renderDeletedState 실행:', { workspaceName, workspaceId });

    // 유효한 이름인지 확인
    const displayName = (workspaceName && workspaceName !== 'undefined')
      ? workspaceName
      : '작업공간';

    // 기존 내용 모두 숨기기
    const existingMessages = this.messagesContainer.querySelectorAll('.message');
    existingMessages.forEach(el => el.remove());

    // 기존 삭제 메시지도 제거
    const existingDeletedMsg = this.messagesContainer.querySelector('.deleted-workspace-message');
    if (existingDeletedMsg) existingDeletedMsg.remove();

    const welcomeEl = this._el('chat-welcome');
    if (welcomeEl) welcomeEl.classList.add('hidden');

    // 삭제됨 메시지 표시 (복구 버튼 포함)
    const deletedHtml = `
      <div class="deleted-workspace-message" data-workspace-id="${workspaceId || ''}">
        <div class="deleted-icon">🗑️</div>
        <h3>삭제된 작업공간</h3>
        <p>"${displayName}"이(가) 휴지통으로 이동되었습니다.</p>
        <div class="deleted-actions">
          <button class="btn-restore" data-workspace-id="${workspaceId || ''}">
            ↩️ 복구하기
          </button>
          <button class="btn-close-tab">
            ✕ 탭 닫기
          </button>
        </div>
      </div>
    `;
    this.messagesContainer.insertAdjacentHTML('beforeend', deletedHtml);

    // 복구 버튼 이벤트
    const restoreBtn = this.messagesContainer.querySelector('.btn-restore');
    restoreBtn?.addEventListener('click', () => {
      const wsId = restoreBtn.dataset.workspaceId;
      if (wsId && window.workspaceStore?.restoreWorkspace) {
        window.workspaceStore.restoreWorkspace(wsId);
        // 탭 상태도 복구
        if (window.newTabManager?.unmarkTabAsDeleted) {
          window.newTabManager.unmarkTabAsDeleted(wsId);
        }
        // 작업공간 다시 로드
        if (window.ModuleB) {
          window.ModuleB.goWorkspace(wsId);
        }
      }
    });

    // 탭 닫기 버튼 이벤트
    const closeBtn = this.messagesContainer.querySelector('.btn-close-tab');
    closeBtn?.addEventListener('click', () => {
      if (window.newTabManager?.closeTabByWorkspace && workspaceId) {
        window.newTabManager.closeTabByWorkspace(workspaceId);
      }
    });

    // 제목 업데이트
    if (this.titleEl) this.titleEl.textContent = '삭제된 작업공간';
    if (this.breadcrumbEl) this.breadcrumbEl.textContent = '';
  }

  // 메시지 렌더링 (모드에 따라 분기)
  renderMessage(msg) {
    // 시스템 메시지 처리 (모듈 2)
    if (msg.type === 'system') {
      return this.renderSystemMessage(msg);
    }

    // 페르소나 모드일 때 (모듈 4)
    if (this.chatMode === 'persona') {
      return this.renderPersonaMessage(msg);
    }

    // 표준 모드 (GPT 스타일)
    return this.renderStandardMessage(msg);
  }

  // 모듈 1: 표준 모드 메시지 렌더링 (GPT/Gemini 스타일)
  renderStandardMessage(msg) {
    const isUser = msg.type === 'user';

    if (isUser) {
      // 사용자 메시지: 오른쪽 정렬 버블
      return `
        <div class="message user-message standard-mode">
          <div class="message-content">
            <div class="user-bubble">${msg.content}</div>
          </div>
        </div>
      `;
    } else {
      // AI 메시지: 전체 너비 블록 (GPT 스타일 - 아이콘 없음)
      let branchesHtml = '';
      if (msg.branches) {
        branchesHtml = `<div class="branch-actions">`;
        for (const branch of msg.branches) {
          const activeClass = branch.active ? 'active' : '';
          branchesHtml += `
            <button class="branch-btn ${activeClass}" data-branch="${branch.id}">
              ${branch.text}
            </button>
          `;
        }
        branchesHtml += `</div>`;
      }

      // 노드 ID를 data 속성으로 추가
      const nodeIdAttr = msg.nodeId ? `data-node-id="${msg.nodeId}"` : '';

      return `
        <div class="message ai-message standard-mode" ${nodeIdAttr}>
          <div class="ai-response-block">
            <div class="ai-content">${msg.content}</div>
            ${branchesHtml}
            <div class="message-actions">
              <button class="action-btn" data-action="copy">📋 복사</button>
              <button class="action-btn" data-action="like">👍</button>
              <button class="action-btn" data-action="branch">🌿 분기</button>
              <button class="action-btn ask-experts-btn" data-action="ask-experts">🎭 전문가에게 물어보기</button>
            </div>
          </div>
        </div>
      `;
    }
  }

  // 모듈 2: 시스템 메시지 렌더링
  renderSystemMessage(msg) {
    return `
      <div class="message system-message">
        <div class="system-message-content">${msg.content}</div>
      </div>
    `;
  }

  // 모듈 4: 페르소나 모드 메시지 렌더링
  renderPersonaMessage(msg) {
    // 사용자 메시지는 표준 모드와 동일
    if (msg.type === 'user') {
      return this.renderStandardMessage(msg);
    }

    // AI 응답 + 전문가 의견
    if (msg.experts && msg.experts.length > 0) {
      let html = '';

      for (const expert of msg.experts) {
        const color = expert.color || '#6b7280';

        html += `
          <div class="message expert-message" data-expert-id="${expert.id}">
            <div class="expert-avatar" style="background: ${color}25; border-color: ${color}">
              ${expert.emoji}
            </div>
            <div class="expert-response">
              <div class="expert-name-tag" style="color: ${color}">${expert.name}</div>
              <div class="expert-bubble" style="border-left-color: ${color}">
                ${expert.content}
              </div>
              <div class="message-actions">
                <button class="action-btn" data-action="copy">📋 복사</button>
                <button class="action-btn" data-action="branch" data-expert-id="${expert.id}">🌿 이 의견으로 분기</button>
              </div>
            </div>
          </div>
        `;
      }

      return html;
    }

    // 전문가 정보 없으면 표준 모드로 렌더링
    return this.renderStandardMessage(msg);
  }

  // 모듈 1: 메시지 액션 버튼 이벤트 바인딩
  bindMessageActions() {
    this.messagesContainer.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('.action-btn');
      if (!actionBtn) return;

      const action = actionBtn.dataset.action;
      const messageEl = actionBtn.closest('.message');

      switch (action) {
        case 'copy':
          this.handleCopyAction(messageEl);
          break;
        case 'like':
          this.handleLikeAction(actionBtn);
          break;
        case 'branch':
          this.handleBranchAction(messageEl);
          break;
        case 'ask-experts':
          this.handleAskExpertsAction(messageEl);
          break;
      }
    });
  }

  // 복사 액션
  handleCopyAction(messageEl) {
    const contentEl = messageEl.querySelector('.ai-content') || messageEl.querySelector('.expert-bubble');
    if (contentEl) {
      const text = contentEl.innerText;
      navigator.clipboard.writeText(text).then(() => {
        console.log('텍스트가 복사되었습니다.');
      });
    }
  }

  // 좋아요 액션 (토글)
  handleLikeAction(btn) {
    btn.classList.toggle('liked');
    if (btn.classList.contains('liked')) {
      btn.textContent = '👍 좋아요';
    } else {
      btn.textContent = '👍';
    }
  }

  // 분기 액션 - 실제로 새 분기를 생성
  handleBranchAction(messageEl) {
    console.log('분기 생성 요청');

    // 클릭한 메시지의 노드 ID 가져오기
    let parentNodeId = messageEl.dataset.nodeId;

    // 노드 ID가 없으면 현재 노드 사용 (하위 호환성)
    if (!parentNodeId) {
      if (window.workspaceStore) {
        const workspace = window.workspaceStore.getCurrentWorkspace();
        parentNodeId = workspace?.currentNode;
      }
    }

    if (!parentNodeId) {
      console.warn('[ChatManager] 분기를 생성할 노드를 찾을 수 없습니다');
      return;
    }

    console.log('[ChatManager] 분기 생성 대상 노드:', parentNodeId);

    // 분기 이름 입력받기
    const branchName = prompt('새 분기 이름을 입력하세요:', '새 분기');
    if (!branchName || !branchName.trim()) {
      return;
    }

    // treeManager로 새 분기 생성
    if (window.treeManager && window.treeManager.createBranch) {
      const newNodeId = window.treeManager.createBranch(parentNodeId, branchName.trim());
      if (newNodeId) {
        console.log('[ChatManager] 새 분기 생성됨:', newNodeId);
        // 새 분기로 이동
        if (this.onBranchClick) {
          this.onBranchClick(newNodeId);
        }
      }
    } else {
      console.warn('[ChatManager] treeManager.createBranch를 찾을 수 없습니다');
    }
  }

  // 전문가에게 물어보기 액션 (모듈 5에서 구현)
  handleAskExpertsAction(messageEl) {
    // 모듈 5에서 showExpertSelector() 호출
    if (typeof this.showExpertSelector === 'function') {
      this.showExpertSelector();
    } else {
      console.log('전문가에게 물어보기 - 모듈 5에서 구현 예정');
    }
  }

  // ========================================
  // 모듈 2: 컨텍스트 바 + 모드 전환
  // ========================================

  // 컨텍스트 바 업데이트
  updateContextBar() {
    const iconEl = this._el('context-icon');
    const textEl = this._el('context-text');
    const actionsEl = this._el('context-actions');

    if (!iconEl || !textEl || !actionsEl) return;

    if (this.chatMode === 'standard') {
      iconEl.textContent = '🤖';
      textEl.textContent = 'AI와 대화 중';
      actionsEl.innerHTML = '';
    } else if (this.chatMode === 'persona') {
      const expertNames = this.activeExperts.map(e => e.name).join(', ');
      iconEl.textContent = '🎭';
      textEl.textContent = `${expertNames}와 토론 중`;
      actionsEl.innerHTML = `
        <button class="context-toggle" id="context-toggle-standard">🤖 1:1 전환</button>
      `;

      // 1:1 전환 버튼 이벤트
      const toggleBtn = document.getElementById('context-toggle-standard');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          this.switchToStandardMode();
        });
      }
    }
  }

  // 표준 모드로 전환
  switchToStandardMode() {
    this.chatMode = 'standard';
    this.activeExperts = [];

    // 시스템 메시지 추가
    const systemMsg = this.renderSystemMessage({
      type: 'system',
      content: '🤖 1:1 대화로 돌아갑니다'
    });
    this.messagesContainer.insertAdjacentHTML('beforeend', systemMsg);
    this.scrollToBottom();

    // 컨텍스트 바 갱신
    this.updateContextBar();

    // 패널 갱신 (모듈 3에서 연동)
    if (typeof panelManager !== 'undefined' && panelManager.renderPerspectives) {
      panelManager.renderPerspectives(getWorkspace());
    }

    console.log('표준 모드로 전환됨');
  }

  // 페르소나 모드로 전환
  switchToPersonaMode(experts) {
    if (!experts || experts.length === 0) return;

    this.chatMode = 'persona';
    this.activeExperts = experts;

    // 시스템 메시지 추가
    const expertNames = experts.map(e => `${e.emoji} ${e.name}`).join(', ');
    const systemMsg = this.renderSystemMessage({
      type: 'system',
      content: `🎭 ${expertNames}가 참여했습니다`
    });
    this.messagesContainer.insertAdjacentHTML('beforeend', systemMsg);
    this.scrollToBottom();

    // 컨텍스트 바 갱신
    this.updateContextBar();

    // 패널 갱신 (모듈 3에서 연동)
    if (typeof panelManager !== 'undefined' && panelManager.renderPerspectives) {
      panelManager.renderPerspectives(getWorkspace());
    }

    console.log('페르소나 모드로 전환됨:', experts.map(e => e.name));
  }

  // 전문가 추가 (이미 페르소나 모드인 경우)
  addExpert(expert) {
    // 중복 방지
    if (this.activeExperts.some(e => e.id === expert.id)) {
      console.log('이미 초대된 전문가입니다:', expert.name);
      return;
    }

    this.activeExperts.push(expert);

    // 시스템 메시지 추가
    const systemMsg = this.renderSystemMessage({
      type: 'system',
      content: `${expert.emoji} ${expert.name}가 참여했습니다`
    });
    this.messagesContainer.insertAdjacentHTML('beforeend', systemMsg);
    this.scrollToBottom();

    // 컨텍스트 바 갱신
    this.updateContextBar();

    console.log('전문가 추가됨:', expert.name);
  }

  // 전문가 제거
  removeExpert(expertId) {
    const expert = this.activeExperts.find(e => e.id === expertId);
    if (!expert) return;

    this.activeExperts = this.activeExperts.filter(e => e.id !== expertId);

    // 마지막 전문가면 표준 모드로 복귀
    if (this.activeExperts.length === 0) {
      this.switchToStandardMode();
    } else {
      // 컨텍스트 바 갱신
      this.updateContextBar();
    }

    console.log('전문가 제거됨:', expert.name);
  }

  // ========================================
  // 모듈 5: 전문가 선택 팝업
  // ========================================

  // 전문가 선택 모달 표시
  showExpertSelector() {
    // 현재 워크스페이스의 전문가 목록 가져오기
    const workspace = getWorkspace();
    const perspectives = workspace.perspectives || [];

    if (perspectives.length === 0) {
      console.log('사용 가능한 전문가가 없습니다.');
      return;
    }

    // 이미 초대된 전문가 제외
    const invitedIds = this.activeExperts.map(e => e.id);
    const availableExperts = perspectives.filter(p => !invitedIds.includes(p.id));

    if (availableExperts.length === 0) {
      console.log('모든 전문가가 이미 초대되었습니다.');
      return;
    }

    // 모달 생성
    const modal = document.createElement('div');
    modal.className = 'expert-selector-modal';
    modal.id = 'expert-selector-modal';

    const expertCards = availableExperts.map(expert => {
      const color = expert.color || '#6b7280';
      return `
        <div class="expert-selector-card" data-id="${expert.id}" style="border-top: 3px solid ${color}">
          <span class="expert-selector-emoji">${expert.emoji}</span>
          <span class="expert-selector-name">${expert.name}</span>
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div class="expert-selector-content">
        <div class="expert-selector-header">
          <h3 class="expert-selector-title">🎭 전문가 선택</h3>
          <button class="expert-selector-close" id="expert-selector-close">×</button>
        </div>
        <p class="expert-selector-desc">대화에 참여시킬 전문가를 선택하세요</p>
        <div class="expert-selector-grid">
          ${expertCards}
        </div>
        <button class="expert-selector-cancel" id="expert-selector-cancel">취소</button>
      </div>
    `;

    // 탭 모드이면 탭 컨테이너에 추가, 아니면 body에 추가
    if (this.tabId && this.container) {
      this.container.appendChild(modal);
    } else {
      document.body.appendChild(modal);
    }

    // 이벤트 바인딩
    this.bindExpertSelectorEvents(modal);
  }

  // 전문가 선택 모달 이벤트 바인딩
  bindExpertSelectorEvents(modal) {
    // 배경 클릭으로 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeExpertSelector();
      }
    });

    // 닫기 버튼
    const closeBtn = modal.querySelector('#expert-selector-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeExpertSelector();
      });
    }

    // 취소 버튼
    const cancelBtn = modal.querySelector('#expert-selector-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.closeExpertSelector();
      });
    }

    // 전문가 카드 클릭
    const cards = modal.querySelectorAll('.expert-selector-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const expertId = card.dataset.id;
        this.selectExpert(expertId);
      });
    });
  }

  // 전문가 선택
  selectExpert(expertId) {
    const workspace = getWorkspace();
    const expert = workspace.perspectives.find(p => p.id === expertId);
    if (!expert) return;

    // 모달 닫기
    this.closeExpertSelector();

    // 첫 번째 초대면 페르소나 모드로 전환
    if (this.activeExperts.length === 0) {
      this.switchToPersonaMode([expert]);
    } else {
      // 추가 초대
      this.addExpert(expert);
    }

    // 패널 갱신
    if (typeof panelManager !== 'undefined' && panelManager.renderPerspectives) {
      panelManager.renderPerspectives(workspace);
    }
  }

  // 전문가 선택 모달 닫기
  closeExpertSelector() {
    const modal = this._el('expert-selector-modal');
    if (modal) {
      modal.remove();
    }
  }

  // 노드 제목 가져오기
  getNodeTitle(workspace) {
    const findNode = (node, id) => {
      if (node.id === id) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const node = findNode(workspace.tree, workspace.currentNode);
    return node ? node.text : workspace.title;
  }

  // 브레드크럼 생성
  getBreadcrumb(workspace) {
    // 간단한 버전 - 실제로는 경로 추적 필요
    return `${workspace.title} → ${this.getNodeTitle(workspace)}`;
  }

  // 이벤트 바인딩
  bindEvents() {
    // 참고: 전송 버튼 클릭과 Enter 키 이벤트는 module-g-input.js에서 처리함
    // module-g-input.js가 chatManager.sendMessage()를 호출하므로 여기서 중복 바인딩하지 않음

    // 환영 메시지 힌트 버튼
    const root = (this.tabId && this.container) ? this.container : document;
    const welcomeHints = root.querySelectorAll('.chat-welcome-hint');
    welcomeHints.forEach(hint => {
      hint.addEventListener('click', () => {
        const hintText = hint.dataset.hint;
        if (hintText && this.inputEl) {
          this.inputEl.value = hintText + '에 대해 알려주세요';
          this.inputEl.focus();
        }
      });
    });
  }

  // 환영 메시지 숨기기
  hideWelcome() {
    const welcome = this._el('chat-welcome');
    if (welcome) {
      welcome.classList.add('hidden');
    }
  }

  // 환영 메시지 표시
  showWelcome() {
    const welcome = this._el('chat-welcome');
    if (welcome) {
      welcome.classList.remove('hidden');
    }
  }

  // 분기 버튼 이벤트
  bindBranchEvents() {
    const branchBtns = this.messagesContainer.querySelectorAll('.branch-btn');
    branchBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const branchId = btn.dataset.branch;
        
        // 활성 토글
        branchBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        if (this.onBranchClick) {
          this.onBranchClick(branchId);
        }
      });
    });
  }

  // Expert ID → ModuleF persona key 매핑
  mapExpertToPersona(expertId) {
    const mapping = {
      'analyst': 'analyst',
      'designer': 'designer',
      'marketer': 'marketer',
      'strategist': 'strategist',
      'critic': 'critic',
      'data-analyst': 'analyst',
      'devils-advocate': 'critic'
    };
    return mapping[expertId] || 'ai';
  }

  /**
   * 메시지 전송
   * @param {string} text - 전송할 메시지 (없으면 inputEl에서 읽음)
   */
  async sendMessage(text) {
    console.log('[ChatManager] sendMessage 호출');

    // 텍스트가 파라미터로 전달되지 않으면 inputEl에서 읽기
    const messageText = text?.trim() || this.inputEl?.value?.trim();
    console.log('[ChatManager] 입력 텍스트:', messageText);

    if (!messageText) {
      console.log('[ChatManager] 텍스트 없음, 종료');
      return;
    }

    // 환영 메시지 숨기기
    this.hideWelcome();

    // ===== 사용자 메시지 저장 (workspaceStore) =====
    const userMessage = { type: 'user', content: messageText, timestamp: Date.now() };
    if (window.workspaceStore) {
      window.workspaceStore.addMessage(null, userMessage);
      console.log('[ChatManager] 사용자 메시지 저장됨');

      // ===== tree 노드의 conversation.question도 업데이트 =====
      const workspace = window.workspaceStore.getCurrentWorkspace();
      if (workspace && workspace.tree) {
        const currentNode = this._findNodeInTree(workspace.tree, workspace.currentNode);
        if (currentNode) {
          if (!currentNode.conversation) {
            currentNode.conversation = {};
          }
          currentNode.conversation.question = messageText;
          window.workspaceStore.updateTree(workspace.id, workspace.tree);
          console.log('[ChatManager] tree 노드 question 업데이트:', workspace.currentNode);
        }
      }
    }

    // 사용자 메시지 렌더링 (insertAdjacentHTML로 기존 DOM 유지)
    const userMsg = this.renderMessage(userMessage);
    this.messagesContainer.insertAdjacentHTML('beforeend', userMsg);

    // 입력 초기화 (inputEl이 있는 경우)
    if (this.inputEl) {
      this.inputEl.value = '';
    }

    // 스크롤
    this.scrollToBottom();

    // ===== AI 응답 생성 (aiClient 사용) =====
    try {
      const aiResponse = await this._getAIResponse(messageText);

      // AI 응답 렌더링
      this._renderAIResponse(aiResponse);

      // AI 응답 저장
      if (window.workspaceStore) {
        window.workspaceStore.addMessage(null, aiResponse);
        console.log('[ChatManager] AI 응답 저장됨');

        // ===== tree 노드의 conversation.answer도 업데이트 =====
        const workspace = window.workspaceStore.getCurrentWorkspace();
        if (workspace && workspace.tree) {
          const currentNode = this._findNodeInTree(workspace.tree, workspace.currentNode);
          if (currentNode) {
            if (!currentNode.conversation) {
              currentNode.conversation = {};
            }
            currentNode.conversation.answer = aiResponse.content || '';
            window.workspaceStore.updateTree(workspace.id, workspace.tree);
            console.log('[ChatManager] tree 노드 answer 업데이트:', workspace.currentNode);
          }
        }
      }

      this.bindBranchEvents();
      this.scrollToBottom();
    } catch (error) {
      console.error('[ChatManager] AI 응답 실패:', error);
      this._renderErrorMessage('응답을 가져오는 데 실패했습니다.');
    }
  }

  /**
   * AI 응답 가져오기 (aiClient 사용)
   * @private
   */
  async _getAIResponse(messageText) {
    const options = {
      mode: this.chatMode === 'persona' ? 'persona' : 'standard',
      experts: this.activeExperts
    };

    // aiClient가 있으면 사용, 없으면 폴백
    if (window.aiClient) {
      return await window.aiClient.chat(messageText, options);
    }

    // 폴백: 기존 하드코딩 응답
    console.warn('[ChatManager] aiClient 없음, 폴백 응답 사용');
    return this._fallbackResponse(messageText, options);
  }

  /**
   * 폴백 응답 (aiClient 없을 때)
   * @private
   */
  async _fallbackResponse(messageText, options) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (options.mode === 'persona' && options.experts.length > 0) {
      return {
        type: 'ai',
        mode: 'persona',
        experts: options.experts.map(e => ({
          id: e.id,
          emoji: e.emoji,
          name: e.name,
          color: e.color,
          content: `<p>${e.name} 관점에서 "${messageText}"에 대한 의견입니다.</p>`
        })),
        timestamp: Date.now()
      };
    }

    return {
      type: 'ai',
      content: `<p>"${messageText}"에 대해 분석해드릴게요.</p><p>이 주제는 여러 관점에서 접근할 수 있습니다.</p>`,
      timestamp: Date.now()
    };
  }

  /**
   * AI 응답 렌더링
   * @private
   */
  _renderAIResponse(aiResponse) {
    if (aiResponse.mode === 'persona' && aiResponse.experts) {
      // 페르소나 모드
      if (window.ModuleF && window.ModuleF.initialized) {
        const responses = aiResponse.experts.map(e => ({
          persona: this.mapExpertToPersona(e.id),
          content: e.content
        }));
        window.ModuleF.addPersonaGroup(responses);
        console.log('[ChatManager] 페르소나 모드 - ModuleF 렌더링');
      } else {
        const aiMsg = this.renderPersonaMessage(aiResponse);
        this.messagesContainer.insertAdjacentHTML('beforeend', aiMsg);
      }
    } else {
      // 표준 1:1 모드
      const aiMsg = this.renderMessage({
        type: 'ai',
        content: aiResponse.content,
        branches: [{ id: 'new-branch', text: '🌿 이 주제로 가지치기' }]
      });
      this.messagesContainer.insertAdjacentHTML('beforeend', aiMsg);
      console.log('[ChatManager] 1:1 모드 - GPT 스타일 렌더링');
    }
  }

  /**
   * 에러 메시지 렌더링
   * @private
   */
  _renderErrorMessage(errorText) {
    const errorMsg = this.renderSystemMessage({
      type: 'system',
      content: `⚠️ ${errorText}`
    });
    this.messagesContainer.insertAdjacentHTML('beforeend', errorMsg);
    this.scrollToBottom();
  }

  // 스크롤을 하단으로 이동 (chat-area 기준)
  scrollToBottom() {
    const chatArea = this._el('chat-area');
    if (chatArea) {
      chatArea.scrollTo({
        top: chatArea.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  /**
   * 특정 노드로 전환 (트리 노드 클릭 시 호출)
   * 루트부터 현재 노드까지의 전체 대화 히스토리를 표시
   * @param {string} nodeId - 이동할 노드 ID
   */
  switchToNode(nodeId) {
    console.log('[ChatManager] switchToNode:', nodeId);

    // 1. workspace 가져오기
    let workspace = null;
    if (window.workspaceStore) {
      workspace = window.workspaceStore.getCurrentWorkspace();
    }
    if (!workspace && typeof getWorkspace === 'function') {
      workspace = getWorkspace();
    }

    if (!workspace || !workspace.tree) {
      console.warn('[ChatManager] workspace 또는 tree가 없습니다');
      return;
    }

    // 2. 트리에서 해당 노드 찾기
    const node = this._findNodeInTree(workspace.tree, nodeId);
    if (!node) {
      console.warn('[ChatManager] 노드를 찾을 수 없습니다:', nodeId);
      return;
    }

    // 3. 루트부터 현재 노드까지의 경로 가져오기
    const path = this._getNodePath(workspace.tree, nodeId);

    // 4. 브레드크럼 업데이트
    if (this.breadcrumbEl) {
      this.breadcrumbEl.textContent = path.map(n => n.text).join(' > ');
    }

    // 5. 제목 업데이트
    if (this.titleEl) {
      this.titleEl.textContent = node.text || '노드';
    }

    // 6. 전체 대화 히스토리 표시
    if (!this.messagesContainer) return;

    // 기존 메시지 삭제
    const existingMessages = this.messagesContainer.querySelectorAll('.message');
    existingMessages.forEach(el => el.remove());

    // 환영 메시지 숨기기
    const welcomeEl = this._el('chat-welcome');
    if (welcomeEl) welcomeEl.classList.add('hidden');

    // 경로의 모든 노드 대화를 순서대로 표시 (루트부터 현재까지)
    path.forEach((pathNode, index) => {
      const isCurrentNode = (index === path.length - 1);

      if (pathNode.conversation) {
        const { question, answer } = pathNode.conversation;

        // 사용자 질문 표시
        if (question) {
          const userMsg = this.renderMessage({ type: 'user', content: question });
          this.messagesContainer.insertAdjacentHTML('beforeend', userMsg);
        }

        // AI 응답 표시 (모든 메시지에 액션 버튼 포함)
        if (answer) {
          const aiMsg = this.renderMessage({
            type: 'ai',
            content: `<p>${answer}</p>`,
            nodeId: pathNode.id  // 노드 ID 전달
          });
          this.messagesContainer.insertAdjacentHTML('beforeend', aiMsg);
        }

        // 분기점 표시 (현재 노드가 아니고, 자식이 2개 이상인 경우)
        if (!isCurrentNode && pathNode.children && pathNode.children.length >= 2) {
          // 다음 경로의 노드 ID
          const nextNodeInPath = path[index + 1];
          const branchInfo = `
            <div class="message system-message branch-indicator">
              <span class="branch-icon">↳</span>
              <span>${nextNodeInPath?.text || '다음'}</span>
            </div>
          `;
          this.messagesContainer.insertAdjacentHTML('beforeend', branchInfo);
        }
      }
    });

    // 기존 자식 노드들을 버튼으로 표시
    if (node.children && node.children.length > 0) {
      const branches = node.children.map(child => ({
        id: child.id,
        text: `🌿 ${child.text}`
      }));

      const branchHtml = `
        <div class="message ai-message">
          <div class="ai-branches">
            ${branches.map(b => `
              <button class="branch-btn" data-branch-id="${b.id}">
                ${b.text}
              </button>
            `).join('')}
          </div>
        </div>
      `;
      this.messagesContainer.insertAdjacentHTML('beforeend', branchHtml);
    }

    // conversation이 하나도 없으면 빈 상태 표시
    if (path.every(n => !n.conversation)) {
      const emptyHtml = `
        <div class="message system-message">
          <p>이 노드에는 아직 대화가 없습니다.</p>
        </div>
      `;
      this.messagesContainer.insertAdjacentHTML('beforeend', emptyHtml);
    }

    // 분기 버튼 이벤트 바인딩
    this.bindBranchEvents();

    // 스크롤을 하단으로 (최근 대화가 보이도록)
    this.scrollToBottom();

    console.log('[ChatManager] 노드 전환 완료:', node.text, '- 경로 길이:', path.length);
  }

  /**
   * 트리에서 노드 찾기 (재귀)
   * @private
   */
  _findNodeInTree(node, targetId) {
    if (!node) return null;
    if (node.id === targetId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = this._findNodeInTree(child, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 루트부터 해당 노드까지의 경로 반환
   * @private
   */
  _getNodePath(tree, targetId, path = []) {
    if (!tree) return [];

    path.push(tree);

    if (tree.id === targetId) {
      return path;
    }

    if (tree.children) {
      for (const child of tree.children) {
        const found = this._getNodePath(child, targetId, [...path]);
        if (found.length > 0 && found[found.length - 1].id === targetId) {
          return found;
        }
      }
    }

    return [];
  }
}

// 전역 인스턴스
let chatManager = null;

function initChatManager() {
  if (chatManager) return; // 이미 초기화됨

  chatManager = new ChatManager(document, null);
  window.chatManager = chatManager; // 전역에도 노출
  console.log('[ChatManager] 초기화 완료', {
    messagesContainer: !!chatManager.messagesContainer,
    inputEl: !!chatManager.inputEl,
    sendBtn: !!chatManager.sendBtn
  });
}

// DOMContentLoaded가 이미 발생했으면 즉시 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatManager);
} else {
  // DOM이 이미 준비됨
  initChatManager();
}
