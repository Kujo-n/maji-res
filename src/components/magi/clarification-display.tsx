"use client";

import { AgentResponse } from "@/lib/agents/types";
import { cn } from "@/lib/utils";
import { MessageSquareReply } from "lucide-react";

interface ClarificationDisplayProps {
  responses: AgentResponse[];
  className?: string;
  onAnswerClick?: (question: string) => void;
  onAnswerAllClick?: (questions: string[]) => void;
}

/**
 * エージェントの応答から clarification 質問を収集する純粋関数。
 * テスト可能な形で抽出。
 */
export function collectClarificationQuestions(
  responses: AgentResponse[]
): { agent: string; question: string }[] {
  const questions: { agent: string; question: string }[] = [];
  responses.forEach(r => {
    if (r.metadata?.clarificationQuestions && r.metadata.clarificationQuestions.length > 0) {
      r.metadata.clarificationQuestions.forEach(q => {
        questions.push({ agent: r.role, question: q });
      });
    }
  });
  return questions;
}

export function ClarificationDisplay({ responses, className, onAnswerClick, onAnswerAllClick }: ClarificationDisplayProps) {
  const allQuestions = collectClarificationQuestions(responses);

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
              "text-xs font-mono px-1 py-0.5 rounded shrink-0",
              item.agent === "MELCHIOR" && "bg-blue-900/50 text-blue-400",
              item.agent === "BALTHASAR" && "bg-red-900/50 text-red-400",
              item.agent === "CASPER" && "bg-green-900/50 text-green-400"
            )}>
              {item.agent}
            </span>
            <span className="text-foreground/90 flex-1">{item.question}</span>
            {onAnswerClick && (
              <button
                type="button"
                aria-label={`「${item.question}」に回答する`}
                onClick={() => onAnswerClick(item.question)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                  "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30",
                  "transition-colors cursor-pointer border border-yellow-500/30"
                )}
              >
                <MessageSquareReply className="h-3 w-3" />
                回答する
              </button>
            )}
          </li>
        ))}
      </ul>

      {onAnswerAllClick && allQuestions.length > 1 && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            aria-label="すべての質問に一括で回答する"
            onClick={() => onAnswerAllClick(allQuestions.map(q => q.question))}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium",
              "bg-yellow-500/25 text-yellow-300 hover:bg-yellow-500/35",
              "transition-colors cursor-pointer border border-yellow-500/40"
            )}
          >
            <MessageSquareReply className="h-3.5 w-3.5" />
            すべてに回答する
          </button>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground mt-3 italic">
        {onAnswerClick
          ? "※「回答する」で個別に、「すべてに回答する」で一括プリセットできます。"
          : "※ 上記の質問に回答を含めて再度メッセージを送信してください。"}
      </p>
    </div>
  );
}
