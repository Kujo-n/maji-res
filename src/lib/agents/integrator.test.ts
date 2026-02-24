import { describe, it, expect, vi } from "vitest";
import { AgentResponse } from "./types";

// Mock dependencies to avoid actual file system and LLM calls
vi.mock("./prompts/prompt-loader", () => ({
  loadPresetConfig: vi.fn().mockReturnValue({
    provider: "google",
    defaultModel: "gemini-2.5-flash",
    agents: [
      { id: "melchior", name: "MELCHIOR", role: "科学者", promptFile: "melchior.md" },
      { id: "balthasar", name: "BALTHASAR", role: "母", promptFile: "balthasar.md" },
      { id: "casper", name: "CASPER", role: "女", promptFile: "casper.md" },
    ],
  }),
  loadPresetPrompt: vi.fn().mockReturnValue("mock prompt"),
  loadPresetPromptTemplate: vi.fn().mockReturnValue("mock template"),
}));
vi.mock("./provider-resolver", () => ({
  resolveModel: vi.fn().mockReturnValue({ provider: "mock", model: "mock" }),
}));

import { AgentIntegrator, createIntegrator } from "./integrator";

function createResponse(
  role: string,
  content: string,
  vote?: "APPROVE" | "DENY" | "CONDITIONAL"
): AgentResponse {
  return {
    role: role as any,
    content,
    metadata: vote ? { vote } : undefined,
  };
}

describe("AgentIntegrator", () => {
  describe("calculateSyncRate", () => {
    it("returns high rate for unanimous APPROVE", () => {
      const integrator = new AgentIntegrator("MAGI");
      const responses = [
        createResponse("MELCHIOR", "ok", "APPROVE"),
        createResponse("BALTHASAR", "ok", "APPROVE"),
        createResponse("CASPER", "ok", "APPROVE"),
      ];
      const rate = integrator.calculateSyncRate(responses);
      expect(rate).toBeGreaterThanOrEqual(91);
      expect(rate).toBeLessThanOrEqual(100);
    });

    it("returns high rate for unanimous DENY", () => {
      const integrator = new AgentIntegrator("MAGI");
      const responses = [
        createResponse("MELCHIOR", "no", "DENY"),
        createResponse("BALTHASAR", "no", "DENY"),
        createResponse("CASPER", "no", "DENY"),
      ];
      const rate = integrator.calculateSyncRate(responses);
      expect(rate).toBeGreaterThanOrEqual(91);
    });

    it("returns medium rate for majority", () => {
      const integrator = new AgentIntegrator("MAGI");
      const responses = [
        createResponse("MELCHIOR", "ok", "APPROVE"),
        createResponse("BALTHASAR", "ok", "APPROVE"),
        createResponse("CASPER", "no", "DENY"),
      ];
      const rate = integrator.calculateSyncRate(responses);
      expect(rate).toBeGreaterThanOrEqual(60);
      expect(rate).toBeLessThanOrEqual(70);
    });

    it("returns low rate for split votes", () => {
      const integrator = new AgentIntegrator("MAGI");
      const responses = [
        createResponse("MELCHIOR", "ok", "APPROVE"),
        createResponse("BALTHASAR", "no", "DENY"),
        createResponse("CASPER", "maybe", "CONDITIONAL"),
      ];
      const rate = integrator.calculateSyncRate(responses);
      expect(rate).toBeGreaterThanOrEqual(20);
      expect(rate).toBeLessThanOrEqual(30);
    });
  });

  describe("detectContradictions", () => {
    it("detects no contradiction when all approve", () => {
      const integrator = new AgentIntegrator("MAGI");
      const responses = [
        createResponse("MELCHIOR", "ok", "APPROVE"),
        createResponse("BALTHASAR", "ok", "APPROVE"),
        createResponse("CASPER", "ok", "APPROVE"),
      ];
      const result = integrator.detectContradictions(responses);
      expect(result.hasContradiction).toBe(false);
      expect(result.severity).toBe("none");
    });

    it("detects mild contradiction", () => {
      const integrator = new AgentIntegrator("MAGI");
      const responses = [
        createResponse("MELCHIOR", "ok", "APPROVE"),
        createResponse("BALTHASAR", "no", "DENY"),
        createResponse("CASPER", "maybe", "CONDITIONAL"),
      ];
      const result = integrator.detectContradictions(responses);
      expect(result.hasContradiction).toBe(true);
      expect(result.severity).toBe("mild");
      expect(result.message).toContain("MELCHIOR");
      expect(result.message).toContain("BALTHASAR");
    });

    it("detects severe contradiction", () => {
      const integrator = new AgentIntegrator("MAGI");
      const responses = [
        createResponse("MELCHIOR", "ok", "APPROVE"),
        createResponse("BALTHASAR", "no", "DENY"),
        createResponse("CASPER", "no", "DENY"),
      ];
      const result = integrator.detectContradictions(responses);
      expect(result.hasContradiction).toBe(true);
      expect(result.severity).toBe("severe");
    });

    it("returns correct conflicting agents", () => {
      const integrator = new AgentIntegrator("MAGI");
      const responses = [
        createResponse("MELCHIOR", "ok", "APPROVE"),
        createResponse("BALTHASAR", "no", "DENY"),
        createResponse("CASPER", "ok", "APPROVE"),
      ];
      const result = integrator.detectContradictions(responses);
      expect(result.conflictingAgents.approve).toEqual(["MELCHIOR", "CASPER"]);
      expect(result.conflictingAgents.deny).toEqual(["BALTHASAR"]);
    });

    it("no contradiction when no votes", () => {
      const integrator = new AgentIntegrator("MAGI");
      const responses = [
        createResponse("MELCHIOR", "ok"),
        createResponse("BALTHASAR", "ok"),
      ];
      const result = integrator.detectContradictions(responses);
      expect(result.hasContradiction).toBe(false);
    });
  });

  describe("createIntegrator", () => {
    it("creates an integrator with the given preset", () => {
      const integrator = createIntegrator("MAGI");
      expect(integrator).toBeInstanceOf(AgentIntegrator);
    });

    it("creates an integrator without preset", () => {
      const integrator = createIntegrator();
      expect(integrator).toBeInstanceOf(AgentIntegrator);
    });
  });
});
