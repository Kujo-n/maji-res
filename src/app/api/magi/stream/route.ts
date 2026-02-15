import { NextRequest } from "next/server";
import { integrator } from "@/lib/agents/integrator";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Run all three agents in parallel
          const agentResponses = await integrator.parallelProcess(message);

          // Step 1.5: Calculate Sync Rate and detect contradictions
          const syncRate = integrator.calculateSyncRate(agentResponses);
          const contradiction = integrator.detectContradictions(agentResponses);

          // Step 2: Send agent responses as data frame (Protocol: "2:[{...}]\n")
          // Note: The protocol expects a JSON array of data objects.
          const dataFrame = `2:${JSON.stringify([{ agentResponses, syncRate, contradiction }])}\n`;
          controller.enqueue(new TextEncoder().encode(dataFrame));

          // Step 3: Stream the synthesis response
          const result = await integrator.streamSynthesize(message, agentResponses);
          
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(JSON.stringify({ error: "Failed to process request", details: errorMessage, stack: errorStack }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
