import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// mock server-only (no-op)
vi.mock("server-only", () => ({}));

// mock firebase-admin/firestore
const mockSet = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn();
const mockDoc = vi.fn().mockReturnValue({ set: mockSet, get: mockGet });
const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });

vi.mock("@/lib/firebase/admin", () => {
  return {
    adminDb: {
      collection: (...args: any[]) => {
        mockCollection(...args);
        return {
          doc: (...docArgs: any[]) => {
            mockDoc(...docArgs);
            return {
              collection: (...subColArgs: any[]) => {
                mockCollection(...subColArgs);
                return {
                  doc: (...subDocArgs: any[]) => {
                    mockDoc(...subDocArgs);
                    return { set: mockSet, get: mockGet };
                  }
                };
              },
              set: mockSet,
              get: mockGet,
            };
          }
        };
      }
    },
  };
});

vi.mock("firebase-admin/firestore", () => {
  return {
    FieldValue: {
      increment: vi.fn((val: number) => `increment(${val})`),
      serverTimestamp: vi.fn(() => "mocked-server-timestamp"),
    },
  };
});

import { TokenUsageService } from "./token-usage-service";
import { FieldValue } from "firebase-admin/firestore";

describe("TokenUsageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("getCurrentMonthKey should return correct format (YYYY-MM)", () => {
    const date = new Date(2023, 4, 15); // Month is 0-indexed, so 4 is May
    vi.setSystemTime(date);
    
    expect(TokenUsageService.getCurrentMonthKey()).toBe("2023-05");
  });

  it("recordUsage should call set with FieldValue.increment when valid data is provided", async () => {
    vi.setSystemTime(new Date(2023, 10, 1)); // Nov 2023 -> 2023-11

    await TokenUsageService.recordUsage("test-user-123", 1500);

    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDoc).toHaveBeenCalledWith("test-user-123");
    expect(mockCollection).toHaveBeenCalledWith("tokenUsage");
    expect(mockDoc).toHaveBeenCalledWith("2023-11");
    expect(mockSet).toHaveBeenCalledWith(
      {
        month: "2023-11",
        totalTokens: `increment(1500)`,
        updatedAt: "mocked-server-timestamp",
      },
      { merge: true }
    );
  });

  it("recordUsage should return early if userId is empty", async () => {
    await TokenUsageService.recordUsage("", 1500);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("recordUsage should return early if extraTokens is invalid (<=0 or NaN)", async () => {
    await TokenUsageService.recordUsage("user1", 0);
    await TokenUsageService.recordUsage("user1", -50);
    await TokenUsageService.recordUsage("user1", NaN);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("getUsage should return totalTokens if document exists", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ totalTokens: 4200 }),
    });

    const usage = await TokenUsageService.getUsage("user1", "2023-11");
    expect(usage).toBe(4200);
  });

  it("getUsage should return 0 if document does not exist", async () => {
    mockGet.mockResolvedValue({
      exists: false,
    });

    const usage = await TokenUsageService.getUsage("user1", "2023-11");
    expect(usage).toBe(0);
  });
});
