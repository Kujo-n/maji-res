"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal } from "lucide-react";
import { KeyboardEvent, useRef } from "react";
import { magiHaptic } from "@/lib/haptics";

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function ChatInput({ input, handleInputChange, handleSubmit, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Verify form exists before requesting submit
      e.currentTarget.form?.requestSubmit();
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    magiHaptic.sendMessage();
    handleSubmit(e);
  };

  return (
    <div className="relative p-4 border-t bg-background touch-manipulation">
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          name="prompt"
          placeholder="Ask MAGI..."
          className="min-h-[60px] resize-none text-base" 
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          disabled={isLoading || !input.trim()} 
          size="icon"
          className="min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
          onClick={() => magiHaptic.buttonPress()}
        >
          <SendHorizontal className="h-5 w-5" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
