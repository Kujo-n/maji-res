"use client";

import { Message } from "@/lib/types";
import { toast } from "sonner";
import { User } from "firebase/auth";

export function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * サーバー(Vercel AI SDK)とのストリーミング通信とレスポンスパースを担当するフック
 */
export function useMagiStream() {
  const streamChat = async (
    user: User, 
    preset: string, 
    userMessageContent: string, 
    assistantMessageRef: Message,
    updateMessages: (updateFn: (prev: Message[]) => Message[]) => void
  ) => {
    try {
      // Get Firebase Auth ID token for API authentication
      const idToken = await user.getIdToken();

      const response = await fetch("/api/magi/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ message: userMessageContent, preset }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

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
                assistantMessageRef.verdict = v;
                verdictFound = true;
                text = buffer.substring(verdictMatch[0].length);
                assistantMessageRef.content += text;
                buffer = "";
              } else if (buffer.length > 50 && !buffer.startsWith("VERDICT")) {
                verdictFound = true;
                assistantMessageRef.content += buffer;
                buffer = "";
              }
            } else {
              assistantMessageRef.content += text;
            }

            // メッセージ状態を更新
            updateMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { ...assistantMessageRef };
              return newMessages;
            });

          } else if (line.startsWith('2:')) {
            try {
              const data = JSON.parse(line.substring(2));
              if (Array.isArray(data) && data.length > 0) {
                const payload = data[0];
                if (payload) {
                  if (payload.agentResponses) {
                    assistantMessageRef.agentResponses = payload.agentResponses;
                  }
                  if (typeof payload.syncRate === "number") {
                    assistantMessageRef.syncRate = payload.syncRate;
                  }
                  if (payload.contradiction) {
                    assistantMessageRef.contradiction = payload.contradiction;
                  }
                  // メッセージ状態を更新（MAGI情報を反映）
                  updateMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { ...assistantMessageRef };
                    return newMessages;
                  });
                }
              }
            } catch (e) { console.error(e); }
          }
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
      updateMessages((prev) => [...prev, errorMessage]);
    }
  };

  return { streamChat };
}
