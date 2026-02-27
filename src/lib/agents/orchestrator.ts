import { AgentIntegrator } from "./integrator";
import { AgentResponse, AgentContext } from "./types";

export interface MagiResult {
  finalResponse: string;
  agentResponses: AgentResponse[];
  syncRate: number; // 0-100
  decision: "APPROVE" | "DENY" | "CONDITIONAL";
}


export class MagiOrchestrator {
  private integrator: AgentIntegrator;

  constructor() {
    this.integrator = new AgentIntegrator();
  }

  async process(input: string, context?: AgentContext): Promise<MagiResult> {
    // Step 1: Run all three agents in parallel
    const agentResponses = await this.integrator.parallelProcess(input, context);

    // Step 2: Calculate sync rate (simplified: based on response similarity/agreement)
    const syncRate = this.calculateSyncRate(agentResponses);

    // Step 3: Determine decision based on agent responses (simplified majority vote)
    const decision = this.determineDecision(agentResponses);

    // Step 4: Synthesize the responses into a final answer
    const finalResponse = await this.integrator.synthesize(input, agentResponses);

    return {
      finalResponse,
      agentResponses,
      syncRate,
      decision,
    };
  }

  private calculateSyncRate(responses: AgentResponse[]): number {
    // Simplified sync rate calculation
    // In a real implementation, this would analyze semantic similarity
    // For now, return a mock value based on response length variance
    const lengths = responses.map((r) => r.content.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.abs(len - avgLength), 0) / lengths.length;
    
    // Lower variance = higher sync rate
    const normalizedVariance = Math.min(variance / avgLength, 1);
    return Math.round((1 - normalizedVariance) * 100);
  }

  private determineDecision(responses: AgentResponse[]): "APPROVE" | "DENY" | "CONDITIONAL" {
    return this.integrator.determineDecision(responses);
  }
}
