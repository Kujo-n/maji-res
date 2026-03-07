import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentResponse } from "./types";

// Hoisted mock function for ConfigurableAgent.process
const mockAgentProcess = vi.fn();

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
vi.mock("./configurable-agent", () => ({
  ConfigurableAgent: vi.fn().mockImplementation(function (this: any, def: any) {
    this.name = def.name;
    this.role = def.name;
    this.process = (...args: any[]) => mockAgentProcess(...args);
  }),
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

  describe("parallelProcess mode", () => {
    beforeEach(() => {
      mockAgentProcess.mockReset();
      mockAgentProcess.mockImplementation(
        async (_input: string, _context: any, onChunk?: (chunk: string) => void) => {
          if (onChunk) onChunk("chunk");
          return {
            role: "AGENT",
            content: "Response from agent",
            metadata: { vote: "APPROVE" as const },
          };
        }
      );
    });

    it("defaults to serial mode", async () => {
      const integrator = new AgentIntegrator("MAGI");
      const responses = await integrator.process("test input");
      expect(responses).toHaveLength(3);
      responses.forEach(r => {
        expect(r.content).toBe("Response from agent");
      });
    });

    it("returns all responses in serial mode", async () => {
      const integrator = new AgentIntegrator("MAGI");
      const updateFn = vi.fn();
      const responses = await integrator.process("test input", undefined, updateFn, "serial");
      expect(responses).toHaveLength(3);
      expect(updateFn).toHaveBeenCalled();
    });

    it("returns all responses in parallel mode", async () => {
      const integrator = new AgentIntegrator("MAGI");
      const updateFn = vi.fn();
      const responses = await integrator.process("test input", undefined, updateFn, "parallel");
      expect(responses).toHaveLength(3);
      responses.forEach(r => {
        expect(r.content).toBe("Response from agent");
        expect(r.metadata?.vote).toBe("APPROVE");
      });
      expect(updateFn).toHaveBeenCalled();
    });

    it("handles errors gracefully in parallel mode", async () => {
      mockAgentProcess
        .mockRejectedValueOnce(new Error("API Error"))
        .mockResolvedValueOnce({
          role: "BALTHASAR",
          content: "Response from BALTHASAR",
          metadata: { vote: "APPROVE" },
        })
        .mockResolvedValueOnce({
          role: "CASPER",
          content: "Response from CASPER",
          metadata: { vote: "DENY" },
        });

      const integrator = new AgentIntegrator("MAGI");
      const responses = await integrator.process("test input", undefined, undefined, "parallel");
      expect(responses).toHaveLength(3);
      expect(responses[0].content).toContain("システムエラー");
      expect(responses[1].content).toBe("Response from BALTHASAR");
      expect(responses[2].content).toBe("Response from CASPER");
    });
  });
});
