import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveModel } from "./provider-resolver";

// Mock the AI SDK provider modules
vi.mock("@ai-sdk/google", () => ({
  google: vi.fn((model: string) => ({ provider: "google", model })),
}));
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn((model: string) => ({ provider: "openai", model })),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn((model: string) => ({ provider: "anthropic", model })),
}));

describe("resolveModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves google provider", () => {
    const model = resolveModel("google", "gemini-2.5-flash");
    expect(model).toEqual({ provider: "google", model: "gemini-2.5-flash" });
  });

  it("resolves openai provider", () => {
    const model = resolveModel("openai", "gpt-4o");
    expect(model).toEqual({ provider: "openai", model: "gpt-4o" });
  });

  it("resolves anthropic provider", () => {
    const model = resolveModel("anthropic", "claude-sonnet-4-20250514");
    expect(model).toEqual({ provider: "anthropic", model: "claude-sonnet-4-20250514" });
  });

  it("throws for unsupported provider", () => {
    expect(() => resolveModel("invalid", "model")).toThrow(
      /サポートされていません/
    );
  });

  it("includes available providers in error message", () => {
    expect(() => resolveModel("invalid", "model")).toThrow(
      /google, openai, anthropic/
    );
  });
});
