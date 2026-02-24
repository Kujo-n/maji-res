"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AgentResponse } from "@/lib/agents/types";

import { ChatService } from "@/lib/services/chat-service";
import { useAuth } from "@/lib/auth-context";
import { useChatContext } from "@/components/chat/chat-context";
import { usePreset } from "@/components/preset/preset-context";
import { Message } from "@/lib/types";
import { toast } from "sonner";

export interface MagiState {
  messages: Message[];
  agentResponses: AgentResponse[] | null;
  isLoading: boolean;
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function useMagiChat() {
  const { user } = useAuth();
  const { activeThreadId, setActiveThreadId, refreshHistory } = useChatContext();
  const { preset } = usePreset();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // 最新のアシスタントメッセージからMAGI情報を導出
  // ---------------------------------------------------------------------------
  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  const agentResponses = lastAssistant?.agentResponses ?? null;
  const verdict = lastAssistant?.verdict ?? null;
  const syncRate = lastAssistant?.syncRate ?? null;
  const contradiction = lastAssistant?.contradiction ?? null;

  // ---------------------------------------------------------------------------
  // スレッド読み込み: activeThreadId が変わったら対応するメッセージをロード
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

  // activeThreadId の変化を監視
  useEffect(() => {
    if (!user) return;

    if (activeThreadId) {
      // 既存スレッドを選択 → メッセージをロード
      loadThread(activeThreadId);
    } else {
      // 新規チャット状態 → すべてクリア
      setMessages([]);
    }
  }, [activeThreadId, user, loadThread]);

  // ---------------------------------------------------------------------------
  // メッセージ送信
  // ---------------------------------------------------------------------------
  const append = async (message: Omit<Message, "id">) => {
    if (!user) return;

    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      try {
        currentThreadId = await ChatService.createThread(user.uid, message.content.substring(0, 30) + "...");
        setActiveThreadId(currentThreadId);
        // 新しいスレッドが作成されたので履歴を更新
        refreshHistory();
      } catch (e) {
        console.error("Failed to create thread", e);
      }
    }

    const userMessage: Message = {
      ...message,
      id: generateId(),
      role: "user",
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // ユーザーメッセージを保存
    if (currentThreadId) {
      ChatService.addMessage(user.uid, currentThreadId, userMessage).catch(console.error);
    }

    try {
      // Get Firebase Auth ID token for API authentication
      const idToken = await user.getIdToken();

      const response = await fetch("/api/magi/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ message: message.content, preset }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      let buffer = "";
      let verdictFound = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line) continue;

          if (line.startsWith('0:')) {
            // Text delta
            let text = "";
            try {
              text = JSON.parse(line.substring(2));
            } catch { continue; }

            if (!verdictFound) {
              buffer += text;
              const verdictMatch = buffer.match(/^VERDICT: (APPROVE|DENY|CONDITIONAL)\n?/);
              if (verdictMatch) {
                const v = verdictMatch[1] as "APPROVE" | "DENY" | "CONDITIONAL";
                assistantMessage.verdict = v;
                verdictFound = true;
                text = buffer.substring(verdictMatch[0].length);
                assistantMessage.content += text;
                buffer = "";
              } else if (buffer.length > 50 && !buffer.startsWith("VERDICT")) {
                verdictFound = true;
                assistantMessage.content += buffer;
                buffer = "";
              }
            } else {
              assistantMessage.content += text;
            }

            // メッセージ状態を更新
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { ...assistantMessage };
              return newMessages;
            });

          } else if (line.startsWith('2:')) {
            try {
              const data = JSON.parse(line.substring(2));
              if (Array.isArray(data) && data.length > 0) {
                const payload = data[0];
                if (payload) {
                  if (payload.agentResponses) {
                    assistantMessage.agentResponses = payload.agentResponses;
                  }
                  if (typeof payload.syncRate === "number") {
                    assistantMessage.syncRate = payload.syncRate;
                  }
                  if (payload.contradiction) {
                    assistantMessage.contradiction = payload.contradiction;
                  }
                  // メッセージ状態を更新（MAGI情報を反映）
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { ...assistantMessage };
                    return newMessages;
                  });
                }
              }
            } catch (e) { console.error(e); }
          }
        }
      }

      // アシスタントメッセージを保存
      if (currentThreadId) {
        ChatService.addMessage(user.uid, currentThreadId, assistantMessage).catch(console.error);

        // Firestoreに判定結果を保存
        if (assistantMessage.verdict && assistantMessage.agentResponses) {
          const { DecisionService } = await import("@/lib/services/decision-service");
          DecisionService.saveDecision(
            user.uid,
            currentThreadId,
            message.content,
            assistantMessage.agentResponses,
            assistantMessage.verdict,
            assistantMessage.syncRate || 0,
            assistantMessage.contradiction || { hasContradiction: false, severity: "none" as const }
          ).catch((e) => {
            console.error("Failed to save decision:", e);
            toast.error("判定履歴の保存に失敗しました");
          });
        }
      }

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Chat error:", error);
      toast.error("MAGIとの通信に失敗しました");
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: `Error: MAGIとの通信に失敗しました。(${errorMsg})`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // リセット（新規チャット）
  // ---------------------------------------------------------------------------
  const reset = useCallback(() => {
    setMessages([]);
    setActiveThreadId(null);
  }, [setActiveThreadId]);

  return {
    messages,
    agentResponses,
    verdict,
    syncRate,
    contradiction,
    append,
    reset,
    isLoading,
  };
}
