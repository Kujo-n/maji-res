import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Firebase Admin
vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
}));

import { verifyAuth } from "./auth-guard";
import { adminAuth } from "@/lib/firebase/admin";

describe("verifyAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header", async () => {
    const req = new NextRequest(new URL("http://localhost/api/test"), {
      method: "POST",
    });
    const result = await verifyAuth(req);
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) {
      expect(result.status).toBe(401);
      const body = await result.json();
      expect(body.error).toContain("Authentication required");
    }
  });

  it("returns 401 when Authorization header has wrong format", async () => {
    const req = new NextRequest(new URL("http://localhost/api/test"), {
      method: "POST",
      headers: { Authorization: "Basic abc123" },
    });
    const result = await verifyAuth(req);
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) {
      expect(result.status).toBe(401);
    }
  });

  it("returns 401 when token is empty", async () => {
    const req = new NextRequest(new URL("http://localhost/api/test"), {
      method: "POST",
      headers: { Authorization: "Bearer " },
    });
    const result = await verifyAuth(req);
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) {
      expect(result.status).toBe(401);
    }
  });

  it("returns uid when token is valid", async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: "user-123",
    } as any);

    const req = new NextRequest(new URL("http://localhost/api/test"), {
      method: "POST",
      headers: { Authorization: "Bearer valid-token-123" },
    });
    const result = await verifyAuth(req);
    expect(result).toEqual({ uid: "user-123" });
  });

  it("returns 401 when token verification fails", async () => {
    vi.mocked(adminAuth.verifyIdToken).mockRejectedValue(
      new Error("Token expired")
    );

    const req = new NextRequest(new URL("http://localhost/api/test"), {
      method: "POST",
      headers: { Authorization: "Bearer expired-token" },
    });
    const result = await verifyAuth(req);
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) {
      expect(result.status).toBe(401);
      const body = await result.json();
      expect(body.error).toContain("Invalid or expired");
    }
  });
});
