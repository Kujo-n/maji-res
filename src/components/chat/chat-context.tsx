"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ChatService, ThreadData } from "@/lib/services/chat-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatContextType {
  /** 現在アクティブなスレッドID（null = 新規チャット状態） */
  activeThreadId: string | null;
  /** ユーザーのスレッド履歴一覧 */
  history: ThreadData[];
  /** 履歴を再取得する */
  refreshHistory: () => Promise<void>;
  /** 特定のスレッドを選択してアクティブにする */
  selectThread: (threadId: string) => void;
  /** 新規チャットを開始する（現在のスレッドをクリアし新規状態へ） */
  startNewChat: () => void;
  /** 新しいスレッドが作成された際にactiveThreadIdを更新する */
  setActiveThreadId: (threadId: string | null) => void;
  /** 履歴読み込み中かどうか */
  isLoadingHistory: boolean;
}

const ChatContext = createContext<ChatContextType>({
  activeThreadId: null,
  history: [],
  refreshHistory: async () => {},
  selectThread: () => {},
  startNewChat: () => {},
  setActiveThreadId: () => {},
  isLoadingHistory: false,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [history, setHistory] = useState<ThreadData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ---- 履歴を取得 ----
  const refreshHistory = useCallback(async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const threads = await ChatService.getUserThreads(user.uid);
      setHistory(threads);
    } catch (e) {
      console.error("Failed to load chat history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  // ---- ユーザーログイン時に履歴を自動取得 ----
  useEffect(() => {
    if (user) {
      refreshHistory();
    } else {
      setHistory([]);
      setActiveThreadId(null);
    }
  }, [user, refreshHistory]);

  // ---- スレッド選択 ----
  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

  // ---- 新規チャット ----
  const startNewChat = useCallback(() => {
    setActiveThreadId(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        activeThreadId,
        history,
        refreshHistory,
        selectThread,
        startNewChat,
        setActiveThreadId,
        isLoadingHistory,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useChatContext = () => useContext(ChatContext);
