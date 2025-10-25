import type { NodeMap } from "./lca";
import { computeLca } from "./lca";

export function buildPathToRoot(nodes: NodeMap, nodeId: string): string[] {
  const path: string[] = [];
  let cur: string | null = nodeId;
  while (cur) {
    const node = nodes[cur as keyof typeof nodes] as { id: string; parentId: string | null } | undefined;
    if (!node) break;
    path.push(node.id);
    cur = node.parentId;
  }
  return path.reverse();
}

export function buildActivePath(nodes: NodeMap, currentLeafId: string, targetNodeId: string): string[] {
  if (!nodes[targetNodeId]) return [];
  if (currentLeafId === targetNodeId) return buildPathToRoot(nodes, targetNodeId);

  const pathToCurrent = buildPathToRoot(nodes, currentLeafId);
  const pathToTarget = buildPathToRoot(nodes, targetNodeId);
  const lcaId = computeLca(nodes, currentLeafId, targetNodeId) ?? pathToTarget[0] ?? null;
  if (!lcaId) return pathToTarget;

  const lcaIndexCurrent = pathToCurrent.indexOf(lcaId);
  const lcaIndexTarget = pathToTarget.indexOf(lcaId);

  const prefix = lcaIndexCurrent >= 0 ? pathToCurrent.slice(0, lcaIndexCurrent + 1) : pathToCurrent;
  const suffix = lcaIndexTarget >= 0 ? pathToTarget.slice(lcaIndexTarget + 1) : [];
  return [...prefix, ...suffix];
}


