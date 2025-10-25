import { create } from "zustand";
import { buildActivePath, buildPathToRoot } from "@/algorithms/path";
import { sampleNodes } from "@/mocks/sampleTree";

type Checkpoint = { id: string; activePathIds: string[]; createdAt: number };

type AppState = {
  nodes: typeof sampleNodes;
  activeNodeId: string;
  activePathIds: string[];
  checkpoints: Checkpoint[];
  switchTo: (targetId: string) => void;
  createCheckpoint: () => void;
  restoreCheckpoint: (checkpointId: string) => void;
};

export const useAppStore = create<AppState>((set: (partial: Partial<AppState>) => void, get: () => AppState) => ({
  nodes: sampleNodes,
  activeNodeId: "A",
  activePathIds: buildPathToRoot(sampleNodes, "A"),
  checkpoints: [],

  switchTo: (targetId: string) => {
    const { nodes, activeNodeId } = get();
    const nextPath = buildActivePath(nodes, activeNodeId, targetId);
    if (nextPath.length === 0) return;
    set({ activeNodeId: targetId, activePathIds: nextPath });
  },

  createCheckpoint: () => {
    const { activePathIds, checkpoints } = get();
    const cp: Checkpoint = {
      id: `cp_${Date.now()}`,
      activePathIds: [...activePathIds],
      createdAt: Date.now(),
    };
    set({ checkpoints: [cp, ...checkpoints] });
  },

  restoreCheckpoint: (checkpointId: string) => {
    const { checkpoints, nodes } = get();
    const cp = checkpoints.find((c: Checkpoint) => c.id === checkpointId);
    if (!cp || cp.activePathIds.length === 0) return;
    const leaf = cp.activePathIds[cp.activePathIds.length - 1];
    if (!nodes[leaf]) return;
    set({ activeNodeId: leaf, activePathIds: [...cp.activePathIds] });
  },
}));








