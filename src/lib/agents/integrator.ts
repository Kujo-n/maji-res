import { IAgent, AgentResponse, AgentContext } from "./types";
import { ConfigurableAgent } from "./configurable-agent";
import { generateText } from "ai";
import { resolveModel } from "./provider-resolver";
import { loadPromptTemplate, loadPresetConfig } from "./prompts/prompt-loader";

export class AgentIntegrator {
  private agents: IAgent[];
  private modelName: string;
  private providerName: string;

  constructor(preset?: string) {
    const config = loadPresetConfig(preset);
    this.providerName = config.provider || "google";
    this.modelName = config.defaultModel || "gemini-2.5-flash";
    this.agents = config.agents.map(def => new ConfigurableAgent(def, preset, this.modelName, this.providerName));
  }

  async parallelProcess(input: string, context?: AgentContext): Promise<AgentResponse[]> {
    const results: AgentResponse[] = [];
    
    // Execute sequentially to avoid rate limits (Gemini Flash free tier has strict RPM)
    for (const agent of this.agents) {
      try {
        const response = await agent.process(input, context);
        results.push(response);
      } catch (error) {
        console.error(`Error in ${agent.name}:`, error);
        results.push({
          role: agent.role,
          content: `[システムエラー] ${agent.name} の処理中にエラーが発生しました。`,
          metadata: { error: String(error) },
        } as AgentResponse);
      }
      // 2000ms delay between requests for rate limit safety
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return results;
  }

  async synthesize(input: string, responses: AgentResponse[]): Promise<string> {
    const context = responses.map(r => `[${r.role}]: ${r.content}`).join("\n\n");

    const prompt = loadPromptTemplate("synthesize.md", { context, input });

    try {
      const result = await generateText({
        model: resolveModel(this.providerName, this.modelName),
        messages: [{ role: "user", content: prompt }],
      });
      return result.text;
    } catch (error) {
      console.error("Error during synthesis:", error);
      return "Integration of perspectives failed due to API error. However, the MAGI system acknowledges the complexity of the query and suggests proceeding with caution.";
    }
  }


  async streamSynthesize(input: string, responses: AgentResponse[], consensusMode: "majority" | "unanimous" = "majority") {
    const { streamText, simulateReadableStream } = await import("ai");
    
    // Mock Mode Check
    if (process.env.USE_MOCK_AGENTS === "true") {
        const mockVerdict = "CONDITIONAL"; // Or derive from votes
        const mockContent = `[Mock Integration] これはモック統合回答です。
3賢者の意見を集約すると、意見が割れているため、慎重な判断が求められます。
Melchiorは科学的観点から推奨していますが、Balthasarは倫理的な懸念を示しています。
Casperの直感は肯定的ですが、リスクも指摘しています。
したがって、最終判定は「条件付き」とします。詳細な条件を確認してください。`;
        
        // Construct the full response string as expected by the stream parser
        // The parser expects distinct chunks, but here we simulate the stream directly via AI SDK tools if possible
        // OR we can just return a streamText result that uses a custom language model or simple generator.
        
        // Actually, streamText needs a model.
        // Let's use a simpler approach: Return a stream that mimics the output.
        // But streamText returns a specific object structure.
        
        // Easiest is to make a "Mock Model" compatible with AI SDK, but that's complex.
        // Let's just create a ReadableStream and wrap it in the expected response format if we were doing it manually?
        // No, `route.ts` calls `result.toTextStreamResponse()`.
        
        // Currently `streamText` returns a `StreamTextResult`.
        // We can't easily mock `StreamTextResult` without internal APIs.
        // So we will use `simulateReadableStream` if available, or just use a dummy model?
        // Let's bypass streamText for mock and return a mock object that has `toTextStreamResponse`.
        
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                const fullText = `VERDICT: ${mockVerdict}\n\n${mockContent}`;
                const chunks = fullText.split(""); // char by char simulation
                
                // Group chunks a bit to avoid too many tiny updates
                const bufferSize = 5;
                for (let i = 0; i < chunks.length; i += bufferSize) {
                    const chunkStr = chunks.slice(i, i + bufferSize).join("");
                    controller.enqueue(encoder.encode(chunkStr));
                    await new Promise(r => setTimeout(r, 20)); 
                }
                controller.close();
            }
        });
        
