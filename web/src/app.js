import { buildActivePath, buildPathToRoot } from "./algorithms/path.js";
import { createCheckpoint, restoreCheckpoint } from "./services/checkpointService.js";
import { dispatch, getState, subscribe } from "./state/store.js";

const DEBUG = true;

function debugLog(...args) {
  if (!DEBUG) return;
  console.log("[App]", ...args);
}

const ROOT_NODE_ID = "careerRoot";

const nodes = {
  [ROOT_NODE_ID]: {
    id: ROOT_NODE_ID,
    label: "사용자의 진로 고민",
    subtitle: "현재 상황 점검",
    description: "진로 고민의 현재 위치를 정리하고 다음 분기를 살펴봅니다.",
    parent: null,
    children: ["exploreMaking", "overcomeLethargy", "discoverDreams"],
  },
  exploreMaking: {
    id: "exploreMaking",
    label: "무엇이든 만들어보기",
    subtitle: "실험형 경로",
    description: "작은 제작 실험을 통해 배우고 싶은 역량을 탐색합니다.",
    parent: ROOT_NODE_ID,
    children: ["makingInventory"],
  },
  makingInventory: {
    id: "makingInventory",
    label: "관심사 인벤토리",
    subtitle: "재료 찾기",
    description: "흥미로운 경험과 강점을 다시 모읍니다.",
    parent: "exploreMaking",
    children: ["makingPilot"],
  },
  makingPilot: {
    id: "makingPilot",
    label: "프로토타입 실험",
    subtitle: "작게 시작하기",
    description: "작은 프로젝트를 만들어보며 다음 단서를 찾습니다.",
    parent: "makingInventory",
    children: [],
  },
  overcomeLethargy: {
    id: "overcomeLethargy",
    label: "무력감 먼저 극복하기",
    subtitle: "에너지 회복",
    description: "무기력의 원인을 찾고 행동 모멘텀을 회복합니다.",
    parent: ROOT_NODE_ID,
    children: ["lethargyTrigger"],
  },
  lethargyTrigger: {
    id: "lethargyTrigger",
    label: "패턴 확인",
    subtitle: "트리거 파악",
    description: "무기력함이 시작되는 지점을 명확히 기록합니다.",
    parent: "overcomeLethargy",
    children: ["lethargyRoutine"],
  },
  lethargyRoutine: {
    id: "lethargyRoutine",
    label: "에너지 루틴",
    subtitle: "회복 실험",
    description: "짧은 루틴을 통해 반복 가능한 회복 구조를 만듭니다.",
    parent: "lethargyTrigger",
    children: [],
  },
  discoverDreams: {
    id: "discoverDreams",
    label: "꿈 대해 알아보기",
    subtitle: "미래 탐색",
    description: "영감을 주는 꿈을 구체적으로 그려봅니다.",
    parent: ROOT_NODE_ID,
    children: ["dreamsStory"],
  },
  dreamsStory: {
    id: "dreamsStory",
    label: "영감 수집",
    subtitle: "이야기 발굴",
    description: "과거의 몰입 경험과 롤모델을 탐색합니다.",
    parent: "discoverDreams",
    children: ["dreamsAction"],
  },
  dreamsAction: {
    id: "dreamsAction",
    label: "행동 스케치",
    subtitle: "첫걸음 계획",
    description: "가장 끌리는 꿈을 기준으로 한 주 계획을 세웁니다.",
    parent: "dreamsStory",
    children: [],
  },
};

