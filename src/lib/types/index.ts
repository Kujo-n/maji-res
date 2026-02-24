import { AgentResponse } from "@/lib/agents/types";
import { Timestamp } from "firebase/firestore";

export interface ContradictionInfo {
  hasContradiction: boolean;
  conflictingAgents: { approve: string[]; deny: string[] };
  severity: "none" | "mild" | "severe";
  message?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  verdict?: "APPROVE" | "DENY" | "CONDITIONAL";
  agentResponses?: AgentResponse[];
  syncRate?: number;
  contradiction?: ContradictionInfo;
  createdAt?: Date | Timestamp; // Optional context-dependent
}

