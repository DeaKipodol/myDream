"use client";

import { useMemo } from "react";
import { useAppStore } from "@/state/appStore";

type TreeNode = { id: string; children: string[] };

type NodeLite = { id: string; parentId: string | null };

export default function TreeView() {
  const nodes = useAppStore((s: any) => s.nodes as Record<string, NodeLite>);
  const activeNodeId = useAppStore((s: any) => s.activeNodeId as string);
  const activePathIds = useAppStore((s: any) => s.activePathIds as string[]);
  const switchTo = useAppStore((s: any) => s.switchTo as (id: string) => void);

  const tree = (useMemo(() => {
    const childrenMap: Record<string, string[]> = {};
    (Object.values(nodes) as NodeLite[]).forEach((n) => {
      if (n.parentId) {
        childrenMap[n.parentId] = childrenMap[n.parentId] || [];
        childrenMap[n.parentId].push(n.id);
      }
    });
    const map: Record<string, TreeNode> = {};
    (Object.values(nodes) as NodeLite[]).forEach((n) => {
      map[n.id] = { id: n.id, children: childrenMap[n.id] || [] };
    });
    return map;
  }, [nodes]) as unknown) as Record<string, TreeNode>;

  const roots = useMemo(
    () => (Object.values(nodes) as NodeLite[]).filter((n) => n.parentId === null).map((n) => n.id),
    [nodes]
  );

  const renderNode = (id: string, isRoot: boolean = false) => {
    const isActive = id === activeNodeId;
    const inPath = activePathIds.includes(id);
    return (
      <li key={id} className={isRoot ? undefined : "relative pl-2 before:content-[''] before:absolute before:-left-4 before:top-4 before:w-4 before:border-t before:border-gray-200"}>
        <button
          className={`mb-1 inline-flex rounded px-2 py-1 text-left text-sm hover:bg-accent ${
            isActive ? "bg-primary text-primary-foreground" : inPath ? "bg-secondary" : ""
          }`}
          onClick={() => switchTo(id)}
        >
          {id}
        </button>
        {tree[id].children.length > 0 && (
          <ul className="ml-4 border-l border-gray-200 pl-4">
            {tree[id].children.map((childId: string) => renderNode(childId))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul className="text-sm">
      {roots.map((rid: string) => renderNode(rid, true))}
    </ul>
  );
}


