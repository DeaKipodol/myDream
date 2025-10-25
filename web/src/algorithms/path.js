import { computeLca } from "./lca.js";

/**
 * 루트에서 지정한 노드까지의 경로를 계산한다.
 * @param {Record<string, { id: string, parent: string | null }>} nodes
 * @param {string} nodeId
 * @returns {string[]} 루트 → 대상 노드 경로의 ID 배열
 */
export function buildPathToRoot(nodes, nodeId) {
  const path = [];
  let current = nodeId;

  while (current) {
    const node = nodes[current];
    if (!node) break;
    path.push(node.id);
    current = node.parent ?? null;
  }

  return path.reverse();
}

/**
 * 현재 리프와 목표 노드를 기준으로 새 활성 경로를 계산한다.
 * @param {Record<string, { id: string, parent: string | null }>} nodes
 * @param {string} currentLeafId
 * @param {string} targetNodeId
 * @returns {string[]} 루트 → targetNodeId 경로
 */
export function buildActivePath(nodes, currentLeafId, targetNodeId) {
  if (!nodes[targetNodeId]) {
    return [];
  }

  if (currentLeafId === targetNodeId) {
    return buildPathToRoot(nodes, targetNodeId);
  }

  const pathToCurrent = buildPathToRoot(nodes, currentLeafId);
  const pathToTarget = buildPathToRoot(nodes, targetNodeId);
  const lcaId = computeLca(nodes, currentLeafId, targetNodeId) ?? pathToTarget[0] ?? null;

  if (!lcaId) {
    return pathToTarget;
  }

  const lcaIndexCurrent = pathToCurrent.indexOf(lcaId);
  const lcaIndexTarget = pathToTarget.indexOf(lcaId);

  const prefix = lcaIndexCurrent >= 0 ? pathToCurrent.slice(0, lcaIndexCurrent + 1) : pathToCurrent;
  const suffix = lcaIndexTarget >= 0 ? pathToTarget.slice(lcaIndexTarget + 1) : [];

  return [...prefix, ...suffix];
}
