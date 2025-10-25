"use client";

import { useAppStore } from "@/state/appStore";

export default function ControlBar() {
  const createCheckpoint = useAppStore((s: any) => s.createCheckpoint as () => void);
  const checkpoints = useAppStore((s: any) => s.checkpoints as { id: string }[]);
  const restoreCheckpoint = useAppStore((s: any) => s.restoreCheckpoint as (id: string) => void);

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-sm text-muted-foreground">Suffix highlight will appear after interactions</div>
      <div className="flex gap-2">
        <button className="rounded-md border px-3 py-1 text-sm" onClick={() => {/* future: new branch */}}>New branch</button>
        <button className="rounded-md border px-3 py-1 text-sm" onClick={createCheckpoint}>Create checkpoint</button>
        <button
          className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          onClick={() => checkpoints[0] && restoreCheckpoint(checkpoints[0].id)}
          disabled={checkpoints.length === 0}
        >
          Restore latest
        </button>
      </div>
    </div>
  );
}


