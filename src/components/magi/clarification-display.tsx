"use client";

import { AgentResponse } from "@/lib/agents/types";
import { cn } from "@/lib/utils";

interface ClarificationDisplayProps {
  responses: AgentResponse[];
  className?: string;
}

export function ClarificationDisplay({ responses, className }: ClarificationDisplayProps) {
  // Collect all clarification questions from all agents
  const allQuestions: { agent: string; question: string }[] = [];
  
  responses.forEach(r => {
    if (r.metadata?.clarificationQuestions && r.metadata.clarificationQuestions.length > 0) {
      r.metadata.clarificationQuestions.forEach(q => {
        allQuestions.push({ agent: r.role, question: q });
      });
    }
  });

  if (allQuestions.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "border border-yellow-500/40 bg-yellow-950/20 rounded-md p-4 my-4",
      className
    )}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-yellow-500 text-lg">⚠️</span>
        <h3 className="text-sm font-bold text-yellow-400 tracking-wide">
          追加情報が必要です
        </h3>
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">
        3賢者がより正確な判断を下すために、以下の質問にお答えください：
      </p>
      
      <ul className="space-y-2">
        {allQuestions.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <span className={cn(
              "text-xs font-mono px-1 py-0.5 rounded",
              item.agent === "MELCHIOR" && "bg-blue-900/50 text-blue-400",
              item.agent === "BALTHASAR" && "bg-red-900/50 text-red-400",
              item.agent === "CASPER" && "bg-green-900/50 text-green-400"
            )}>
              {item.agent}
            </span>
            <span className="text-foreground/90">{item.question}</span>
          </li>
        ))}
      </ul>
      
      <p className="text-xs text-muted-foreground mt-3 italic">
        ※ 上記の質問に回答を含めて再度メッセージを送信してください。
      </p>
    </div>
  );
}
