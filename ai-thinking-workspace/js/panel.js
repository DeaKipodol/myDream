// ========================================
// 패널 관리 - AI 생각 작업공간
// 모듈 3: 전문가 초대/해제 관리 UI
// ========================================

class PanelManager {
  constructor(parentContainer, tabId) {
    this.tabId = tabId || null;
    this.parentContainer = parentContainer || document;

    this.container = this._el('panel-content');
    this.tabs = this.parentContainer.querySelectorAll('.panel-tab');
    this.addBtn = this._el('add-perspective-btn');

    this.currentTab = 'perspectives';
    this.bindEvents();
  }

  _el(id) {
    if (this.tabId) {
      const scoped = this.parentContainer.querySelector(`#${id}--${this.tabId}`);
      if (scoped) return scoped;
    }
    return document.getElementById(id);
  }

  // 패널 렌더링
  render(workspace) {
    if (this.currentTab === 'perspectives') {
      this.renderPerspectives(workspace);
    } else {
      this.renderSources(workspace);
    }
  }

  // 모듈 3: 관점/전문가 렌더링 (초대/해제 UI)
  renderPerspectives(workspace) {
    if (!workspace) {
      workspace = getWorkspace();
    }

    const allExperts = workspace.perspectives || [];
    const activeExperts = (typeof chatManager !== 'undefined') ? chatManager.activeExperts : [];
    const invitedIds = activeExperts.map(e => e.id);

    // 초대된 전문가와 미초대 전문가 분리
    const invited = allExperts.filter(p => invitedIds.includes(p.id));
    const pool = allExperts.filter(p => !invitedIds.includes(p.id));

    let html = '';

    // 초대된 전문가가 없을 때: 빈 상태 UI
    if (invited.length === 0) {
      html += `
        <div class="expert-empty-state">
          <span class="empty-icon">🎭</span>
          <p>아직 초대된 전문가가 없습니다</p>
          <p class="empty-sub">전문가를 초대하여 다양한 관점을 들어보세요</p>
        </div>
      `;
    } else {
      // 참여 중인 전문가 섹션
      html += `
        <div class="invited-experts">
          <h3 class="expert-section-title">참여 중인 전문가</h3>
          ${invited.map(p => this.renderExpertCard(p, true)).join('')}
        </div>
      `;
    }

    // 추천 전문가 섹션 (미초대)
    if (pool.length > 0) {
      html += `
        <div class="expert-pool">
          <h3 class="expert-section-title">추천 전문가</h3>
          ${pool.map(p => this.renderExpertCard(p, false)).join('')}
        </div>
      `;
    }

    this.container.innerHTML = html;
    this.bindExpertEvents();
  }

  // 전문가 카드 렌더링
  renderExpertCard(expert, isInvited) {
    const cardClass = isInvited ? 'expert-card invited' : 'expert-card';
    const colorStyle = expert.color ? `border-left: 3px solid ${expert.color};` : '';
    const buttonHtml = isInvited
      ? `<button class="expert-remove-btn" data-id="${expert.id}">해제</button>`
      : `<button class="expert-invite-btn" data-id="${expert.id}">초대</button>`;

    return `
      <div class="${cardClass}" data-id="${expert.id}" style="${colorStyle}">
        <div class="expert-card-info">
          <div class="expert-card-header">
            <span class="expert-emoji">${expert.emoji}</span>
            <span class="expert-name">${expert.name}</span>
          </div>
          <p class="expert-desc">${expert.text}</p>
        </div>
        <div class="expert-card-actions">
          ${buttonHtml}
        </div>
      </div>
    `;
  }

  // 전문가 초대
  inviteExpert(expertId) {
    const workspace = getWorkspace();
    const expert = workspace.perspectives.find(p => p.id === expertId);
    if (!expert) return;

    // chatManager가 없으면 종료
    if (typeof chatManager === 'undefined') return;

    // 이미 초대된 전문가면 무시
    if (chatManager.activeExperts.some(e => e.id === expertId)) {
      console.log('이미 초대된 전문가입니다:', expert.name);
      return;
    }

    // 첫 번째 초대면 페르소나 모드로 전환
    if (chatManager.activeExperts.length === 0) {
      chatManager.switchToPersonaMode([expert]);
    } else {
      // 추가 초대
      chatManager.addExpert(expert);
    }

    // 패널 다시 렌더링
    this.renderPerspectives(workspace);
  }

  // 전문가 해제
  removeExpert(expertId) {
    if (typeof chatManager === 'undefined') return;

    chatManager.removeExpert(expertId);

    // 패널 다시 렌더링
    this.renderPerspectives(getWorkspace());
  }

