import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { checkRateLimit } from "./rate-limiter";

function createMockRequest(ip: string = "127.0.0.1", path: string = "/api/test"): NextRequest {
  const req = new NextRequest(new URL(`http://localhost${path}`), {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
  return req;
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Reset the rate limit store by waiting (or we test with unique IPs)
    vi.useFakeTimers();
  });

  it("allows requests within the limit", () => {
    const ip = `test-${Date.now()}-allow`;
    const req = createMockRequest(ip);
    const result = checkRateLimit(req, { maxRequests: 5, windowMs: 60_000 });
    expect(result).toBeNull();
  });

  it("blocks requests exceeding the limit", () => {
    const ip = `test-${Date.now()}-block`;
    const config = { maxRequests: 3, windowMs: 60_000 };

    for (let i = 0; i < 3; i++) {
      const req = createMockRequest(ip);
      checkRateLimit(req, config);
    }

    const req = createMockRequest(ip);
    const result = checkRateLimit(req, config);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
  });

  it("returns Retry-After header when rate limited", async () => {
    const ip = `test-${Date.now()}-retry`;
    const config = { maxRequests: 1, windowMs: 60_000 };

    checkRateLimit(createMockRequest(ip), config);
    const result = checkRateLimit(createMockRequest(ip), config);

    expect(result).not.toBeNull();
    const retryAfter = result?.headers.get("Retry-After");
    expect(retryAfter).toBeTruthy();
  });

  it("resets after window expires", () => {
    const ip = `test-${Date.now()}-reset`;
    const config = { maxRequests: 1, windowMs: 1_000 };

    checkRateLimit(createMockRequest(ip), config);

    // Advance time past the window
    vi.advanceTimersByTime(1_100);

    const result = checkRateLimit(createMockRequest(ip), config);
    expect(result).toBeNull();
  });

  it("tracks different IPs separately", () => {
    const config = { maxRequests: 1, windowMs: 60_000 };

    checkRateLimit(createMockRequest(`ip-a-${Date.now()}`), config);
    const result = checkRateLimit(createMockRequest(`ip-b-${Date.now()}`), config);
    expect(result).toBeNull();
  });

  it("uses x-real-ip as fallback", () => {
    const req = new NextRequest(new URL("http://localhost/api/test"), {
      method: "POST",
      headers: { "x-real-ip": "192.168.1.1" },
    });
    const result = checkRateLimit(req, { maxRequests: 10, windowMs: 60_000 });
    expect(result).toBeNull();
  });

  it("falls back to 'unknown' when no IP headers present", () => {
    const req = new NextRequest(new URL("http://localhost/api/test"), {
      method: "POST",
    });
    const result = checkRateLimit(req, { maxRequests: 10, windowMs: 60_000 });
    expect(result).toBeNull();
  });

  it("returns rate limit headers when blocked", async () => {
    const ip = `test-${Date.now()}-headers`;
    const config = { maxRequests: 1, windowMs: 60_000 };

    checkRateLimit(createMockRequest(ip), config);
    const result = checkRateLimit(createMockRequest(ip), config);

    expect(result).not.toBeNull();
    expect(result?.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(result?.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
