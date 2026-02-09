"use client";

import { useNetworkStatus } from "@/hooks/use-network-status";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-2 bg-yellow-500/90 text-yellow-950 px-4 py-2 rounded-lg shadow-lg">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">オフラインモード</span>
      </div>
    </div>
  );
}
