// import { CoreMessage } from "ai";

// Define CoreMessage manually to avoid import issues
export type CoreMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'function'; content: string; name: string }
  | { role: 'tool'; content: any }; // Simplified tool content

export type WellKnownRole = "MELCHIOR" | "BALTHASAR" | "CASPER" | "INTEGRATOR" | "OUTPUT";
export type AgentRole = WellKnownRole | (string & {});

/** エージェント処理モード: serial=直列(無料), parallel=並列(課金) */
export type ProcessingMode = "serial" | "parallel";

export interface AgentResponse {
  content: string;
  role: AgentRole;
  metadata?: {
    confidence?: number;
    reasoning?: string;
    sources?: string[];
    // For MAGI logic
    vote?: "APPROVE" | "DENY" | "CONDITIONAL";
    error?: string;
    isRateLimit?: boolean;
    // For probing algorithm (P4-T-005)
    needsClarification?: boolean;
    clarificationQuestions?: string[];
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

export interface AgentContext {
  history: CoreMessage[];
  sessionId?: string;
  additionalContext?: string;
}

export interface IAgent {
  name: string;
  role: AgentRole;
  process(input: string, context?: AgentContext, onChunk?: (chunk: string) => void): Promise<AgentResponse>;
}
