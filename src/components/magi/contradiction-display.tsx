"use client";

import { cn } from "@/lib/utils";
import { ContradictionInfo } from "@/lib/types";


interface ContradictionDisplayProps {
  contradiction: ContradictionInfo | null;
  className?: string;
}

export function ContradictionDisplay({ contradiction, className }: ContradictionDisplayProps) {
  if (!contradiction || !contradiction.hasContradiction) {
    return null;
  }

  const isSevere = contradiction.severity === "severe";

  return (
    <div className={cn(
      "border rounded-md p-3 my-3",
      isSevere 
        ? "border-red-500/50 bg-red-950/30" 
        : "border-orange-500/40 bg-orange-950/20",
      className
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("text-lg", isSevere ? "text-red-500" : "text-orange-500")}>
          {isSevere ? "⚠️" : "⚡"}
        </span>
        <h3 className={cn(
          "text-sm font-bold tracking-wide",
          isSevere ? "text-red-400" : "text-orange-400"
        )}>
          {isSevere ? "深刻な意見対立" : "意見の相違"}
        </h3>
      </div>
      
      {contradiction.message && (
        <p className="text-sm text-foreground/80 mb-2">
          {contradiction.message}
        </p>
      )}
      
      <div className="flex gap-4 text-xs">
        {contradiction.conflictingAgents.approve.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-green-500">✓</span>
            <span className="text-muted-foreground">賛成:</span>
            <span className="text-green-400 font-mono">
              {contradiction.conflictingAgents.approve.join(", ")}
            </span>
          </div>
        )}
        {contradiction.conflictingAgents.deny.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-red-500">✗</span>
            <span className="text-muted-foreground">反対:</span>
            <span className="text-red-400 font-mono">
              {contradiction.conflictingAgents.deny.join(", ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
