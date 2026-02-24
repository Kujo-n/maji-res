import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
}));
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

describe("GET /api/presets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list of presets", async () => {
    const response = await GET();
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

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
