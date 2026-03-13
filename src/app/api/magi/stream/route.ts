import { NextRequest } from "next/server";
import { createIntegrator } from "@/lib/agents/integrator";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { verifyAuth } from "@/lib/security/auth-guard";
import { ProcessingMode } from "@/lib/agents/types";
import { TokenUsageService } from "@/lib/services/token-usage-service";

export async function POST(req: NextRequest) {
  // Rate limit check
  const rateLimitResponse = checkRateLimit(req, { maxRequests: 10, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  // Authentication check
  const authResult = await verifyAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    // ユーザーロールに基づく処理モード判定（admin=並列, user=直列）
    const processingMode: ProcessingMode = authResult.user?.role === "admin" ? "parallel" : "serial";

    const { message, preset } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const MAX_MESSAGE_LENGTH = 10_000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Initialize integrator with requested preset
          const integrator = createIntegrator(preset);
          
          // Step 2: Run all three agents in parallel and stream partial results
          const agentResponses = await integrator.process(message, undefined, (partialResponses) => {
            // Send intermediate agent responses as data frame (Protocol: "2:[{...}]\n")
            const dataFrame = `2:${JSON.stringify([{ agentResponses: partialResponses }])}\n`;
            controller.enqueue(new TextEncoder().encode(dataFrame));
          }, processingMode);

          // Step 1.5: Calculate Sync Rate and detect contradictions
          const syncRate = integrator.calculateSyncRate(agentResponses);
          const contradiction = integrator.detectContradictions(agentResponses);

          // 集計: 3エージェントの処理で発生したトークン量
          let currentTotalTokens = 0;
          for (const res of agentResponses) {
              if (res.metadata?.tokenUsage?.totalTokens) {
                  currentTotalTokens += res.metadata.tokenUsage.totalTokens;
              }
          }

          // Final update with syncRate and contradiction
          const dataFrame = `2:${JSON.stringify([{ agentResponses, syncRate, contradiction }])}\n`;
          controller.enqueue(new TextEncoder().encode(dataFrame));

          // Step 2.5: Determine verdict from agent votes
          const verdict = integrator.determineDecision(agentResponses);
          const isConditional = verdict === "CONDITIONAL";

          if (isConditional) {
            // CONDITIONAL: 統合エージェントをスキップし、verdict のみ通知
            const verdictFrame = `0:${JSON.stringify("VERDICT: CONDITIONAL\n")}\n`;
            controller.enqueue(new TextEncoder().encode(verdictFrame));
            controller.close();
            
            // トークン保存（CONDITIONAL の場合はここまで）
            // authResult 経由の user 情報に含まれるプロパティの安全な取得 (メールアドレス等) を用いる方針。
            // auth-guard.ts の実装次第だが、一般的にFirebaseトークンには uid や email が含まれる。
            const userRef = authResult.user?.email || authResult.uid;
            if (userRef && currentTotalTokens > 0) {
              TokenUsageService.recordUsage(userRef, currentTotalTokens).catch((err: any) => 
                console.error("Failed to record token usage (Conditional):", err)
              );
            }
            return;
          }

          // Step 3: Stream the synthesis response
          const result = await integrator.streamSynthesize(
            message, 
            agentResponses, 
            "majority", 
            (usage) => {
              // 統合処理でのトークン量を加算して保存
              currentTotalTokens += usage.totalTokens;
              const userRef = authResult.user?.email || authResult.uid;
              if (userRef && currentTotalTokens > 0) {
                TokenUsageService.recordUsage(userRef, currentTotalTokens).catch((err: any) => 
                  console.error("Failed to record token usage (Synthesize):", err)
                );
              }
            }
          );
          
          // Get the underlying text stream from the result
          const textStreamResponse = result.toTextStreamResponse();
          if (!textStreamResponse.body) {
             controller.close();
             return;
          }

          const reader = textStreamResponse.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            if (chunk) {
                // Protocol: "0:" + JSON-encoded string + "\n"
                // The chunk from toTextStreamResponse is raw text.
                const textFrame = `0:${JSON.stringify(chunk)}\n`;
                controller.enqueue(new TextEncoder().encode(textFrame));
            }
          }
          
          controller.close();
        } catch (error) {
          console.error("Stream processing error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
        headers: { 
            "Content-Type": "text/plain; charset=utf-8",
            "X-Vercel-AI-Data-Stream": "v1"
        }
    });

  } catch (error: unknown) {
    console.error("MAGI Stream API Error:", error);
    const isDev = process.env.NODE_ENV === "development";
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(JSON.stringify({
      error: "Failed to process request",
      ...(isDev && { details: errorMessage, stack: errorStack }),
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
