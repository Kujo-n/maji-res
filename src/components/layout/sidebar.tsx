"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { MessageCircle, Plus, Loader2, Trash2 } from "lucide-react";
import { useChatContext } from "@/components/chat/chat-context";
import { PresetSelector } from "@/components/preset/preset-selector";

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const { history, activeThreadId, selectThread, deleteThread, startNewChat, isLoadingHistory } = useChatContext();
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!threadToDelete) return;
    try {
      await deleteThread(threadToDelete);
    } catch (err) {
      console.error("Failed to delete thread", err);
      // alert("スレッドの削除に失敗しました。");
    } finally {
      setThreadToDelete(null);
    }
  };

  return (
    <div className={cn("pb-12 h-screen overflow-y-auto", className)}>
      <div className="space-y-4 py-4 h-full flex flex-col">
        <div className="px-3 py-2 shrink-0">
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
        <div className="border-t border-border/40 my-2 shrink-0"></div>
        <div className="shrink-0">
          <PresetSelector />
        </div>
        <div className="border-t border-border/40 my-2 shrink-0"></div>
        <div className="px-3 py-2 flex-1 overflow-y-auto min-h-0">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight sticky top-0 bg-background/95 backdrop-blur z-10 py-1">History</h2>
          <div className="space-y-1 pb-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="px-4 text-sm text-muted-foreground">まだ履歴がありません</p>
            ) : (
              history.map((thread) => (
                <div key={thread.id} className="group relative flex items-center pr-2">
                  <Button
                    variant={thread.id === activeThreadId ? "default" : "ghost"}
                    className="w-full justify-start font-normal truncate pr-10"
                    onClick={() => thread.id && selectThread(thread.id)}
                  >
                    <MessageCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{thread.title || "Untitled"}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive focus:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (thread.id) setThreadToDelete(thread.id);
                    }}
                    title="Delete Thread"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!threadToDelete} onOpenChange={(open) => !open && setThreadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>スレッドを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。スレッド内のすべてのメッセージと履歴が完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
