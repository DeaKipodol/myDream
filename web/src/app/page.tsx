"use client";

import Breadcrumbs from "@/components/Breadcrumbs";
import TreeView from "@/components/TreeView";
import ChatView from "@/components/ChatView";
import CheckpointList from "@/components/CheckpointList";
import ControlBar from "@/components/ControlBar";

export default function Page() {
  return (
    <div className="flex min-h-[70dvh] flex-col gap-4">
      <header className="flex items-center justify-between rounded-lg border bg-card p-3">
        <h1 className="text-lg font-semibold">Conversation Tree Playground</h1>
        <nav className="text-sm text-muted-foreground"><Breadcrumbs /></nav>
      </header>

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_280px]">
        <section className="rounded-lg border bg-card p-3">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Tree</h2>
          <div className="h-72 overflow-auto rounded-md border bg-background p-2 text-sm lg:h-[70dvh]">
            <TreeView />
          </div>
        </section>

        <section className="rounded-lg border bg-card p-3">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Chat</h2>
          <div className="h-72 overflow-auto rounded-md border bg-background p-2 text-sm lg:h-[70dvh]">
            <ChatView />
          </div>
        </section>

        <aside className="rounded-lg border bg-card p-3">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Checkpoints</h2>
          <div className="h-72 overflow-auto rounded-md border bg-background p-2 text-sm lg:h-[70dvh]">
            <CheckpointList />
          </div>
        </aside>
      </main>

      <footer className="rounded-lg border bg-card p-3">
        <ControlBar />
      </footer>
    </div>
  );
}


