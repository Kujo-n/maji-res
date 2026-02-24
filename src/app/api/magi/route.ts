import { NextRequest, NextResponse } from "next/server";
import { MagiOrchestrator } from "@/lib/agents/orchestrator";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { verifyAuth } from "@/lib/security/auth-guard";

export const maxDuration = 60; // Allow longer execution for multiple agents

const orchestrator = new MagiOrchestrator();

export async function POST(req: NextRequest) {
  // Rate limit check
  const rateLimitResponse = checkRateLimit(req, { maxRequests: 10, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  // Authentication check
  const authResult = await verifyAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    const { message, includeDetails } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    const MAX_MESSAGE_LENGTH = 10_000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Process through MAGI system
    const result = await orchestrator.process(message);

    // Build response
    interface MagiResponse {
      response: string;
      syncRate: number;
      decision: "APPROVE" | "DENY" | "CONDITIONAL";
      agents?: { role: string; content: string }[];
    }

    const response: MagiResponse = {
      response: result.finalResponse,
      syncRate: result.syncRate,
      decision: result.decision,
    };

    // Optionally include individual agent responses
    if (includeDetails && result.agentResponses) {
      response.agents = result.agentResponses.map((r) => ({
        role: r.role,
        content: r.content,
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("MAGI API Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
