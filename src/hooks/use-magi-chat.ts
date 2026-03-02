"use client";

import { useAuth } from "@/lib/auth-context";
import { useChatContext } from "@/components/chat/chat-context";
import { usePreset } from "@/components/preset/preset-context";
import { Message } from "@/lib/types";
import { toast } from "sonner";
import { ChatService } from "@/lib/services/chat-service";

import { useChatSession, findLastAssistantMessage } from "./use-chat-session";
import { useMagiStream, generateId } from "./use-magi-stream";

export { findLastAssistantMessage };

export function useMagiChat() {
  const { user, userData } = useAuth();
  const { activeThreadId, setActiveThreadId, refreshHistory } = useChatContext();
  const { preset } = usePreset();

  // 1. スレッドやコンテキスト、ローカルメッセージ配列や派生状態を管理するカスタムフック
  const {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    agentResponses,
    verdict,
    syncRate,
    contradiction,
    reset,
  } = useChatSession();

  // 2. ストリームの取得とパース、state更新を行うカスタムフック
  const { streamChat } = useMagiStream();

  // ---------------------------------------------------------------------------
  // メッセージ送信オーケストレーション
  // ---------------------------------------------------------------------------
  const append = async (message: Omit<Message, "id">) => {
    if (!user || !userData) {
      toast.error("ユーザー情報の取得に失敗しました");
      return;
    }

    const role = userData.role || "user";
    let currentThreadId = activeThreadId;

    // 新規スレッドの作成と保存
    if (!currentThreadId) {
      try {
        currentThreadId = await ChatService.createThread(user.uid, role, preset, message.content.substring(0, 30) + "...");
        setActiveThreadId(currentThreadId);
        refreshHistory();
      } catch (e: any) {
        console.error("Failed to create thread", e);
        toast.error("スレッド作成エラーが発生しました");
        return;
      }
    }

    // ユーザーメッセージのローカル反映
    const userMessage: Message = {
      ...message,
      id: generateId(),
      role: "user",
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // ユーザーメッセージのFirestore保存と上限チェック
    if (currentThreadId) {
      try {
        await ChatService.addMessage(user.uid, role, currentThreadId, userMessage);
      } catch (e: any) {
        if (e.message === "MESSAGE_LIMIT_REACHED") {
          toast.error("このスレッドのメッセージ件数上限に達しました。新しい会話を作成してください。");
        } else {
          toast.error("メッセージの保存に失敗しました");
        }
        setIsLoading(false);
        setMessages((prev) => prev.slice(0, -1)); // ロールバック
        return;
      }
    }

    // アシスタント用のプレースホルダーメッセージを作成
    let assistantMessage: Message = {
      id: generateId(),
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    // Request & Stream Parser
    await streamChat(user, preset, message.content, assistantMessage, setMessages);

    // Stream 終了後の Firestore 保存処理
    if (currentThreadId) {
      ChatService.addMessage(user.uid, role, currentThreadId, assistantMessage).catch(console.error);

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

    setIsLoading(false);
  };

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
