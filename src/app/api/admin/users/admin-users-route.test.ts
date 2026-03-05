import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
    getUserByEmail: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(),
    batch: vi.fn(),
  },
}));
vi.mock("@/lib/firebase/admin-users", () => ({
  getAdminUserData: vi.fn(),
  getAllUsersAdmin: vi.fn(),
  updateUserStatusAdmin: vi.fn(),
  updateUserRoleAdmin: vi.fn(),
}));
vi.mock("@/lib/constants/limits", () => ({
  THREAD_LIMITS: { admin: 50, user: 20 },
  MESSAGE_LIMITS: { admin: 200, user: 50 },
}));

import { GET, PATCH } from "@/app/api/admin/users/route";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getAdminUserData, getAllUsersAdmin, updateUserStatusAdmin, updateUserRoleAdmin } from "@/lib/firebase/admin-users";

function createRequest(method: string = "GET", body?: object): NextRequest {
  const init: any = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-admin-token",
    },
  };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL("http://localhost/api/admin/users"), init);
}

describe("Admin Users API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(null);
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: "admin-uid",
      email: "admin@example.com",
    } as any);
    vi.mocked(getAdminUserData).mockResolvedValue({
      email: "admin@example.com",
      role: "admin",
      status: "active",
      name: "Admin",
      createdAt: new Date(),
    });
  });

  describe("GET /api/admin/users", () => {
    it("returns 429 when rate limited", async () => {
      vi.mocked(checkRateLimit).mockReturnValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
      const response = await GET(createRequest());
      expect(response.status).toBe(429);
    });

    it("returns 403 when not admin", async () => {
      vi.mocked(adminAuth.verifyIdToken).mockRejectedValueOnce(new Error("Invalid"));
      const response = await GET(createRequest());
      expect(response.status).toBe(403);
    });

    it("returns 403 when user is not admin role", async () => {
      vi.mocked(getAdminUserData).mockResolvedValueOnce({
        email: "user@example.com",
        role: "user",
        status: "active",
        name: "User",
        createdAt: new Date(),
      });
      const response = await GET(createRequest());
      expect(response.status).toBe(403);
    });

    it("returns user list when authenticated as admin", async () => {
      vi.mocked(getAllUsersAdmin).mockResolvedValueOnce([
        {
          email: "user1@example.com",
          role: "user",
          status: "active",
          name: "User1",
          createdAt: { toDate: () => new Date("2026-01-01") } as any,
          activatedAt: { toDate: () => new Date("2026-01-02") } as any,
        },
      ]);
      const response = await GET(createRequest());
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.users).toHaveLength(1);
      expect(body.users[0].email).toBe("user1@example.com");
    });

    it("returns 500 on internal error", async () => {
      // 確実な認証通過のためにモックを明示
      vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
        uid: "admin-uid",
        email: "admin@example.com",
      } as any);
      vi.mocked(getAdminUserData).mockResolvedValue({
        email: "admin@example.com", role: "admin", status: "active", name: "Admin", createdAt: new Date(),
      });
      vi.mocked(getAllUsersAdmin).mockRejectedValueOnce(new Error("DB Error"));
      
      const response = await GET(createRequest());
      expect(response.status).toBe(500);
    });
  });

  describe("PATCH /api/admin/users", () => {
    it("returns 429 when rate limited", async () => {
      vi.mocked(checkRateLimit).mockReturnValue(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
      const response = await PATCH(createRequest("PATCH", { email: "test@example.com", status: "active" }));
      expect(response.status).toBe(429);
    });

    it("returns 403 when not admin", async () => {
      vi.mocked(adminAuth.verifyIdToken).mockRejectedValueOnce(new Error("Invalid"));
      const response = await PATCH(createRequest("PATCH", { email: "test@example.com", status: "active" }));
      expect(response.status).toBe(403);
    });

    it("returns 400 when email is missing", async () => {
      const response = await PATCH(createRequest("PATCH", { status: "active" }));
      expect(response.status).toBe(400);
    });

    it("returns 400 for invalid status", async () => {
      const response = await PATCH(createRequest("PATCH", { email: "test@example.com", status: "invalid" }));
      expect(response.status).toBe(400);
    });

    it("updates user status successfully", async () => {
      vi.mocked(updateUserStatusAdmin).mockResolvedValueOnce(undefined);
      const response = await PATCH(createRequest("PATCH", {
        email: "test@example.com",
        status: "active",
      }));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it("returns 400 when changing own role", async () => {
      const response = await PATCH(createRequest("PATCH", {
        action: "updateRole",
        email: "admin@example.com",
        role: "user",
      }));
      expect(response.status).toBe(400);
    });

    it("returns 400 for invalid role", async () => {
      const response = await PATCH(createRequest("PATCH", {
        action: "updateRole",
        email: "other@example.com",
        role: "superadmin",
      }));
      expect(response.status).toBe(400);
    });

    it("updates role successfully", async () => {
      vi.mocked(updateUserRoleAdmin).mockResolvedValueOnce(undefined);
      vi.mocked(getAdminUserData).mockResolvedValueOnce({
        email: "admin@example.com", role: "admin", status: "active", name: "Admin", createdAt: new Date(),
      });
      const response = await PATCH(createRequest("PATCH", {
        action: "updateRole",
        email: "other@example.com",
        role: "admin",
      }));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it("downgrades role and enforces limits", async () => {
      vi.mocked(updateUserRoleAdmin).mockResolvedValueOnce(undefined);
      // Admin user requesting downgrade for a target
      vi.mocked(getAdminUserData)
        .mockResolvedValueOnce({
          email: "admin@example.com", role: "admin", status: "active", name: "Admin", createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          email: "target@example.com", role: "admin", status: "active", name: "Target", createdAt: new Date(),
        });
      vi.mocked(adminAuth.getUserByEmail).mockResolvedValueOnce({ uid: "target-uid" } as any);

      const mockBatchDelete = vi.fn();
      const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
      vi.mocked(adminDb.batch).mockReturnValue({
        delete: mockBatchDelete,
        commit: mockBatchCommit,
      } as any);

      const createMockCollection = (docs: any[]) => ({
        get: vi.fn().mockResolvedValue({ size: docs.length, docs }),
        orderBy: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ size: docs.length, docs })
        })
      });

      // We mock 22 threads. Thread limit is 20. 2 will be deleted.
      // Index 2 is the 1st remaining thread. We give it 60 msgs (Limit is 50). 10 msgs deleted.
      const mockThreads = Array(22).fill(0).map((_, i) => ({
        ref: {
          collection: vi.fn().mockImplementation((path) => {
            if (path === "messages") {
              const msgsCount = i === 2 ? 60 : 10;
              return createMockCollection(Array(msgsCount).fill({ ref: { id: "msg-id" } }));
            }
          })
        }
      }));

      const mockCollection = vi.fn().mockImplementation((path) => {
        if (path === "users") {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue(createMockCollection(mockThreads))
            })
          };
        }
      });
      vi.mocked(adminDb.collection).mockImplementation(mockCollection as any);

      const response = await PATCH(createRequest("PATCH", {
        action: "updateRole",
        email: "target@example.com",
        role: "user",
      }));
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.success).toBe(true);
      expect(body.cleanup.deletedThreads).toBe(2);
      expect(body.cleanup.deletedMessages).toBe(10);
      // 2 threads * 11 refs per (1 root + 10 msgs) = 22 for thread drops
      // 10 msgs for remaining thread drops = 10
      // Batch commits should have happened
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("returns 500 on internal error", async () => {
      vi.mocked(updateUserStatusAdmin).mockRejectedValueOnce(new Error("DB Error"));
      
      const response = await PATCH(createRequest("PATCH", {
        email: "test@example.com",
        status: "active",
      }));
      expect(response.status).toBe(500);
    });
  });
});
