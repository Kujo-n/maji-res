"use client";

import { usePreset } from "./preset-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Loader2 } from "lucide-react";

export function PresetSelector() {
  const { preset, setPreset, availablePresets, isLoading } = usePreset();

  return (
    <div className="px-3 py-2">
      <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-muted-foreground flex items-center">
        <Settings className="mr-2 h-3 w-3" />
        SETTINGS PRESET
      </h2>
      <div className="px-4">
        {isLoading ? (
          <div className="flex items-center text-xs text-muted-foreground">
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Loading presets...
          </div>
        ) : (
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="w-full text-xs h-8">
              <SelectValue placeholder="Select preset" />
            </SelectTrigger>
            <SelectContent>
              {availablePresets.map((p) => (
                <SelectItem key={p.name} value={p.name} className="text-xs">
                  {p.name} ({p.config.agents?.length || 0} agents)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
