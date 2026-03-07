import { db } from "@/lib/firebase/client";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs, 
  serverTimestamp, 
  Timestamp,
  limit
} from "firebase/firestore";
import { AgentResponse } from "@/lib/agents/types";

// Storage limits to prevent excessive data
const MAX_USER_INPUT_LENGTH = 500;
const MAX_RESPONSE_CONTENT_LENGTH = 1000;
const DEFAULT_HISTORY_LIMIT = 50;
const STATS_HISTORY_LIMIT = 100;

/**
 * Decision record stored in Firestore
 * Represents a single MAGI decision with all agent votes and final verdict
 */
export interface DecisionRecord {
  id?: string;
  userId: string;
  threadId: string;
  userInput: string;
  
  // Agent votes
  votes: {
    melchior: "APPROVE" | "DENY" | "CONDITIONAL" | null;
    balthasar: "APPROVE" | "DENY" | "CONDITIONAL" | null;
    casper: "APPROVE" | "DENY" | "CONDITIONAL" | null;
  };
  
  // Final verdict
  verdict: "APPROVE" | "DENY" | "CONDITIONAL";
  
  // Sync rate at time of decision
  syncRate: number;
  
  // Contradiction info
  hasContradiction: boolean;
  contradictionSeverity?: "none" | "mild" | "severe";
  
  // Full agent responses (for detailed analysis)
  agentResponses?: AgentResponse[];
  
  // Timestamps
  createdAt: Timestamp;
}

export const DecisionService = {
  /**
   * Save a decision record to Firestore
   */
  async saveDecision(
    userId: string, 
    threadId: string, 
    userInput: string,
    agentResponses: AgentResponse[],
    verdict: "APPROVE" | "DENY" | "CONDITIONAL",
    syncRate: number,
    contradiction: { hasContradiction: boolean; severity: "none" | "mild" | "severe" }
  ): Promise<string> {
    const decisionsRef = collection(db, "users", userId, "decisions");
    
    // Extract votes from agent responses
    const votes = {
      melchior: agentResponses.find(r => r.role === "MELCHIOR")?.metadata?.vote || null,
      balthasar: agentResponses.find(r => r.role === "BALTHASAR")?.metadata?.vote || null,
      casper: agentResponses.find(r => r.role === "CASPER")?.metadata?.vote || null,
    };

    const docRef = await addDoc(decisionsRef, {
      userId,
      threadId,
      userInput: userInput.substring(0, MAX_USER_INPUT_LENGTH),
      votes,
      verdict,
      syncRate,
      hasContradiction: contradiction.hasContradiction,
      contradictionSeverity: contradiction.severity ?? null,
      agentResponses: agentResponses.map(r => ({
        role: r.role,
        content: r.content.substring(0, MAX_RESPONSE_CONTENT_LENGTH),
        vote: r.metadata?.vote ?? null,
        needsClarification: r.metadata?.needsClarification ?? null,
      })),
      createdAt: serverTimestamp(),
    });
    
    return docRef.id;
  },

  /**
   * Get decision history for a user
   */
  async getDecisionHistory(userId: string, maxResults: number = DEFAULT_HISTORY_LIMIT): Promise<DecisionRecord[]> {
    const decisionsRef = collection(db, "users", userId, "decisions");
     
    const q = query(decisionsRef, orderBy("createdAt", "desc"), limit(maxResults));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as DecisionRecord));
  },

  /**
   * Get decision statistics for a user
   */
  async getDecisionStats(userId: string): Promise<{
    total: number;
    approves: number;
    denies: number;
    conditionals: number;
    avgSyncRate: number;
    contradictionRate: number;
  }> {
    const decisions = await this.getDecisionHistory(userId, STATS_HISTORY_LIMIT);
    
    const total = decisions.length;
    const approves = decisions.filter(d => d.verdict === "APPROVE").length;
    const denies = decisions.filter(d => d.verdict === "DENY").length;
    const conditionals = decisions.filter(d => d.verdict === "CONDITIONAL").length;
    const avgSyncRate = total > 0 
      ? decisions.reduce((sum, d) => sum + d.syncRate, 0) / total 
      : 0;
    const contradictionRate = total > 0
      ? decisions.filter(d => d.hasContradiction).length / total * 100
      : 0;

    return { total, approves, denies, conditionals, avgSyncRate, contradictionRate };
  }
};
