import { AgentResponse } from "@/lib/agents/types";

export function LayeredStack({ responses }: { responses: AgentResponse[] | null }) {
  if (!responses || responses.length === 0) return null;

  const sortedResponses = responses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {sortedResponses.map((agent, index) => (
        <div 
          key={agent.role} 
          className={`p-3 rounded-lg border shadow-sm ${getColor(agent.role, index)} transition-colors`}
        >
           <div className="flex items-center justify-between mb-2">
             <h3 className="font-bold text-xs tracking-wider uppercase opacity-80">{agent.role}</h3>
             <span className="text-[10px] opacity-60 font-mono">MAGI-SYS</span>
           </div>
           <p className="text-xs leading-relaxed whitespace-pre-wrap">{agent.content}</p>
        </div>
      ))}
    </div>
  );
}

function getColor(role: string, index?: number) {
  // 後方互換性のため特定のロール用の色は固定で残す
  if (role === "MELCHIOR") return "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-100 dark:bg-blue-950/20";
  if (role === "BALTHASAR") return "border-red-500/30 bg-red-500/5 text-red-900 dark:text-red-100 dark:bg-red-950/20";
  if (role === "CASPER") return "border-green-500/30 bg-green-500/5 text-green-900 dark:text-green-100 dark:bg-green-950/20";

  // カスタムペルソナ用の汎用色分け (3色をローテーション)
  const idx = index ?? 0;
  if (idx % 3 === 0) return "border-indigo-500/30 bg-indigo-500/5 text-indigo-900 dark:text-indigo-100 dark:bg-indigo-950/20";
  if (idx % 3 === 1) return "border-orange-500/30 bg-orange-500/5 text-orange-900 dark:text-orange-100 dark:bg-orange-950/20";
  if (idx % 3 === 2) return "border-teal-500/30 bg-teal-500/5 text-teal-900 dark:text-teal-100 dark:bg-teal-950/20";
  
  return "border-gray-500/30 bg-gray-500/5";
}
