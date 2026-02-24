"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";
import { useMagiChat } from "@/hooks/use-magi-chat";
import { MagiDeliberation } from "@/components/magi/magi-deliberation";
import { useEffect, useRef, useState } from "react";
import { ResetButton } from "@/components/magi/reset-button";

export default function ChatView() {
  const { messages, agentResponses, verdict, syncRate, contradiction, append, reset, isLoading } = useMagiChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentResponses, verdict]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && input.trim()) {
      await append({ role: "user", content: input });
      setInput("");
    }
  };

  return (
    <div className="flex h-full flex-col touch-manipulation">
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
            {messages.map((m) => (
              <div key={m.id}>
                <MessageBubble role={m.role} content={m.content} />
                {m.role === "assistant" && (
                  <MagiDeliberation message={m} />
                )}
              </div>
            ))}

            {isLoading && !agentResponses && (
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
    </div>
  );
}

