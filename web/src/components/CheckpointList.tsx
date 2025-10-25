"use client";

import { useAppStore } from "@/state/appStore";

type Checkpoint = { id: string; activePathIds: string[]; createdAt: number };

export default function CheckpointList() {
  const checkpoints = useAppStore((s: any) => s.checkpoints as Checkpoint[]);
  const restore = useAppStore((s: any) => s.restoreCheckpoint as (id: string) => void);

  if (!checkpoints.length) {
    return <div className="text-sm text-muted-foreground">No checkpoints yet</div>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {checkpoints.map((cp: Checkpoint) => (
        <li key={cp.id} className="flex items-center justify-between rounded border p-2">
          <div className="truncate">
            <div className="font-medium">{new Date(cp.createdAt).toLocaleTimeString()}</div>
            <div className="text-muted-foreground truncate">{cp.activePathIds.join(" / ")}</div>
          </div>
          <button className="rounded border px-2 py-1" onClick={() => restore(cp.id)}>Restore</button>
        </li>
      ))}
    </ul>
  );
}


