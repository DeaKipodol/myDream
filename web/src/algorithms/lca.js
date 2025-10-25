/**
 * 선형 시간 LCA 계산 (부모 포인터 기반)
 * @param {Record<string, { parent: string | null }>} nodes
 * @param {string} nodeAId
 * @param {string} nodeBId
 * @returns {string | null}
 */
export function computeLca(nodes, nodeAId, nodeBId) {
  if (!nodes[nodeAId] || !nodes[nodeBId]) {
    return null;
  }

  const ancestors = new Set();
  let current = nodeAId;
  while (current) {
    ancestors.add(current);
    const parent = nodes[current]?.parent ?? null;
    current = parent;
  }

  current = nodeBId;
  while (current) {
    if (ancestors.has(current)) {
      return current;
    }
    const parent = nodes[current]?.parent ?? null;
    current = parent;
  }

  return null;
}
