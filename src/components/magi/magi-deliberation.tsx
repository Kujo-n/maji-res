"use client";

import { Message } from "@/lib/types";
import { LayeredStack } from "@/components/magi/layered-stack";
import { VerdictDisplay } from "@/components/magi/verdict-display";
import { SyncRateDisplay } from "@/components/magi/sync-rate-display";
import { ClarificationDisplay } from "@/components/magi/clarification-display";
import { ContradictionDisplay } from "@/components/magi/contradiction-display";
import React from "react";

interface MagiDeliberationProps {
  message: Message;
  isLoading?: boolean;
  onClarificationAnswer?: (question: string) => void;
  onClarificationAnswerAll?: (questions: string[]) => void;
}

/**
 * 各アシスタントメッセージに紐づくMAGI審議結果を表示するコンポーネント。
 * LayeredStack, VerdictDisplay, SyncRateDisplay, ClarificationDisplay,
 * ContradictionDisplay をまとめて管理する。
 */
export const MagiDeliberation = React.memo(function MagiDeliberation({
  message,
  isLoading = false,
  onClarificationAnswer,
  onClarificationAnswerAll,
}: MagiDeliberationProps) {
  if (!message.agentResponses) return null;

  return (
    <div className="my-4">
      <div className="text-xs text-muted-foreground mb-2 text-center font-mono">
        --- MAGI DELIBERATION ---
      </div>
      <LayeredStack responses={message.agentResponses} />
      <VerdictDisplay verdict={message.verdict ?? null} />
      {message.verdict && (
        <div className="w-full flex justify-center mb-6">
          <SyncRateDisplay
            rate={message.syncRate || 0}
            isLoading={isLoading}
          />
        </div>
      )}
      <ClarificationDisplay
        responses={message.agentResponses}
        onAnswerClick={onClarificationAnswer}
        onAnswerAllClick={onClarificationAnswerAll}
      />
      <ContradictionDisplay contradiction={message.contradiction ?? null} />
    </div>
  );
});
