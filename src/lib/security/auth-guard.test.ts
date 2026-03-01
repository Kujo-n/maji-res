import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Firebase Admin
vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
}));

// Mock admin-users API
vi.mock("@/lib/firebase/admin-users", () => ({
  getAdminUserData: vi.fn(),
}));

import { verifyAuth } from "./auth-guard";
import { adminAuth } from "@/lib/firebase/admin";
import { getAdminUserData, AdminUserData } from "@/lib/firebase/admin-users";

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

  it("returns 401 when token is valid but email is missing", async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: "user-123",
    } as any);

    const req = new NextRequest(new URL("http://localhost/api/test"), {
      method: "POST",
      headers: { Authorization: "Bearer valid-token-123" },
    });
    const result = await verifyAuth(req);
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) {
      expect(result.status).toBe(401);
      const body = await result.json();
      expect(body.error).toContain("Email missing from token");
    }
  });

  it("returns 403 when user is not found in Firestore", async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: "user-123",
      email: "test@example.com",
    } as any);
    vi.mocked(getAdminUserData).mockResolvedValue(null);

    const req = new NextRequest(new URL("http://localhost/api/test"), {
      method: "POST",
      headers: { Authorization: "Bearer valid-token-123" },
    });
    const result = await verifyAuth(req);
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) {
      expect(result.status).toBe(403);
      const body = await result.json();
      expect(body.error).toContain("Account is pending or inactive");
    }
  });

  it("returns 403 when user status is pending", async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: "user-123",
      email: "test@example.com",
    } as any);
    vi.mocked(getAdminUserData).mockResolvedValue({
      email: "test@example.com",
      status: "pending",
      role: "user",
      name: "Test User",
      createdAt: new Date(),
    });

    const req = new NextRequest(new URL("http://localhost/api/test"), {
      method: "POST",
      headers: { Authorization: "Bearer valid-token-123" },
    });
    const result = await verifyAuth(req);
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) {
      expect(result.status).toBe(403);
      const body = await result.json();
      expect(body.error).toContain("Account is pending or inactive");
    }
  });

  it("returns uid and user when token is valid and status is active", async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: "user-123",
      email: "test@example.com",
    } as any);
    
    const mockUser: AdminUserData = {
      email: "test@example.com",
      status: "active",
      role: "user",
      name: "Test User",
      createdAt: new Date(),
    };
    vi.mocked(getAdminUserData).mockResolvedValue(mockUser);

    const req = new NextRequest(new URL("http://localhost/api/test"), {
      method: "POST",
      headers: { Authorization: "Bearer valid-token-123" },
    });
    const result = await verifyAuth(req);
    expect(result).toEqual({ uid: "user-123", user: mockUser });
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
