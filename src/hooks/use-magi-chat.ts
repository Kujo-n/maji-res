"use client";

import { useState, useEffect } from "react";
import { AgentResponse } from "@/lib/agents/types";

import { ChatService } from "@/lib/services/chat-service";
import { DecisionService } from "@/lib/services/decision-service";
import { useAuth } from "@/lib/auth-context";
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

const CONTEXT_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours (1 day)

export function useMagiChat() {
  const { user } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentResponses, setAgentResponses] = useState<AgentResponse[] | null>(null);
  const [verdict, setVerdict] = useState<"APPROVE" | "DENY" | "CONDITIONAL" | null>(null);
  const [syncRate, setSyncRate] = useState<number | null>(null);
  const [contradiction, setContradiction] = useState<{
    hasContradiction: boolean;
    conflictingAgents: { approve: string[]; deny: string[] };
    severity: "none" | "mild" | "severe";
    message?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isContextStale, setIsContextStale] = useState(false);
  // const CONTEXT_EXPIRATION_MS = 24 * 60 * 60 * 1000; // Moved outside
  
  // Restore threadId from localStorage on mount and check expiration
  useEffect(() => {
    if (!user) return;
    const storedThreadId = localStorage.getItem("magi_last_thread_id");
    const sessionStartTime = localStorage.getItem("magi_session_start_time");
    
    // Check if context is stale
    if (sessionStartTime) {
      const elapsed = Date.now() - parseInt(sessionStartTime, 10);
      if (elapsed > CONTEXT_EXPIRATION_MS) {
        setIsContextStale(true);
      }
    }
    
    if (storedThreadId) {
      setThreadId(storedThreadId);
      // Load history
      ChatService.getThreadMessages(user.uid, storedThreadId)
        .then(msgs => {
            if (msgs.length > 0) {
                setMessages(msgs);
                // Restore latest agent state if available
                const lastMsg = msgs[msgs.length - 1];
                if (lastMsg.role === 'assistant') {
                    if (lastMsg.verdict) setVerdict(lastMsg.verdict);
                    if (lastMsg.agentResponses) setAgentResponses(lastMsg.agentResponses);
                }
            }
        })
        .catch(console.error);
    }
  }, [user]);

  // Persist threadId
  useEffect(() => {
    if (threadId) {
        localStorage.setItem("magi_last_thread_id", threadId);
    }
  }, [threadId]);

  const append = async (message: Omit<Message, "id">) => {
    if (!user) return; // Guard

    let currentThreadId = threadId;
    if (!currentThreadId) {
        try {
            currentThreadId = await ChatService.createThread(user.uid, message.content.substring(0, 30) + "...");
            setThreadId(currentThreadId);
            // Set session start time for context expiration tracking
            localStorage.setItem("magi_session_start_time", Date.now().toString());
            setIsContextStale(false);
        } catch (e) {
            console.error("Failed to create thread", e);
            // Continue without persistence if fails? Or stop?
            // Let's continue for UX, but log error.
        }
    }

    const userMessage: Message = {
      ...message,
      id: generateId(),
      role: "user",
      createdAt: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setAgentResponses(null); 
    setVerdict(null); 
    setSyncRate(null);
    setContradiction(null);
    setIsLoading(true);

    // Save User Message
    if (currentThreadId) {
        ChatService.addMessage(user.uid, currentThreadId, userMessage).catch(console.error);
    }

    try {
      const response = await fetch("/api/magi/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.content }),
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
                        const v = verdictMatch[1] as any;
                        setVerdict(v);
                        assistantMessage.verdict = v; // Update local obj
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

                // Update messages state
                 setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { ...assistantMessage };
                    return newMessages;
                });

            } else if (line.startsWith('2:')) {
                try {
                    // Protocol: 2:[{ agentResponses, syncRate }]
                    const data = JSON.parse(line.substring(2));
                    if (Array.isArray(data) && data.length > 0) {
                        const payload = data[0]; 
                        if (payload) {
                            if (payload.agentResponses) {
                                setAgentResponses(payload.agentResponses);
                                assistantMessage.agentResponses = payload.agentResponses;
                            }
                            if (typeof payload.syncRate === "number") {
                                setSyncRate(payload.syncRate);
                            }
                            if (payload.contradiction) {
                                setContradiction(payload.contradiction);
                            }
                        }
                    }
                } catch (e) { console.error(e); }
            }
        }
      }
      
      // Save Assistant Message
      if (currentThreadId) {
          ChatService.addMessage(user.uid, currentThreadId, assistantMessage).catch(console.error);
          
          // Save decision to Firestore if we have a verdict
          if (assistantMessage.verdict && assistantMessage.agentResponses) {
            DecisionService.saveDecision(
              user.uid,
              currentThreadId,
              message.content,
              assistantMessage.agentResponses,
              assistantMessage.verdict,
              syncRate || 0,
              contradiction || { hasContradiction: false, severity: "none" as const }
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
          content: `Error: MAGIとの通信に失敗しました。(${errorMsg})` 
      };
      setMessages((prev) => [...prev, errorMessage]);
      // Should we save error messages? Maybe not.
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset the MAGI session - clears all state and starts fresh
   */
  const reset = () => {
    setMessages([]);
    setAgentResponses(null);
    setVerdict(null);
    setSyncRate(null);
    setContradiction(null);
    setThreadId(null);
    setIsContextStale(false);
    localStorage.removeItem("magi_last_thread_id");
    localStorage.removeItem("magi_session_start_time");
  };

  /**
   * Dismiss the stale context warning (user chose to continue)
   */
  const dismissStaleWarning = () => {
    setIsContextStale(false);
    // Optionally refresh the session start time
    localStorage.setItem("magi_session_start_time", Date.now().toString());
  };

  return {
    messages,
    agentResponses,
    verdict,
    syncRate,
    contradiction,
    isContextStale,
    append,
    reset,
    dismissStaleWarning,
    isLoading,
  };
}