const messagesByNode = {
  [ROOT_NODE_ID]: [
    {
      speaker: "assistant",
      text: "어떤 상황에서 진로 고민이 가장 크게 느껴지는지 이야기해 볼까요?",
    },
  ],
  exploreMaking: [
    {
      speaker: "user",
      text: "어떤 역량을 키워야 할지 몰라서 막막합니다.",
    },
    {
      speaker: "assistant",
      text: "작은 제작 실험을 통해 배우고 싶은 영역을 좁혀보는 건 어떨까요?",
    },
  ],
  makingInventory: [
    {
      speaker: "assistant",
      text: "최근에 몰입했던 활동을 세 가지 떠올려 보시면 좋겠어요.",
    },
    {
      speaker: "user",
      text: "온라인 강의 제작, 동아리 프로젝트, 글쓰기 정도가 기억나요.",
    },
  ],
  makingPilot: [
    {
      speaker: "assistant",
      text: "그중 가장 금방 시도할 수 있는 아이디어를 골라 3일 미션으로 정의해볼까요?",
    },
  ],
  overcomeLethargy: [
    {
      speaker: "user",
      text: "에너지가 떨어지면 아무것도 하기 싫어집니다.",
    },
    {
      speaker: "assistant",
      text: "무력감이 시작되는 순간을 포착해 보는 것부터 시작해요.",
    },
  ],
  lethargyTrigger: [
    {
      speaker: "assistant",
      text: "최근 한 주를 되돌아보며 무기력이 시작된 패턴을 기록해 봅시다.",
    },
  ],
  lethargyRoutine: [
    {
      speaker: "assistant",
      text: "패턴을 기준으로 10분 루틴을 설계하면 작은 회복 밸브가 만들어져요.",
    },
  ],
  discoverDreams: [
    {
      speaker: "assistant",
      text: "요즘 마음을 끌었던 직업이나 활동이 있었나요?",
    },
    {
      speaker: "user",
      text: "영상으로 이야기를 전달하는 일이 재밌어 보여요.",
    },
  ],
  dreamsStory: [
    {
      speaker: "assistant",
      text: "어릴 때 몰입했던 경험이나 존경하는 인물을 떠올려 봅시다.",
    },
    {
      speaker: "user",
      text: "다큐멘터리를 만드는 사람들을 좋아했습니다.",
    },
  ],
  dreamsAction: [
    {
      speaker: "assistant",
      text: "관심있는 주제를 간단한 스토리보드로 표현해 보는 한 주 계획 어떨까요?",
    },
  ],
};

const elements = {
  branchList: document.getElementById("branch-list"),
  stageSelector: document.getElementById("stage-selector"),
  messageTimeline: document.getElementById("message-timeline"),
  panelTitle: document.getElementById("conversation-title"),
  panelSubtitle: document.querySelector(".panel-subtitle"),
  checkpointList: document.getElementById("checkpoint-list"),
  checkpointStatus: document.getElementById("checkpoint-status"),
  checkpointCreateButton: document.getElementById("checkpoint-create-btn"),
  headerCreateButton: document.getElementById("header-create-checkpoint"),
};

function getPathNodes(pathIds) {
  debugLog("Resolving path nodes", pathIds);
  return pathIds
    .map((id) => nodes[id])
    .filter((node) => Boolean(node));
}

function renderStageSelector(pathNodes, activeNodeId) {
  debugLog("Rendering stage selector", pathNodes.map((node) => node.id));
  if (!elements.stageSelector) return;
  elements.stageSelector.innerHTML = "";

  // 상위 컨테이너 추가 - 단계 진행 시각화
  const stepsContainer = document.createElement("div");
  stepsContainer.className = "stage-steps-container";
  elements.stageSelector.appendChild(stepsContainer);

  pathNodes.forEach((node, index) => {
    const item = document.createElement("li");
    item.className = "stage-selector-item";
    item.dataset.nodeId = node.id;

    // 원형 버튼 스타일 개선
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-selector-button";
    if (node.id === activeNodeId) {
      button.classList.add("is-active");
    }
    button.setAttribute("aria-label", `${node.label} 단계로 이동`);
    button.textContent = index + 1;
    button.addEventListener("click", () => {
      debugLog("Stage selector clicked", node.id);
      switchNode(node.id);
    });

    // 선택한 버튼 설명 표시
    const label = document.createElement("span");
    label.className = "stage-selector-label";
    label.textContent = node.label;

    // 단계간 연결선 (마지막 항목 제외)
    if (index < pathNodes.length - 1) {
      const connector = document.createElement("div");
      connector.className = "stage-connector";
      item.appendChild(connector);
    }

    item.appendChild(button);
    item.appendChild(label);
    elements.stageSelector.appendChild(item);
  });
}

