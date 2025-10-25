"use client";

import { useAppStore } from "@/state/appStore";
import { sampleMessages } from "@/mocks/sampleTree";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatView() {
  const activePathIds = useAppStore((s: any) => s.activePathIds as string[]);
  const messages = activePathIds.flatMap((id: string) => (sampleMessages[id] ?? [])) as Msg[];
  return (
    <div className="space-y-2 text-sm">
      {messages.map((m: Msg, i: number) => (
        <div key={i} className={`rounded-md p-2 ${m.role === "user" ? "bg-secondary" : "bg-accent"}`}>
          <span className="font-medium mr-1">{m.role === "user" ? "User:" : "Assistant:"}</span>
          {m.content}
        </div>
      ))}
    </div>
  );
}


