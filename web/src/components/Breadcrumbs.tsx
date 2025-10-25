"use client";

import { useAppStore } from "@/state/appStore";

export default function Breadcrumbs() {
  const activePathIds = useAppStore((s: any) => s.activePathIds as string[]);
  if (!activePathIds?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      {activePathIds.map((id: string, idx: number) => (
        <span key={id} className="inline-flex items-center">
          <span className={idx === activePathIds.length - 1 ? "font-semibold" : "text-muted-foreground"}>{id}</span>
          {idx < activePathIds.length - 1 && <span className="mx-1 text-muted-foreground">/</span>}
        </span>
      ))}
    </div>
  );
}


