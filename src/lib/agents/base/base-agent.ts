import { IAgent, AgentRole, AgentResponse, AgentContext, CoreMessage } from "../types";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export abstract class BaseAgent implements IAgent {
  name: string;
  role: AgentRole;
  modelName: string = "gemini-2.5-flash";

  constructor(name: string, role: AgentRole, modelName?: string) {
    this.name = name;
    this.role = role;
    if (modelName) this.modelName = modelName;
  }

  /**
   * Returns the system prompt specific to the agent's persona.
   */
  abstract getSystemPrompt(): string;

  /**
   * Standard processing logic using Vercel AI SDK.
   * Can be overridden if custom logic is needed.
   */
  async process(input: string, context?: AgentContext): Promise<AgentResponse> {
    const messages: any[] = [ // Use any[] for compatibility with AI SDK if strict types mismatch
      { role: "system", content: this.getSystemPrompt() },
      ...(context?.history || []),
      { role: "user", content: input },
    ];

    console.log(`[${this.name}] Processing with model: ${this.modelName}`);
    
    // Mock Mode Check
    if (process.env.USE_MOCK_AGENTS === "true") {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
        
        const votes = ["APPROVE", "DENY", "CONDITIONAL"] as const;
        const randomVote = votes[Math.floor(Math.random() * votes.length)];
        
        // Randomly decide if this agent needs clarification (30% chance)
        const needsClarification = Math.random() < 0.3;
        const mockQuestions = [
            "具体的にはどのような状況を想定していますか？",
            "この決定の背景にある理由を教えてください。",
            "他に考慮すべき要素はありますか？",
            "期待する結果はどのようなものですか？"
        ];
        const clarificationQuestions = needsClarification 
            ? [mockQuestions[Math.floor(Math.random() * mockQuestions.length)]]
            : undefined;
        
        return {
            role: this.role,
            content: `[Mock] ${this.name}: これはモック応答です。投票テスト: ${randomVote}。\n(本来のプロンプト: ${input.substring(0, 20)}...)`,
            metadata: { 
                confidence: 0.9,
                vote: randomVote,
                needsClarification,
                clarificationQuestions
            }
        };
    }

    console.log(`[${this.name}] API Key present: ${!!process.env.GOOGLE_GENERATIVE_AI_API_KEY}`);

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await generateText({
          model: google(this.modelName),
          messages,
        });

        let content = result.text;
        let vote: "APPROVE" | "DENY" | "CONDITIONAL" | undefined;
        let needsClarification = false;
        const clarificationQuestions: string[] = [];

        // Parse CLARIFICATION: from response (probing algorithm)
        const clarificationMatches = content.matchAll(/CLARIFICATION:\s*(.+)/gi);
        for (const match of clarificationMatches) {
          clarificationQuestions.push(match[1].trim());
        }
        if (clarificationQuestions.length > 0) {
          needsClarification = true;
          content = content.replace(/CLARIFICATION:\s*.+\n?/gi, "").trim();
        }

        // Parse VOTE: from response
        const voteMatch = content.match(/VOTE:\s*(APPROVE|DENY|CONDITIONAL)/i);
        if (voteMatch) {
          vote = voteMatch[1].toUpperCase() as any;
          content = content.replace(/VOTE:\s*(APPROVE|DENY|CONDITIONAL)\n?/i, "").trim();
        }

        return {
          content,
          role: this.role,
          metadata: { 
            vote, 
            needsClarification, 
            clarificationQuestions: clarificationQuestions.length > 0 ? clarificationQuestions : undefined 
          }
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isRateLimit = lastError.message.includes("429") || lastError.message.includes("quota") || lastError.message.includes("RESOURCE_EXHAUSTED");
        
        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
          console.log(`[${this.name}] Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Final attempt or non-rate-limit error
        console.error(`Error in agent ${this.name}:`, lastError);
        const errorMessage = lastError.message;
        
        return {
          role: this.role,
          content: isRateLimit 
            ? `⚠️ [レート制限] ${this.name}: APIリクエスト制限に達しました。しばらくお待ちください。`
            : `[システムエラー] ${this.name}: 思考回路に接続できません。(Error: ${errorMessage})`,
          metadata: { error: String(lastError), vote: "CONDITIONAL" as const, isRateLimit }
        };
      }
    }

    // Should not reach here, but just in case
    return {
      role: this.role,
      content: `[システムエラー] ${this.name}: 予期せぬエラーが発生しました。`,
      metadata: { error: "Unexpected loop exit", vote: "CONDITIONAL" as const }
    };
  }
}
