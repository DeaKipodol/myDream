// ========================================
// 트리 관리 - AI 생각 작업공간
// ========================================

class TreeManager {
  constructor(containerId, parentContainer, tabId) {
    this.tabId = tabId || null;
    if (this.tabId && parentContainer) {
      const scopedId = `${containerId}--${this.tabId}`;
      this.container = parentContainer.querySelector(`#${scopedId}`);
    } else {
      this.container = document.getElementById(containerId);
    }
    this.onNodeClick = null;
  }

  // 트리 렌더링
  render(workspace) {
    if (!this.container) return;

    const tree = workspace.tree;
    // currentNode를 저장하여 renderNode에서 사용
    this._currentNodeId = workspace.currentNode || null;
    this.container.innerHTML = this.renderNode(tree, true);
    this.bindEvents();
  }

  // 노드 렌더링 (재귀)
  renderNode(node, isRoot = false) {
    const hasChildren = node.children && node.children.length > 0;
    // currentNode 기반으로 active 판단 (node.active 대신)
    const isActive = this._currentNodeId === node.id;
    
    let badgeHtml = '';
    if (node.badge) {
      const badgeClass = node.badge === 'complete' ? 'complete' : '';
      const badgeText = node.badge === 'complete' ? '✓' : node.badge;
      badgeHtml = `<span class="node-badge ${badgeClass}">${badgeText}</span>`;
    }

    let iconHtml = '';
    if (node.icon === 'Q') {
      iconHtml = `<span class="node-icon qa-icon">Q</span>`;
    }
    
    let html = `
      <div class="tree-node" data-id="${node.id}">
        <div class="tree-node-content ${isActive ? 'active' : ''}">
          <span class="node-bullet ${isActive ? 'active' : ''}"></span>
          ${iconHtml}
          <span class="node-text">${node.text}</span>
          ${badgeHtml}
        </div>
    `;
    
    if (hasChildren) {
      html += `<div class="tree-children">`;
      for (const child of node.children) {
        html += this.renderNode(child);
      }
      html += `</div>`;
    }
    
    html += `</div>`;
    return html;
  }

  // 이벤트 바인딩
  bindEvents() {
    const nodeContents = this.container.querySelectorAll('.tree-node-content');
    nodeContents.forEach(content => {
      content.addEventListener('click', (e) => {
        const nodeId = content.closest('.tree-node').dataset.id;
        this.setActiveNode(nodeId);
        if (this.onNodeClick) {
          this.onNodeClick(nodeId);
        }
      });
    });
  }

  // 활성 노드 설정
  setActiveNode(nodeId) {
    // 내부 상태 업데이트 (re-render 시에도 유지)
    this._currentNodeId = nodeId;

    // 기존 활성 제거
    this.container.querySelectorAll('.tree-node-content.active').forEach(el => {
      el.classList.remove('active');
      el.querySelector('.node-bullet')?.classList.remove('active');
    });

    // 새 활성 설정
    const node = this.container.querySelector(`[data-id="${nodeId}"]`);
    if (node) {
      const content = node.querySelector('.tree-node-content');
      content.classList.add('active');
      content.querySelector('.node-bullet')?.classList.add('active');
    }

    console.log('[TreeManager] setActiveNode:', nodeId);
  }

  // ===== WorkspaceStore 연결 메서드 (TODO #10) =====

  /**
   * 새 분기 생성
   * @param {string} parentNodeId - 부모 노드 ID
   * @param {string} branchText - 분기 텍스트
   * @returns {string|null} 생성된 노드 ID 또는 null
   */
  createBranch(parentNodeId, branchText) {
    // WorkspaceStore 확인
    if (!window.workspaceStore) {
      console.warn('[TreeManager] workspaceStore가 없습니다');
      return null;
    }

    const workspace = window.workspaceStore.getCurrentWorkspace();
    if (!workspace || !workspace.tree) {
      console.warn('[TreeManager] workspace 또는 tree가 없습니다');
      return null;
    }

    // 부모 노드 찾기
    const parentNode = this.findNode(workspace.tree, parentNodeId);
    if (!parentNode) {
      console.warn('[TreeManager] 부모 노드를 찾을 수 없습니다:', parentNodeId);
      return null;
    }

    // 새 노드 생성
    const newNodeId = 'node-' + Date.now();
    const newNode = {
      id: newNodeId,
      text: branchText || '새 분기',
      children: [],
      active: false,
      conversation: {
        question: branchText || '새 분기',
        answer: ''
      }
    };

    // 부모에 자식 추가
    if (!parentNode.children) {
      parentNode.children = [];
    }
    parentNode.children.push(newNode);

    // WorkspaceStore에 저장
    window.workspaceStore.updateTree(workspace.id, workspace.tree);

    // 리렌더링
    this.render(workspace);

    console.log('[TreeManager] 분기 생성됨:', newNodeId, 'from parent:', parentNodeId);
    return newNodeId;
  }

