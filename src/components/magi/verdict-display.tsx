"use client";

import { cn } from "@/lib/utils";
import { magiHaptic } from "@/lib/haptics";
import { useEffect } from "react";

interface VerdictDisplayProps {
  verdict: "APPROVE" | "DENY" | "CONDITIONAL" | null;
}

export function VerdictDisplay({ verdict }: VerdictDisplayProps) {
  // Trigger haptic feedback when verdict changes
  useEffect(() => {
    if (!verdict) return;
    
    switch (verdict) {
      case "APPROVE":
        magiHaptic.verdictApprove();
        break;
      case "DENY":
        magiHaptic.verdictDeny();
        break;
      case "CONDITIONAL":
        magiHaptic.verdictConditional();
        break;
    }
  }, [verdict]);

  if (!verdict) return null;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-6 my-4 border-y-2 w-full animate-in zoom-in duration-500",
      getStyes(verdict)
    )}>
      <span className="text-xs font-mono uppercase tracking-widest opacity-70 mb-1">
        MAGI SYSTEM VERDICT
      </span>
      <h2 className="text-3xl md:text-5xl font-black tracking-[0.2em] uppercase drop-shadow-sm">
        {getJapaneseVerdict(verdict)}
      </h2>
    </div>
  );
}

function getJapaneseVerdict(verdict: string) {
  switch (verdict) {
    case "APPROVE": return "可　決";
    case "DENY": return "否　決";
    case "CONDITIONAL": return "条件付";
    default: return verdict;
  }
}

function getStyes(verdict: string) {
  switch (verdict) {
    case "APPROVE":
      return "border-blue-500/50 bg-blue-500/5 text-blue-600 dark:text-blue-400";
    case "DENY":
      return "border-red-500/50 bg-red-500/5 text-red-600 dark:text-red-400";
    case "CONDITIONAL":
      return "border-orange-500/50 bg-orange-500/5 text-orange-600 dark:text-orange-400";
    default:
      return "border-gray-500";
  }
}
