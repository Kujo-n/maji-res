import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// All mock implementations must be self-contained within vi.mock factories
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/security/auth-guard", () => ({
  verifyAuth: vi.fn().mockResolvedValue({ uid: "test-user" }),
}));
vi.mock("@/lib/agents/orchestrator", async () => {
  const { vi: _vi } = await import("vitest");
  const processFn = _vi.fn().mockResolvedValue({
    finalResponse: "Test response",
    agentResponses: [],
    syncRate: 85,
    decision: "APPROVE",
  });

  class MockOrchestrator {
    process = processFn;
  }

  return {
    MagiOrchestrator: MockOrchestrator,
    __mockProcessFn: processFn,
  };
});

import { POST } from "@/app/api/magi/route";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { verifyAuth } from "@/lib/security/auth-guard";

function createRequest(body: object): NextRequest {
  return new NextRequest(new URL("http://localhost/api/magi"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getMockProcess() {
  const mod = await import("@/lib/agents/orchestrator") as any;
  return mod.__mockProcessFn;
}

describe("POST /api/magi", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(null);
    vi.mocked(verifyAuth).mockResolvedValue({ uid: "test-user" });
    const mockProcess = await getMockProcess();
    mockProcess.mockResolvedValue({
      finalResponse: "Test response",
      agentResponses: [],
      syncRate: 85,
      decision: "APPROVE",
    });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );
    const response = await POST(createRequest({ message: "test" }));
    expect(response.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(verifyAuth).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const response = await POST(createRequest({ message: "test" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 when message is missing", async () => {
    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 400 when message is not a string", async () => {
    const response = await POST(createRequest({ message: 123 }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when message exceeds max length", async () => {
    const longMessage = "a".repeat(10_001);
    const response = await POST(createRequest({ message: longMessage }));
    expect(response.status).toBe(400);
  });

  it("returns 200 with valid request", async () => {
    const response = await POST(createRequest({ message: "test message" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.response).toBe("Test response");
    expect(body.syncRate).toBe(85);
    expect(body.decision).toBe("APPROVE");
  });

  it("returns 500 on internal error", async () => {
    const mockProcess = await getMockProcess();
    mockProcess.mockRejectedValue(new Error("LLM error"));
    const response = await POST(createRequest({ message: "test" }));
    expect(response.status).toBe(500);
  });
});
