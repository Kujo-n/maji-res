"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageCircle, Plus, Loader2 } from "lucide-react";
import { useChatContext } from "@/components/chat/chat-context";
import { PresetSelector } from "@/components/preset/preset-selector";

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const { history, activeThreadId, selectThread, startNewChat, isLoadingHistory } = useChatContext();

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">MAJI-RES</h2>
          <div className="space-y-1">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={startNewChat}
              disabled={activeThreadId === null}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>
        <div className="border-t border-border/40 my-2"></div>
        <PresetSelector />
        <div className="border-t border-border/40 my-2"></div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">History</h2>
          <div className="space-y-1">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="px-4 text-sm text-muted-foreground">まだ履歴がありません</p>
            ) : (
              history.map((thread) => (
                <Button
                  key={thread.id}
                  variant={thread.id === activeThreadId ? "default" : "ghost"}
                  className="w-full justify-start font-normal truncate"
                  onClick={() => thread.id && selectThread(thread.id)}
                >
                  <MessageCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{thread.title || "Untitled"}</span>
                </Button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
