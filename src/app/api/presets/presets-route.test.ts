import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock all dependencies
vi.mock("@/lib/security/auth-guard", () => ({
  verifyAuth: vi.fn().mockResolvedValue({ uid: "test-user" }),
}));
vi.mock("@/lib/agents/prompts/prompt-loader", () => ({
  listPresets: vi.fn().mockReturnValue([
    { name: "MAGI", config: { agents: [{ id: "m" }, { id: "b" }, { id: "c" }] } },
    { name: "MAJI-RES", config: { agents: [{ id: "m" }, { id: "b" }, { id: "c" }] } },
  ]),
}));

import { GET } from "@/app/api/presets/route";
import { verifyAuth } from "@/lib/security/auth-guard";

function createRequest(): NextRequest {
  return new NextRequest(new URL("http://localhost/api/presets"), {
    method: "GET",
    headers: { Authorization: "Bearer valid-token" },
  });
}

describe("GET /api/presets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAuth).mockResolvedValue({ uid: "test-user" });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(verifyAuth).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const response = await GET(createRequest());
    expect(response.status).toBe(401);
  });

  it("returns list of presets when authenticated", async () => {
    const response = await GET(createRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.presets).toHaveLength(2);
    expect(body.presets[0].name).toBe("MAGI");
  });

  it("returns 500 on error", async () => {
    const { listPresets } = await import("@/lib/agents/prompts/prompt-loader");
    vi.mocked(listPresets).mockImplementation(() => {
      throw new Error("test error");
    });

    const response = await GET(createRequest());
    expect(response.status).toBe(500);
  });
});
