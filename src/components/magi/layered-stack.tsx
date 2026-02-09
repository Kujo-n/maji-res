import { AgentResponse } from "@/lib/agents/types";

export function LayeredStack({ responses }: { responses: AgentResponse[] | null }) {
  if (!responses || responses.length === 0) return null;

  // Use a fixed order: Melchior, Balthasar, Casper
  const sortedResponses = [
    responses.find(r => r.role === "MELCHIOR"),
    responses.find(r => r.role === "BALTHASAR"),
    responses.find(r => r.role === "CASPER"),
  ].filter(Boolean) as AgentResponse[];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {sortedResponses.map((agent) => (
        <div 
          key={agent.role} 
          className={`p-3 rounded-lg border shadow-sm ${getColor(agent.role)} transition-colors`}
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

function getColor(role: string) {
  switch (role) {
    case "MELCHIOR": 
      return "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-100 dark:bg-blue-950/20";
    case "BALTHASAR": 
      return "border-red-500/30 bg-red-500/5 text-red-900 dark:text-red-100 dark:bg-red-950/20";
    case "CASPER": 
      return "border-green-500/30 bg-green-500/5 text-green-900 dark:text-green-100 dark:bg-green-950/20";
    default: 
      return "border-gray-500/30 bg-gray-500/5";
  }
}
