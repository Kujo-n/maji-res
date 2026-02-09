"use client";

import { cn } from "@/lib/utils";

interface ResetButtonProps {
  onReset: () => void;
  disabled?: boolean;
  className?: string;
}

export function ResetButton({ onReset, disabled, className }: ResetButtonProps) {
  const handleClick = () => {
    if (confirm("会話をリセットしますか？すべての履歴が消去されます。")) {
      onReset();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono",
        "border border-red-500/30 rounded-md",
        "bg-red-950/20 text-red-400",
        "hover:bg-red-950/40 hover:border-red-500/50",
        "transition-colors duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      <span>⟲</span>
      <span>RESET</span>
    </button>
  );
}
