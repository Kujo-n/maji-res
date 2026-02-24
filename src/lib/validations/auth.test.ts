import { describe, it, expect } from "vitest";
import { userAuthSchema } from "./auth";

describe("userAuthSchema", () => {
  it("validates a correct email and password", () => {
    const result = userAuthSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = userAuthSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = userAuthSchema.safeParse({
      email: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = userAuthSchema.safeParse({
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 8 character password", () => {
    const result = userAuthSchema.safeParse({
      email: "test@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    const result = userAuthSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
