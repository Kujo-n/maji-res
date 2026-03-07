import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TokenUsageService } from "./token-usage-service";
import * as firestoreModule from "firebase/firestore";

// mock firebase/firestore
vi.mock("firebase/firestore", () => {
  return {
    doc: vi.fn(),
    setDoc: vi.fn(),
    getDoc: vi.fn(),
    increment: vi.fn().mockReturnValue("mocked-increment"),
    serverTimestamp: vi.fn().mockReturnValue("mocked-timestamp"),
  };
});

// mock firebase/client
vi.mock("@/lib/firebase/client", () => {
  return {
    db: {},
  };
});

describe("TokenUsageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("getCurrentMonthKey should return correct format (YYYY-MM)", () => {
    // Set fixed date for test
    const date = new Date(2023, 4, 15); // Month is 0-indexed, so 4 is May
    vi.setSystemTime(date);
    
    expect(TokenUsageService.getCurrentMonthKey()).toBe("2023-05");
  });

  it("recordUsage should call setDoc with increment when valid data is provided", async () => {
    vi.setSystemTime(new Date(2023, 10, 1)); // Nov 2023 -> 2023-11
    const setDocSpy = vi.spyOn(firestoreModule, "setDoc").mockResolvedValue();
    const docSpy = vi.spyOn(firestoreModule, "doc").mockReturnValue({} as any);

    await TokenUsageService.recordUsage("test-user-123", 1500);

    expect(docSpy).toHaveBeenCalledWith(expect.anything(), "users", "test-user-123", "tokenUsage", "2023-11");
    expect(setDocSpy).toHaveBeenCalledWith(
      expect.anything(),
      {
        month: "2023-11",
        totalTokens: "mocked-increment",
        updatedAt: "mocked-timestamp",
      },
      { merge: true }
    );
    expect(firestoreModule.increment).toHaveBeenCalledWith(1500);
  });

  it("recordUsage should return early if userId is empty", async () => {
    const setDocSpy = vi.spyOn(firestoreModule, "setDoc");
    await TokenUsageService.recordUsage("", 1500);
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  it("recordUsage should return early if extraTokens is invalid (<=0 or NaN)", async () => {
    const setDocSpy = vi.spyOn(firestoreModule, "setDoc");
    await TokenUsageService.recordUsage("user1", 0);
    await TokenUsageService.recordUsage("user1", -50);
    await TokenUsageService.recordUsage("user1", NaN);
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  it("getUsage should return totalTokens if document exists", async () => {
    vi.spyOn(firestoreModule, "getDoc").mockResolvedValue({
      exists: () => true,
      data: () => ({ totalTokens: 4200 }),
    } as any);

    const usage = await TokenUsageService.getUsage("user1", "2023-11");
    expect(usage).toBe(4200);
  });

  it("getUsage should return 0 if document does not exist", async () => {
    vi.spyOn(firestoreModule, "getDoc").mockResolvedValue({
      exists: () => false,
    } as any);

    const usage = await TokenUsageService.getUsage("user1", "2023-11");
    expect(usage).toBe(0);
  });
});
