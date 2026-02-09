"use client";

import { cn } from "@/lib/utils";

interface ContextStaleWarningProps {
  onContinue: () => void;
  onReset: () => void;
  className?: string;
}

export function ContextStaleWarning({ onContinue, onReset, className }: ContextStaleWarningProps) {
  return (
    <div className={cn(
      "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center",
      className
    )}>
      <div className="bg-card border border-yellow-500/40 rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⏰</span>
          <h2 className="text-lg font-bold text-yellow-400">セッションの有効期限</h2>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          前回の会話から24時間以上経過しました。コンテクストが古くなっている可能性があります。
        </p>
        
        <p className="text-sm text-foreground/80 mb-6">
          会話を続けますか？または新しいセッションを開始しますか？
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onContinue}
            className={cn(
              "px-4 py-2 text-sm font-mono rounded-md",
              "border border-muted-foreground/30",
              "hover:bg-muted/30 transition-colors"
            )}
          >
            続ける
          </button>
          <button
            onClick={onReset}
            className={cn(
              "px-4 py-2 text-sm font-mono rounded-md",
              "bg-yellow-600 text-white",
              "hover:bg-yellow-500 transition-colors"
            )}
          >
            新規セッション
          </button>
        </div>
      </div>
    </div>
  );
}
