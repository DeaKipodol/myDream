export type NodeLite = { id: string; parentId: string | null };
export type NodeMap = Record<string, NodeLite>;

export function computeLca(nodes: NodeMap, nodeAId: string, nodeBId: string): string | null {
  if (!nodes[nodeAId] || !nodes[nodeBId]) return null;
  const seen = new Set<string>();
  let cur: string | null = nodeAId;
  while (cur) {
    seen.add(cur);
    cur = nodes[cur]?.parentId ?? null;
  }
  cur = nodeBId;
  while (cur) {
    if (seen.has(cur)) return cur;
    cur = nodes[cur]?.parentId ?? null;
  }
  return null;
}