function renderMessages(pathNodes) {
  debugLog("Rendering messages for", pathNodes.map((node) => node.id));
  if (!elements.messageTimeline) return;
  elements.messageTimeline.innerHTML = "";

  pathNodes.forEach((node, index) => {
    const section = document.createElement("section");
    section.className = "stage-section";
    section.dataset.nodeId = node.id;

    const header = document.createElement("div");
    header.className = "stage-section-header";

    const title = document.createElement("h2");
    title.className = "stage-section-title";
    title.textContent = `${index + 1}. ${node.label}`;

    const subtitle = document.createElement("p");
    subtitle.className = "stage-section-subtitle";
    subtitle.textContent = node.description || node.subtitle || "";

    header.appendChild(title);
    if (subtitle.textContent) {
      header.appendChild(subtitle);
    }

    section.appendChild(header);

    const messages = messagesByNode[node.id] || [];
    messages.forEach((message) => {
      const wrapper = document.createElement("article");
      wrapper.className = `message-card ${message.speaker}`;
      
      // 말풍선 컨테이너 생성 (좌우 정렬용)
      const bubbleContainer = document.createElement("div");
      bubbleContainer.className = `message-container ${message.speaker}`;
      
      const avatar = document.createElement("div");
      avatar.className = `message-avatar ${message.speaker}`;
      avatar.textContent = message.speaker === "assistant" ? "🤖" : "🧑";

      const body = document.createElement("div");
      body.className = "message-body";
      body.textContent = message.text;
      
      if (message.speaker === "assistant") {
        bubbleContainer.appendChild(avatar);
        bubbleContainer.appendChild(body);
      } else {
        bubbleContainer.appendChild(body);
        bubbleContainer.appendChild(avatar);
      }
      
      wrapper.appendChild(bubbleContainer);
      section.appendChild(wrapper);
    });

    elements.messageTimeline.appendChild(section);
  });
}

function renderBranchList(pathNodes) {
  if (!elements.branchList) return;
  const rootNode = nodes[ROOT_NODE_ID];
  if (!rootNode) return;

  debugLog("Rendering branch list", rootNode.children);
  elements.branchList.innerHTML = "";

  if (!Array.isArray(rootNode.children) || rootNode.children.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "branch-item";
    emptyItem.textContent = "표시할 분기 지점이 없습니다.";
    elements.branchList.appendChild(emptyItem);
    return;
  }
  
  // 헤더 추가: 루트 노드 표시
  const header = document.createElement("div");
  header.className = "branch-list-header";
  header.textContent = rootNode.label;
  elements.branchList.appendChild(header);

  const description = document.createElement("p");
  description.className = "branch-list-description";
  description.textContent = rootNode.description || rootNode.subtitle || "분기 지점을 선택하세요";
  elements.branchList.appendChild(description);

  rootNode.children.forEach((branchId) => {
    const branchNode = nodes[branchId];
    if (!branchNode) return;

    const item = document.createElement("li");
    item.className = "branch-item";
    item.dataset.branchId = branchNode.id;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "branch-button";
    button.dataset.branchId = branchNode.id;
    button.setAttribute("aria-label", `${branchNode.label} 분기 선택`);
    button.addEventListener("click", () => {
      debugLog("Branch selected", branchNode.id);
      switchNode(branchNode.id);
    });

    const label = document.createElement("span");
    label.className = "branch-label";
    label.textContent = branchNode.label;

    const arrow = document.createElement("span");
    arrow.className = "branch-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";

    button.appendChild(label);
    button.appendChild(arrow);
    item.appendChild(button);

    const meta = document.createElement("span");
    meta.className = "branch-meta";
    meta.textContent = branchNode.subtitle || branchNode.description || "";
    if (meta.textContent) {
      item.appendChild(meta);
    }

    elements.branchList.appendChild(item);
  });

  highlightBranchList(pathNodes);
}

function highlightBranchList(pathNodes) {
  const branchNode = pathNodes.find((node) => node.parent === ROOT_NODE_ID);
  const activeBranchId = branchNode?.id ?? pathNodes[0]?.id ?? null;
  debugLog("Highlighting branch list", activeBranchId);

  document.querySelectorAll(".branch-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.branchId === activeBranchId);
  });
}