        return {
            toTextStreamResponse: () => new Response(stream)
        } as any;
    }
    const context = responses.map(r => {
        const vote = r.metadata?.vote || "UNKNOWN";
        return `[${r.role}] (VOTE: ${vote}): ${r.content}`;
    }).join("\n\n");

    // Dynamic voting rules based on consensus mode
    const agentCount = this.agents.length;
    const votingRules = consensusMode === "unanimous" 
      ? `投票ルール (UNANIMOUS MODE - 全会一致):
- ${agentCount}人全員が APPROVE (承認) -> 最終判定: APPROVE
- ${agentCount}人全員が DENY (否認) -> 最終判定: DENY
- それ以外 (意見の不一致) -> 最終判定: CONDITIONAL`
      : `投票ルール (MAJORITY MODE - 多数決):
- 過半数が APPROVE (承認) -> 最終判定: APPROVE
- 過半数が DENY (否認) -> 最終判定: DENY
- それ以外 (または票が割れた場合) -> 最終判定: CONDITIONAL`;

    const prompt = loadPromptTemplate("stream-synthesize.md", { context, input, votingRules });

    // Retry logic for rate limits
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return streamText({
          model: resolveModel(this.providerName, this.modelName),
          messages: [{ role: "user", content: prompt }],
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isRateLimit = lastError.message.includes("429") || lastError.message.includes("quota") || lastError.message.includes("RESOURCE_EXHAUSTED");
        
        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
          console.log(`[Integrator] Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error; // Non-rate-limit error or final attempt
      }
    }
    
    // Fallback: return mock stream if all retries exhausted
    console.error("[Integrator] All retries exhausted, returning error stream.");
    const errorStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode("VERDICT: CONDITIONAL\n\n[システムエラー] 統合エージェントへの接続に失敗しました。しばらくお待ちください。"));
        controller.close();
      }
    });
    return { toTextStreamResponse: () => new Response(errorStream) } as any;
  }
  calculateSyncRate(responses: AgentResponse[]): number {
      const total = responses.length;
      let approve = 0;
      let deny = 0;
      let conditional = 0;

      responses.forEach(r => {
          const vote = r.metadata?.vote;
          if (vote === "APPROVE") approve++;
          else if (vote === "DENY") deny++;
          else conditional++;
      });

      // Dynamic calculation based on agent count
      // Unanimous -> High sync (90-100%)
      // Majority  -> Medium sync (60-80%)
      // Split     -> Low sync (10-40%)
      
      let baseRate = 0;
      if (approve === total || deny === total) baseRate = 96;
      else if (approve > total / 2 || deny > total / 2) baseRate = 65;
      else baseRate = 25;

      // Add random fluctuation and confidence factor
      const noise = (Math.random() * 10) - 5; // +/- 5%
      let rate = baseRate + noise;

      // Clamp
      return Math.min(100, Math.max(0, rate));
  }

  /**
   * Detect contradictions between agent votes.
   * A contradiction occurs when there's both APPROVE and DENY votes (direct conflict).
   */
  detectContradictions(responses: AgentResponse[]): {
    hasContradiction: boolean;
    conflictingAgents: { approve: string[]; deny: string[] };
    severity: "none" | "mild" | "severe";
    message?: string;
  } {
    const approvers: string[] = [];
    const deniers: string[] = [];

    responses.forEach(r => {
      const vote = r.metadata?.vote;
      if (vote === "APPROVE") approvers.push(r.role);
      else if (vote === "DENY") deniers.push(r.role);
    });

    const hasContradiction = approvers.length > 0 && deniers.length > 0;

    let severity: "none" | "mild" | "severe" = "none";
    let message: string | undefined;

    if (hasContradiction) {
      if (approvers.length === 1 && deniers.length === 1) {
        severity = "mild";
        message = `${approvers[0]} と ${deniers[0]} の間で意見が対立しています。`;
      } else if (approvers.length >= 1 && deniers.length >= 1) {
        severity = "severe";
        message = `エージェント間で深刻な意見対立が発生しています。賛成派: ${approvers.join(", ")} / 反対派: ${deniers.join(", ")}`;
      }
    }

    return {
      hasContradiction,
      conflictingAgents: { approve: approvers, deny: deniers },
      severity,
      message,
    };
  }
}

/**
 * Factory function to create an integrator instance for a specific preset.
 */
export function createIntegrator(preset?: string) {
  return new AgentIntegrator(preset);
}
