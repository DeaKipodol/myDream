const DEBUG = true;

function debugLog(...args) {
  if (!DEBUG) return;
  console.log("[Store]", ...args);
}

const listeners = new Set();

const state = {
  activeNodeId: "careerRoot",
  activePathIds: ["careerRoot"],
  checkpoints: [],
  lastCheckpointAction: { id: null, type: null },
};

function notify() {
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot));
}

export function getState() {
  return {
    activeNodeId: state.activeNodeId,
    activePathIds: [...state.activePathIds],
    checkpoints: state.checkpoints.map((checkpoint) => ({ ...checkpoint })),
    lastCheckpointAction: { ...state.lastCheckpointAction },
  };
}

export function subscribe(listener) {
  debugLog("Subscriber added");
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dispatch(action) {
  debugLog("Dispatch", action);
  switch (action.type) {
    case "SET_ACTIVE_PATH": {
      const { nodeId, pathIds } = action.payload;
      state.activeNodeId = nodeId;
      state.activePathIds = [...pathIds];
      state.lastCheckpointAction = { ...state.lastCheckpointAction };
      debugLog("Active path updated", state.activeNodeId, state.activePathIds);
      break;
    }
    case "ADD_CHECKPOINT": {
      const checkpoint = { ...action.payload };
      state.checkpoints = [checkpoint, ...state.checkpoints];
      state.lastCheckpointAction = { id: checkpoint.id, type: "created" };
      debugLog("Checkpoint added", checkpoint);
      break;
    }
    case "RESTORE_CHECKPOINT": {
      const { checkpointId, nodeId, pathIds } = action.payload;
      state.activeNodeId = nodeId;
      state.activePathIds = [...pathIds];
      state.lastCheckpointAction = { id: checkpointId, type: "restored" };
      debugLog("Checkpoint restored", action.payload);
      break;
    }
    default:
      debugLog("Unknown action skipped", action.type);
      return;
  }

  notify();
}
