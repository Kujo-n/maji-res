import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Create hoisted mock functions
const { mockParallelProcess, mockCalculateSyncRate, mockDetectContradictions, mockStreamSynthesize, mockDetermineDecision } = vi.hoisted(() => ({
  mockParallelProcess: vi.fn().mockResolvedValue([
    { role: "MELCHIOR", content: "Agent 1 response", metadata: { vote: "APPROVE" } },
    { role: "BALTHASAR", content: "Agent 2 response", metadata: { vote: "APPROVE" } },
    { role: "CASPER", content: "Agent 3 response", metadata: { vote: "DENY" } },
  ]),
  mockCalculateSyncRate: vi.fn().mockReturnValue(65),
  mockDetectContradictions: vi.fn().mockReturnValue({
    hasContradiction: true,
    conflictingAgents: { approve: ["MELCHIOR", "BALTHASAR"], deny: ["CASPER"] },
    severity: "mild",
  }),
  mockStreamSynthesize: vi.fn().mockReturnValue({
    toTextStreamResponse: vi.fn().mockReturnValue(
      new Response("Synthesized response", {
        headers: { "Content-Type": "text/plain" },
      })
    ),
  }),
  mockDetermineDecision: vi.fn().mockReturnValue("APPROVE"),
}));

// Mock dependencies
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/security/auth-guard", () => ({
  verifyAuth: vi.fn().mockResolvedValue({ uid: "test-user" }),
}));
vi.mock("@/lib/agents/integrator", () => ({
  createIntegrator: vi.fn().mockReturnValue({
    parallelProcess: mockParallelProcess,
    calculateSyncRate: mockCalculateSyncRate,
    detectContradictions: mockDetectContradictions,
    streamSynthesize: mockStreamSynthesize,
    determineDecision: mockDetermineDecision,
  }),
}));

import { POST } from "@/app/api/magi/stream/route";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { verifyAuth } from "@/lib/security/auth-guard";
import { createIntegrator } from "@/lib/agents/integrator";

function createRequest(body: object): NextRequest {
  return new NextRequest(new URL("http://localhost/api/magi/stream"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/magi/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(null);
    vi.mocked(verifyAuth).mockResolvedValue({ uid: "test-user" });
    
    // Reset mock to default behavior
    mockParallelProcess.mockResolvedValue([
      { role: "MELCHIOR", content: "Agent 1 response", metadata: { vote: "APPROVE" } },
      { role: "BALTHASAR", content: "Agent 2 response", metadata: { vote: "APPROVE" } },
      { role: "CASPER", content: "Agent 3 response", metadata: { vote: "DENY" } },
    ]);
    mockStreamSynthesize.mockReturnValue({
      toTextStreamResponse: vi.fn().mockReturnValue(
        new Response("Synthesized response", {
          headers: { "Content-Type": "text/plain" },
        })
      ),
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
    const response = await POST(createRequest({ message: 42 }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when message exceeds max length", async () => {
    const longMessage = "x".repeat(10_001);
    const response = await POST(createRequest({ message: longMessage }));
    expect(response.status).toBe(400);
  });

  it("returns a stream response for valid input", async () => {
    const response = await POST(createRequest({ message: "Hello" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
  });

  it("returns response for valid input with preset parameter", async () => {
    const response = await POST(createRequest({ message: "Hello", preset: "MAGI" }));
    expect(response.status).toBe(200);
  });
  it("skips streamSynthesize when verdict is CONDITIONAL", async () => {
    mockParallelProcess.mockResolvedValue([
      { role: "MELCHIOR", content: "ok", metadata: { vote: "APPROVE" } },
      { role: "BALTHASAR", content: "no", metadata: { vote: "DENY" } },
      { role: "CASPER", content: "maybe", metadata: { vote: "CONDITIONAL" } },
    ]);
    mockDetermineDecision.mockReturnValue("CONDITIONAL");

    const response = await POST(createRequest({ message: "Hello" }));
    expect(response.status).toBe(200);

    // Read the full stream to ensure it completes
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    // streamSynthesize should NOT be called
    expect(mockStreamSynthesize).not.toHaveBeenCalled();
    // VERDICT: CONDITIONAL should be in the stream
    expect(fullText).toContain("VERDICT: CONDITIONAL");
  });

  it("calls streamSynthesize when verdict is APPROVE (majority)", async () => {
    mockParallelProcess.mockResolvedValue([
      { role: "MELCHIOR", content: "ok", metadata: { vote: "APPROVE" } },
      { role: "BALTHASAR", content: "ok", metadata: { vote: "APPROVE" } },
      { role: "CASPER", content: "no", metadata: { vote: "DENY" } },
    ]);
    mockDetermineDecision.mockReturnValue("APPROVE");

    const response = await POST(createRequest({ message: "Hello" }));
    expect(response.status).toBe(200);

    // Read the full stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    // streamSynthesize SHOULD be called
    expect(mockStreamSynthesize).toHaveBeenCalled();
  });

  it("returns 500 on outer internal error", async () => {
    // req.json()が例外を投げた場合は外側のcatchに落ちて500を返す
    const req = createRequest({ message: "Hello" });
    req.json = vi.fn().mockRejectedValueOnce(new Error("Parse error"));
    const response = await POST(req);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to process request");
  });

  it("handles stream processing errors gracefully", async () => {
    // streamのstart関数内でエラーが起きた場合はcontroller.errorが呼ばれる
    mockParallelProcess.mockRejectedValueOnce(new Error("Stream processing failed"));
    const response = await POST(createRequest({ message: "Hello" }));
    expect(response.status).toBe(200); // Headers are already sent
    
    // Read the stream to trigger the error
    const reader = response.body!.getReader();
    await expect(reader.read()).rejects.toThrow();
  });
});
