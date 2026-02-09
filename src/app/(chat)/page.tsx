"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";
import { useMagiChat } from "@/hooks/use-magi-chat"; 
import { LayeredStack } from "@/components/magi/layered-stack";
import { VerdictDisplay } from "@/components/magi/verdict-display";
import { SyncRateDisplay } from "@/components/magi/sync-rate-display";
import { ClarificationDisplay } from "@/components/magi/clarification-display";
import { ContradictionDisplay } from "@/components/magi/contradiction-display";
import { useEffect, useRef, useState } from "react";
import { ResetButton } from "@/components/magi/reset-button";
import { ContextStaleWarning } from "@/components/magi/context-stale-warning";

export default function ChatPage() {
  const { messages, agentResponses, verdict, syncRate, contradiction, isContextStale, append, reset, dismissStaleWarning, isLoading } = useMagiChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentResponses, verdict]); 

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
// ...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && input.trim()) {
      await append({ role: "user", content: input });
      setInput("");
    }
  };

  return (
    <div className="flex h-dvh flex-col touch-manipulation">
      {/* Header with reset button */}
      {messages.length > 0 && (
        <div className="flex justify-end p-2 sm:p-3 border-b border-border/30 pt-safe">
          <ResetButton onReset={reset} disabled={isLoading} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 max-w-4xl mx-auto w-full scroll-smooth-ios">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 text-muted-foreground">
            <h1 className="text-2xl font-bold tracking-tighter text-foreground">MAGI System</h1>
            <p className="text-sm">Enter your query to initiate the council of three.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-4">
            {messages.map((m) => {
              // Show agent responses before the assistant's message, if it's the last assistant message
              // Or better: show it as a separate block?
              // The agentResponses state in useMagiChat is global for the current turn.
              // But we want to persist it? 
              // Currently useMagiChat resets agentResponses on new append.
              // So we should display it at the bottom, before the loading indicator or with the latest assistant message.
              
              // Simple approach: Display current agentResponses at the bottom if available.
              return (
                  <MessageBubble key={m.id} role={m.role} content={m.content} />
              );
            })}
            
            {/* Display Agent Council if active (and belongs to the latest turn) */}
            {agentResponses && (
              <div className="my-4">
                 <div className="text-xs text-muted-foreground mb-2 text-center font-mono">--- MAGI DELIBERATION IN PROGRESS ---</div>
                 <LayeredStack responses={agentResponses} />
                 <VerdictDisplay verdict={verdict} />
                 {(verdict || isLoading) && (
                     <div className="w-full flex justify-center mb-6">
                        <SyncRateDisplay 
                            rate={syncRate || 0}
                            isLoading={isLoading} 
                        />
                     </div>
                 )}
                 {/* Display probing questions if any agent needs clarification */}
                 <ClarificationDisplay responses={agentResponses} />
                 {/* Display contradiction warning if agents conflict */}
                 <ContradictionDisplay contradiction={contradiction} />
              </div>
            )}

            {isLoading && !agentResponses && (
               // Simple loading before agents return
               <div className="flex justify-center py-4">
                 <span className="text-xs text-muted-foreground animate-pulse font-mono">Initializing MAGI Protocol...</span>
               </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="max-w-4xl mx-auto w-full p-3 sm:p-4 pb-safe">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
      
      {/* Context stale warning modal */}
      {isContextStale && messages.length > 0 && (
        <ContextStaleWarning 
          onContinue={dismissStaleWarning} 
          onReset={reset} 
        />
      )}
    </div>
  );
}
