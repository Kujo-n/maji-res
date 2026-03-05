import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
}));
vi.mock("@/lib/firebase/admin-users", () => ({
  getAdminUserData: vi.fn(),
  createPendingUserAdmin: vi.fn(),
}));
vi.mock("@/lib/email/nodemailer", () => ({
  sendActivationRequestEmail: vi.fn().mockResolvedValue({ success: true, message: "OK", dummy: true }),
}));

import { POST } from "@/app/api/auth/register-pending/route";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { adminAuth } from "@/lib/firebase/admin";
import { getAdminUserData, createPendingUserAdmin } from "@/lib/firebase/admin-users";
import { sendActivationRequestEmail } from "@/lib/email/nodemailer";

function createRequest(body?: object): NextRequest {
  return new NextRequest(new URL("http://localhost/api/auth/register-pending"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("POST /api/auth/register-pending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(null);
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: "new-user-uid",
      email: "newuser@example.com",
      name: "New User",
    } as any);
    vi.mocked(getAdminUserData).mockResolvedValue(null);
    vi.mocked(createPendingUserAdmin).mockResolvedValue(undefined);
    vi.mocked(sendActivationRequestEmail).mockResolvedValue({ success: true, message: "OK", dummy: true });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );
    const response = await POST(createRequest());
    expect(response.status).toBe(429);
  });

  it("returns 401 when no Authorization header", async () => {
    const req = new NextRequest(new URL("http://localhost/api/auth/register-pending"), {
      method: "POST",
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    vi.mocked(adminAuth.verifyIdToken).mockRejectedValue(new Error("Invalid"));
    const response = await POST(createRequest());
    expect(response.status).toBe(401);
  });

  it("returns 400 when email is missing from token", async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: "user-uid",
    } as any);
    const response = await POST(createRequest());
    expect(response.status).toBe(400);
  });

  it("returns success if user already registered", async () => {
    vi.mocked(getAdminUserData).mockResolvedValue({
      email: "existing@example.com",
      status: "active",
      role: "user",
      name: "Existing",
      createdAt: new Date(),
    });
    const response = await POST(createRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("User already registered");
  });

  it("creates pending user and sends email for new user", async () => {
    const response = await POST(createRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("Pending registration");
    expect(createPendingUserAdmin).toHaveBeenCalledWith("newuser@example.com", "New User");
    expect(sendActivationRequestEmail).toHaveBeenCalledWith("newuser@example.com", "New User");
  });

  it("still succeeds even if email notification fails", async () => {
    vi.mocked(sendActivationRequestEmail).mockResolvedValue({
      success: false,
      error: "SMTP Error",
    } as any);
    const response = await POST(createRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(getAdminUserData).mockRejectedValue(new Error("DB Error"));
    const response = await POST(createRequest());
    expect(response.status).toBe(500);
  });
});
