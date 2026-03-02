"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Message } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useChatContext } from "@/components/chat/chat-context";
import { usePreset } from "@/components/preset/preset-context";
import { ChatService } from "@/lib/services/chat-service";
import { toast } from "sonner";
import { AgentResponse } from "@/lib/agents/types";

/**
 * 過去のアシスタント発言から最後に判定が行われた最新メッセージを取得
 */
export function findLastAssistantMessage(messages: Message[]): Message | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i];
  }
  return null;
}

/**
 * チャットセッション（メッセージやローカル状態、スレッドへのプリセット復元）の管理フック
 */
export function useChatSession() {
  const { user } = useAuth();
  const { activeThreadId, setActiveThreadId, history } = useChatContext();
  const { setPreset } = usePreset();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // 最新のMAGI情報を導出（派生状態コンポジション）
  // ---------------------------------------------------------------------------
  const lastAssistant = useMemo(() => findLastAssistantMessage(messages), [messages]);

  const agentResponses = lastAssistant?.agentResponses ?? null;
  const verdict = lastAssistant?.verdict ?? null;
  const syncRate = lastAssistant?.syncRate ?? null;
  const contradiction = lastAssistant?.contradiction ?? null;

  // ---------------------------------------------------------------------------
  // スレッド読み込み
  // ---------------------------------------------------------------------------
  const loadThread = useCallback(async (threadId: string) => {
    if (!user) return;
    try {
      const msgs = await ChatService.getThreadMessages(user.uid, threadId);
      setMessages(msgs);
    } catch (e) {
      console.error("Failed to load thread:", e);
      toast.error("チャット履歴の読み込みに失敗しました");
    }
  }, [user]);

  // activeThreadId の変化を監視し、スレッド読み込みおよびプリセット状態復元処理
  useEffect(() => {
    if (!user) return;

    if (activeThreadId) {
      // 既存スレッドロード
      loadThread(activeThreadId);
      
      // 履歴からプリセット情報を復元
      const activeThread = history.find((t) => t.id === activeThreadId);
      if (activeThread?.presetId) {
        setPreset(activeThread.presetId);
      }
    } else {
      // 新規チャット時はクリア
      setMessages([]);
    }
  }, [activeThreadId, user, loadThread, history, setPreset]);

  // ---------------------------------------------------------------------------
  // ユーティリティ群
  // ---------------------------------------------------------------------------
  const reset = useCallback(() => {
    setMessages([]);
    setActiveThreadId(null);
  }, [setActiveThreadId]);

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    agentResponses,
    verdict,
    syncRate,
    contradiction,
    reset,
  };
}
