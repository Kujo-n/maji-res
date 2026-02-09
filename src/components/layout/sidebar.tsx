"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageCircle, Plus } from "lucide-react";

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">MAJI-RES</h2>
          <div className="space-y-1">
            <Button variant="secondary" className="w-full justify-start">
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">History</h2>
          <div className="space-y-1">
            {/* Mock History */}
            <Button variant="ghost" className="w-full justify-start font-normal">
              <MessageCircle className="mr-2 h-4 w-4" />
              Previous Chat 1
            </Button>
            <Button variant="ghost" className="w-full justify-start font-normal">
              <MessageCircle className="mr-2 h-4 w-4" />
              Previous Chat 2
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