  /**
   * 트리에서 노드 찾기 (재귀)
   * @param {Object} node - 트리 노드
   * @param {string} targetId - 찾을 노드 ID
   * @returns {Object|null} 찾은 노드 또는 null
   */
  findNode(node, targetId) {
    if (!node) return null;
    if (node.id === targetId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNode(child, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 노드 삭제
   * @param {string} nodeId - 삭제할 노드 ID
   * @returns {boolean} 성공 여부
   */
  deleteNode(nodeId) {
    // 루트 노드는 삭제 불가
    if (nodeId === 'root') {
      console.warn('[TreeManager] 루트 노드는 삭제할 수 없습니다');
      return false;
    }

    // WorkspaceStore 확인
    if (!window.workspaceStore) {
      console.warn('[TreeManager] workspaceStore가 없습니다');
      return false;
    }

    const workspace = window.workspaceStore.getCurrentWorkspace();
    if (!workspace || !workspace.tree) {
      console.warn('[TreeManager] workspace 또는 tree가 없습니다');
      return false;
    }

    // 트리에서 노드 제거
    const removed = this._removeNodeFromTree(workspace.tree, nodeId);
    if (!removed) {
      console.warn('[TreeManager] 노드를 찾을 수 없습니다:', nodeId);
      return false;
    }

    // WorkspaceStore에 저장
    window.workspaceStore.updateTree(workspace.id, workspace.tree);

    // 리렌더링
    this.render(workspace);

    console.log('[TreeManager] 노드 삭제됨:', nodeId);
    return true;
  }

  /**
   * 트리에서 노드 제거 (재귀)
   * @private
   * @param {Object} node - 현재 노드
   * @param {string} targetId - 삭제할 노드 ID
   * @returns {boolean} 제거 성공 여부
   */
  _removeNodeFromTree(node, targetId) {
    if (!node || !node.children) return false;

    const index = node.children.findIndex(child => child.id === targetId);
    if (index !== -1) {
      node.children.splice(index, 1);
      return true;
    }

    // 자식 노드들에서 재귀적으로 찾기
    for (const child of node.children) {
      if (this._removeNodeFromTree(child, targetId)) {
        return true;
      }
    }

    return false;
  }
}

// 전역 인스턴스
let treeManager = new TreeManager('tree-container');

// 전역 노출 (새 모듈 시스템에서 사용)
window.TreeManager = TreeManager;
window.treeManager = treeManager;  // 인스턴스도 노출 (NODE_SWITCHED 핸들러에서 사용)

// ========================================
// D3.js 포크 뷰 - Subway Map Style
// ========================================

class D3TreeView {
  constructor(containerId) {
    this.container = d3.select(`#${containerId}`);
    this.svg = null;
    this.g = null;
    this.treeLayout = null;
    this.zoom = null;
    this.currentTransform = d3.zoomIdentity;
    this.onNodeClick = null;
    this.onNodeDoubleClick = null;
  }

  // 초기화
  init() {
    // 기존 SVG 제거
    this.container.selectAll('*').remove();

    // 컨테이너 크기
    const rect = this.container.node().getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // SVG 생성
    this.svg = this.container
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // 줌/팬 그룹
    this.g = this.svg.append('g');

    // 줌 설정
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        this.currentTransform = event.transform;
        this.g.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    // 트리 레이아웃 (Horizontal)
    this.treeLayout = d3.tree()
      .nodeSize([120, 250]); // [세로 간격, 가로 간격] - 증가
  }

  // 트리 렌더링
  render(treeData, activeNodeId = null, previousNodeId = null) {
    if (!this.svg) this.init();

    // D3 계층 구조 변환
    const root = d3.hierarchy(treeData);

    // 레이아웃 계산
    this.treeLayout(root);

    // 링크 (branches) 렌더링
    this.renderLinks(root, activeNodeId, previousNodeId);

    // 노드 (stations) 렌더링
    this.renderNodes(root, activeNodeId);

    // 초기 위치 조정 (root를 화면 왼쪽 중앙에)
    const rect = this.container.node().getBoundingClientRect();
    const initialTransform = d3.zoomIdentity
      .translate(100, rect.height / 2);
    
    this.svg.transition()
      .duration(800)
      .call(this.zoom.transform, initialTransform);
  }

  // 링크 렌더링
  renderLinks(root, activeNodeId = null, previousNodeId = null) {
    // Active path 계산 (root → activeNode)
    let activePathNodes = new Set();
    if (activeNodeId) {
      const activeNode = root.descendants().find(d => d.data.id === activeNodeId);
      if (activeNode) {
        activeNode.ancestors().forEach(node => {
          activePathNodes.add(node);
        });
      }
    }

    // Previous path 계산 (root → previousNode)
    let previousPathNodes = new Set();
    if (previousNodeId) {
      const previousNode = root.descendants().find(d => d.data.id === previousNodeId);
      if (previousNode) {
        previousNode.ancestors().forEach(node => {
          previousPathNodes.add(node);
        });
      }
    }

    const links = this.g.selectAll('.subway-line')
      .data(root.links(), d => `${d.source.data.id}-${d.target.data.id}`);

    // Exit
    links.exit()
      .transition()
      .duration(300)
      .style('opacity', 0)
      .remove();

    // Enter + Update
    const linkEnter = links.enter()
      .append('path')
      .style('opacity', 0);

    // 클래스 설정 (Enter + Update 모두)
    const allLinks = linkEnter.merge(links);

    allLinks.attr('class', d => {
      let classes = 'subway-line';

      // 우선순위: active > previous > default
      const isActivePath = activePathNodes.has(d.source) && activePathNodes.has(d.target);
      const isPreviousPath = previousPathNodes.has(d.source) && previousPathNodes.has(d.target);

      if (isActivePath) {
        classes += ' active-path';
      } else if (isPreviousPath) {
        classes += ' previous-path';
      }

      return classes;
    });

    // Transition
    allLinks
      .transition()
      .duration(800)
      .style('opacity', 1)
      .attr('d', d3.linkHorizontal()
        .x(d => d.y)  // Horizontal: x와 y 교체
        .y(d => d.x)
      );
  }

  // 노드 렌더링
  renderNodes(root, activeNodeId) {
    const nodes = this.g.selectAll('.subway-station-group')
      .data(root.descendants(), d => d.data.id);

    // Exit
    nodes.exit()
      .transition()
      .duration(300)
      .style('opacity', 0)
      .remove();

    // Enter
    const nodeEnter = nodes.enter()
      .append('g')
      .attr('class', 'subway-station-group')
      .style('opacity', 0)
      .style('cursor', 'pointer');

    // 싱글 클릭과 더블 클릭 구분
    let clickTimer = null;
    const clickDelay = 250; // ms

    nodeEnter
      .on('click', (event, d) => {
        event.preventDefault();

        if (clickTimer) {
          // 더블 클릭
          clearTimeout(clickTimer);
          clickTimer = null;

          if (this.onNodeDoubleClick) {
            this.onNodeDoubleClick(d.data.id);
          }
        } else {
          // 싱글 클릭 대기
          clickTimer = setTimeout(() => {
            clickTimer = null;

            if (this.onNodeClick) {
              this.onNodeClick(d.data.id);
            }
          }, clickDelay);
        }
      });

    // 노드 원형 (depth별 크기 차별화)
    nodeEnter.append('circle')
      .attr('class', d => {
        return d.data.id === activeNodeId ? 'subway-station active' : 'subway-station';
      })
      .attr('r', d => {
        if (d.data.id === activeNodeId) return 12;
        const depth = d.depth;
        if (depth === 0) return 14;      // root
        if (depth === 1) return 10;      // 1단계
        return 7;                         // 2단계+
      })
      .style('stroke-width', d => {
        const depth = d.depth;
        return depth === 0 ? 4 : (depth === 1 ? 3 : 2);
      });

    // 노드 레이블 (우측 배치)
    nodeEnter.append('text')
      .attr('class', 'subway-label')
      .attr('x', 15)                    // 노드 우측으로
      .attr('y', 5)                     // 약간 아래
      .attr('text-anchor', 'start')     // 왼쪽 정렬
      .text(d => {
        // 텍스트 길이 제한 (20자)
        const text = d.data.text || '';
        return text.length > 20 ? text.substring(0, 20) + '...' : text;
      });

    // Badge 배경 (자식 개수)
    nodeEnter.append('circle')
      .filter(d => d.children && d.children.length > 0)
      .attr('class', 'subway-badge-bg')
      .attr('cx', 12)
      .attr('cy', -10)
      .attr('r', 9)
      .style('fill', '#ef4444')
      .style('stroke', 'white')
      .style('stroke-width', 2);

    // Badge 텍스트 (자식 개수)
    nodeEnter.append('text')
      .filter(d => d.children && d.children.length > 0)
      .attr('class', 'subway-badge-text')
      .attr('x', 12)
      .attr('y', -6)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => d.children.length);

    // Enter + Update
    nodeEnter.merge(nodes)
      .transition()
      .duration(800)
      .style('opacity', 1)
      .attr('transform', d => `translate(${d.y},${d.x})`);

    // 툴팁 생성
    let tooltip = d3.select('.subway-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body').append('div')
        .attr('class', 'subway-tooltip')
        .style('opacity', 0);
    }

    // Hover 효과 + 툴팁
    this.g.selectAll('.subway-station-group')
      .on('mouseenter', (event, d) => {
        // 노드 크기 확대
        const isActive = d.data.id === activeNodeId;
        const depth = d.depth;
        const hoverSize = isActive ? 14 : (depth === 0 ? 16 : (depth === 1 ? 12 : 9));

        d3.select(event.currentTarget)
          .select('circle.subway-station')
          .transition()
          .duration(200)
          .attr('r', hoverSize);

        // 툴팁 내용
        const question = d.data.conversation?.question || d.data.text;
        const childCount = d.children?.length || 0;

        tooltip
          .html(`
            <div class="tooltip-title">${d.data.text}</div>
            <div class="tooltip-question">"${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"</div>
            <div class="tooltip-meta">${childCount}개 분기</div>
          `)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 28) + 'px')
          .transition()
          .duration(200)
          .style('opacity', 1);
      })
      .on('mouseleave', (event, d) => {
        // 노드 원래 크기로
        const isActive = d.data.id === activeNodeId;
        const depth = d.depth;
        const normalSize = isActive ? 12 : (depth === 0 ? 14 : (depth === 1 ? 10 : 7));

        d3.select(event.currentTarget)
          .select('circle.subway-station')
          .transition()
          .duration(200)
          .attr('r', normalSize);

        // 툴팁 숨김
        tooltip.transition()
          .duration(200)
          .style('opacity', 0);
      });
  }

  // 줌 제어
  zoomIn() {
    this.svg.transition()
      .duration(300)
      .call(this.zoom.scaleBy, 1.3);
  }

  zoomOut() {
    this.svg.transition()
      .duration(300)
      .call(this.zoom.scaleBy, 0.7);
  }

  zoomReset() {
    const rect = this.container.node().getBoundingClientRect();
    const resetTransform = d3.zoomIdentity
      .translate(100, rect.height / 2);
    
    this.svg.transition()
      .duration(500)
      .call(this.zoom.transform, resetTransform);
  }

  // 정리
  destroy() {
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }
  }
}

// 전역 인스턴스
let d3TreeView = null;

// D3 트리 뷰 초기화 함수
function initD3TreeView(containerId) {
  if (!d3TreeView) {
    d3TreeView = new D3TreeView(containerId);
  }
  // window에 노출 (실시간 동기화용)
  window.d3TreeView = d3TreeView;
  return d3TreeView;
}
