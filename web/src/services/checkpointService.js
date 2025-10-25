import { buildPathToRoot } from "../algorithms/path.js";
import { dispatch, getState } from "../state/store.js";

function generateCheckpointId() {
  return `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createCheckpoint({ label } = {}, nodes) {
  const { activeNodeId, activePathIds } = getState();
  if (!activeNodeId) {
    return null;
  }

  const pathIds = activePathIds.length > 0 ? activePathIds : buildPathToRoot(nodes, activeNodeId);
  if (!Array.isArray(pathIds) || pathIds.length === 0) {
    return null;
  }

  const timestamp = new Date();
  const checkpoint = {
    id: generateCheckpointId(),
    nodeId: activeNodeId,
    pathIds: [...pathIds],
    label:
      label ||
      `${nodes[activeNodeId]?.label || "Checkpoint"} · ${timestamp
        .toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
        `,
    createdAt: timestamp.toISOString(),
  };

  dispatch({ type: "ADD_CHECKPOINT", payload: checkpoint });
  return checkpoint;
}

export function restoreCheckpoint(checkpointId, nodes) {
  const snapshot = getState();
  const checkpoint = snapshot.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint) return null;

  const sanitizedPathIds = checkpoint.pathIds.filter((id) => Boolean(nodes[id]));
  if (sanitizedPathIds.length === 0) {
    return null;
  }

  const targetNodeId = sanitizedPathIds[sanitizedPathIds.length - 1];
  const pathIds = buildPathToRoot(nodes, targetNodeId);

  dispatch({
    type: "RESTORE_CHECKPOINT",
    payload: {
      checkpointId,
      nodeId: targetNodeId,
      pathIds,
    },
  });

  return checkpointId;
}

export function listCheckpoints() {
  return getState().checkpoints;
}
