import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Create hoisted mock functions
const { mockParallelProcess, mockCalculateSyncRate, mockDetectContradictions, mockStreamSynthesize } = vi.hoisted(() => ({
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

});