function formatTimestamp(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setCheckpointStatusMessage(message) {
  if (elements.checkpointStatus) {
    elements.checkpointStatus.textContent = message;
  }
}

function renderCheckpointPanel(snapshot) {
  debugLog("Rendering checkpoint panel", snapshot);
  if (!elements.checkpointList) return;

  const { checkpoints, lastCheckpointAction, activeNodeId } = snapshot;
  elements.checkpointList.innerHTML = "";

  checkpoints.forEach((checkpoint) => {
    const item = document.createElement("li");
    item.className = "checkpoint-item";
    if (checkpoint.nodeId === activeNodeId) {
      item.classList.add("is-active");
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "checkpoint-button";
    button.textContent = checkpoint.label || `체크포인트 (${checkpoint.nodeId})`;
    button.addEventListener("click", () => handleCheckpointRestore(checkpoint.id));

    const meta = document.createElement("span");
    meta.className = "checkpoint-meta";
    meta.textContent = formatTimestamp(checkpoint.createdAt);

    item.appendChild(button);
    item.appendChild(meta);
    elements.checkpointList.appendChild(item);
  });

  if (checkpoints.length === 0) {
    setCheckpointStatusMessage("아직 저장된 경로가 없습니다.");
    return;
  }

  if (lastCheckpointAction?.type === "created") {
    const created = checkpoints.find((item) => item.id === lastCheckpointAction.id);
    setCheckpointStatusMessage(
      created
        ? `${created.label || created.id} 경로를 저장했습니다.`
        : "새 체크포인트를 저장했습니다."
    );
    return;
  }

  if (lastCheckpointAction?.type === "restored") {
    const restored = checkpoints.find((item) => item.id === lastCheckpointAction.id);
    setCheckpointStatusMessage(
      restored
        ? `${restored.label || restored.id} 경로를 복원했습니다.`
        : "체크포인트를 복원했습니다."
    );
    return;
  }

  setCheckpointStatusMessage(`${checkpoints.length}개의 경로가 저장되어 있습니다.`);
}

function switchNode(targetId) {
  if (!nodes[targetId]) return;
  const snapshot = getState();
  const pathIds = buildActivePath(nodes, snapshot.activeNodeId, targetId);
  if (pathIds.length === 0) return;

  debugLog("Switching node", { previous: snapshot.activeNodeId, targetId, pathIds });
  dispatch({ type: "SET_ACTIVE_PATH", payload: { nodeId: targetId, pathIds } });
}

function handleCheckpointCreate() {
  debugLog("Checkpoint create requested");
  const result = createCheckpoint({}, nodes);
  if (!result) {
    setCheckpointStatusMessage("저장할 활성 경로가 없습니다.");
    debugLog("Checkpoint create failed: no active path");
  }
  debugLog("Checkpoint created", result);
}

function handleCheckpointRestore(checkpointId) {
  debugLog("Checkpoint restore requested", checkpointId);
  const restored = restoreCheckpoint(checkpointId, nodes);
  if (!restored) {
    setCheckpointStatusMessage("체크포인트를 복원할 수 없습니다.");
    debugLog("Checkpoint restore failed", checkpointId);
  }
  debugLog("Checkpoint restored", restored);
}

function renderApp(snapshot) {
  debugLog("Render cycle start", snapshot);
  const pathNodes = getPathNodes(snapshot.activePathIds);
  const activeNode = nodes[snapshot.activeNodeId];

  if (elements.panelTitle) {
    elements.panelTitle.textContent = activeNode?.label || "Conversation";
  }

  if (elements.panelSubtitle) {
    elements.panelSubtitle.textContent =
      activeNode?.description || "선택한 노드에 대한 상담 내용";
  }

  renderBranchList(pathNodes);
  renderStageSelector(pathNodes, snapshot.activeNodeId);
  renderMessages(pathNodes);
  renderCheckpointPanel(snapshot);
}

function setupEventHandlers() {
  const createButtons = [
    elements.checkpointCreateButton,
    elements.headerCreateButton,
  ].filter(Boolean);

  debugLog("Binding create checkpoint buttons", createButtons.length);
  createButtons.forEach((button) =>
    button.addEventListener("click", (event) => {
      debugLog("Checkpoint button clicked", event.target?.id);
      handleCheckpointCreate();
    })
  );
}

function init() {
  debugLog("App init start");
  setupEventHandlers();

  subscribe(renderApp);

  const snapshot = getState();
  const initialTargetId = snapshot.activeNodeId || ROOT_NODE_ID;
  const initialPath = buildPathToRoot(nodes, initialTargetId);

  if (initialPath.length > 0) {
    debugLog("Dispatching initial path", initialTargetId, initialPath);
    dispatch({
      type: "SET_ACTIVE_PATH",
      payload: { nodeId: initialTargetId, pathIds: initialPath },
    });
  } else {
    debugLog("No initial path computed, rendering with snapshot");
    renderApp(snapshot);
  }
}

init();