  // 전문가 이벤트 바인딩
  bindExpertEvents() {
    // 초대 버튼
    const inviteBtns = this.container.querySelectorAll('.expert-invite-btn');
    inviteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expertId = btn.dataset.id;
        this.inviteExpert(expertId);
      });
    });

    // 해제 버튼
    const removeBtns = this.container.querySelectorAll('.expert-remove-btn');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expertId = btn.dataset.id;
        this.removeExpert(expertId);
      });
    });

    // 새 전문가 만들기 버튼
    const createBtn = this.container.querySelector('#create-expert-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.showCreateExpertDialog();
      });
    }
  }

  // 새 전문가 생성 다이얼로그
  showCreateExpertDialog() {
    // 간단한 prompt로 입력받기
    const name = prompt('전문가 이름을 입력하세요:');
    if (!name || !name.trim()) return;

    const emoji = prompt('이모지를 입력하세요 (예: 🎯, 📊, 🧙):', '🎭');
    if (!emoji) return;

    const text = prompt('전문가 설명을 입력하세요:', '');

    // workspaceStore에 저장
    const newExpert = this.addPerspectiveToStore({
      name: name.trim(),
      emoji: emoji.trim(),
      text: text || '',
      color: this._getRandomColor()
    });

    if (newExpert) {
      console.log('[PanelManager] 새 전문가 생성됨:', newExpert);
    }
  }

  // 랜덤 색상 생성
  _getRandomColor() {
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // 자료 렌더링
  renderSources(workspace) {
    if (!workspace.sources || workspace.sources.length === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <p>연결된 자료가 없습니다.</p>
        </div>
      `;
      return;
    }

    let html = '';
    for (const s of workspace.sources) {
      html += `
        <div class="source-item">
          <div class="source-header">
            <span class="source-icon">${s.icon}</span>
            <span class="source-name">${s.name}</span>
            <span class="source-page">${s.page}</span>
          </div>
          <div class="source-content">
            ${s.content}
          </div>
        </div>
      `;
    }
    this.container.innerHTML = html;
  }

  // 이벤트 바인딩
  bindEvents() {
    // 탭 전환
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.render(getWorkspace());
      });
    });

    // 전문가 초대하기 버튼 → 새 전문가 만들기
    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => {
        this.showCreateExpertDialog();
      });
    }
  }

  // 전문가 풀 표시 (초대 가능한 전문가만)
  showExpertPool() {
    // 현재 탭을 perspectives로 설정하고 렌더링
    this.currentTab = 'perspectives';
    this.render(getWorkspace());
  }

  // 관점 탭 표시
  showPerspectives() {
    this.currentTab = 'perspectives';
    this.render(getWorkspace());
  }

  // 자료 탭 표시
  showSources() {
    this.currentTab = 'sources';
    this.render(getWorkspace());
  }

  // ===== WorkspaceStore 연결 메서드 (TODO #11) =====

  /**
   * 전문가(관점) 추가 - WorkspaceStore에 저장
   * @param {Object} perspective - 추가할 관점 객체 {emoji, name, text, color}
   * @returns {Object|null} 생성된 관점 또는 null
   */
  addPerspectiveToStore(perspective) {
    // WorkspaceStore 확인
    if (!window.workspaceStore) {
      console.warn('[PanelManager] workspaceStore가 없습니다');
      return null;
    }

    const workspace = window.workspaceStore.getCurrentWorkspace();
    if (!workspace) {
      console.warn('[PanelManager] 현재 작업공간이 없습니다');
      return null;
    }

    // perspectives 배열이 없으면 생성
    if (!workspace.perspectives) {
      workspace.perspectives = [];
    }

    // 새 관점 생성
    const newPerspective = {
      id: 'persp-' + Date.now(),
      emoji: perspective.emoji || '🎭',
      name: perspective.name || '새 조언자',
      text: perspective.text || '',
      color: perspective.color || '#3b82f6',
      active: false
    };

    workspace.perspectives.push(newPerspective);

    // WorkspaceStore에 저장
    window.workspaceStore.updatePerspectives(workspace.id, workspace.perspectives);

    // 리렌더링
    this.renderPerspectives(workspace);

    console.log('[PanelManager] 관점 추가됨:', newPerspective.id, newPerspective.name);
    return newPerspective;
  }

  /**
   * 전문가(관점) 삭제 - WorkspaceStore에서 제거
   * @param {string} perspectiveId - 삭제할 관점 ID
   * @returns {boolean} 성공 여부
   */
  removePerspectiveFromStore(perspectiveId) {
    // WorkspaceStore 확인
    if (!window.workspaceStore) {
      console.warn('[PanelManager] workspaceStore가 없습니다');
      return false;
    }

    const workspace = window.workspaceStore.getCurrentWorkspace();
    if (!workspace || !workspace.perspectives) {
      console.warn('[PanelManager] workspace 또는 perspectives가 없습니다');
      return false;
    }

    const index = workspace.perspectives.findIndex(p => p.id === perspectiveId);
    if (index === -1) {
      console.warn('[PanelManager] 관점을 찾을 수 없습니다:', perspectiveId);
      return false;
    }

    workspace.perspectives.splice(index, 1);

    // WorkspaceStore에 저장
    window.workspaceStore.updatePerspectives(workspace.id, workspace.perspectives);

    // 리렌더링
    this.renderPerspectives(workspace);

    console.log('[PanelManager] 관점 삭제됨:', perspectiveId);
    return true;
  }

  /**
   * 전문가 활성화 토글 - WorkspaceStore에 저장
   * @param {string} perspectiveId - 토글할 관점 ID
   * @returns {boolean} 성공 여부
   */
  togglePerspectiveActive(perspectiveId) {
    // WorkspaceStore 확인
    if (!window.workspaceStore) {
      console.warn('[PanelManager] workspaceStore가 없습니다');
      return false;
    }

    const workspace = window.workspaceStore.getCurrentWorkspace();
    if (!workspace || !workspace.perspectives) {
      console.warn('[PanelManager] workspace 또는 perspectives가 없습니다');
      return false;
    }

    const persp = workspace.perspectives.find(p => p.id === perspectiveId);
    if (!persp) {
      console.warn('[PanelManager] 관점을 찾을 수 없습니다:', perspectiveId);
      return false;
    }

    persp.active = !persp.active;

    // WorkspaceStore에 저장
    window.workspaceStore.updatePerspectives(workspace.id, workspace.perspectives);

    // 리렌더링
    this.renderPerspectives(workspace);

    console.log('[PanelManager] 관점 활성화 토글:', perspectiveId, '->', persp.active);
    return true;
  }
}

// 전역 인스턴스
let panelManager = new PanelManager();
