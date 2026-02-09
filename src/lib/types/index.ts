import { AgentResponse } from "@/lib/agents/types";
import { Timestamp } from "firebase/firestore";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  verdict?: "APPROVE" | "DENY" | "CONDITIONAL";
  agentResponses?: AgentResponse[];
  createdAt?: Date | Timestamp; // Optional context-dependent
}
