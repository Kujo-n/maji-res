import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SyncRateDisplayProps {
  rate: number; // 0-100
  isLoading?: boolean;
  className?: string;
}

export function SyncRateDisplay({ rate, isLoading, className }: SyncRateDisplayProps) {
  const [bars, setBars] = useState<number[]>([]);

  // Generate random waveform data based on rate
  useEffect(() => {
    const generateWave = () => {
      const newBars = Array.from({ length: 50 }).map(() => {
        // Base height depends on rate, plus random noise
        const noise = Math.random() * 30;
        const value = (rate * 0.8) + noise; 
        return Math.min(100, Math.max(5, value));
      });
      setBars(newBars);
    };

    generateWave();
    
    // Animate if loading or active
    let interval: NodeJS.Timeout;
    if (isLoading || rate > 0) {
        interval = setInterval(generateWave, 100);
    }

    return () => clearInterval(interval);
  }, [rate, isLoading]);

  return (
    <div className={cn("border border-orange-500/30 bg-black/20 p-3 font-mono text-orange-500 rounded-sm w-full max-w-md mx-auto", className)}>
      <div className="flex justify-between items-end mb-2 border-b border-orange-500/20 pb-1">
        <span className="text-[10px] tracking-widest opacity-70">NEURAL SYNC RATIO</span>
        <span className={cn("text-2xl font-bold transition-all duration-300", 
            rate > 400 ? "text-red-500 animate-pulse" : "text-orange-400"
        )}>
            {rate.toFixed(2)}%
        </span>
      </div>
      
      {/* Waveform visualization */}
      <div className="h-12 w-full flex items-end gap-[2px] overflow-hidden opacity-80">
        {bars.map((height, i) => (
            <div 
                key={i} 
                className="flex-1 bg-orange-500/50 transition-all duration-100 ease-in-out"
                style={{ 
                    height: `${height}%`,
                    opacity: 0.3 + (height / 150)
                }} 
            />
        ))}
      </div>
      
      {/* Status Line */}
      <div className="flex justify-between mt-1 text-[9px] uppercase tracking-wider opacity-60">
        <span>Pattern: {rate > 80 ? "BLUE" : rate > 50 ? "ORANGE" : "RED"}</span>
        <span>{isLoading ? "ANALYZING..." : "STANDBY"}</span>
      </div>
    </div>
  );
}
