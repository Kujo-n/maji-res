import { describe, it, expect } from "vitest";
import { AgentResponse } from "./types";

// We test the pure logic functions from orchestrator directly
// Import the class and test its methods
import { MagiOrchestrator } from "./orchestrator";

// Helper to create mock responses
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

describe("MagiOrchestrator", () => {
  describe("calculateSyncRate", () => {
    // Access private method via prototype for testing
    const orchestrator = new (class extends MagiOrchestrator {
      public testCalculateSyncRate(responses: AgentResponse[]) {
        return (this as any).calculateSyncRate(responses);
      }
      public testDetermineDecision(responses: AgentResponse[]) {
        return (this as any).determineDecision(responses);
      }
    })();

    it("returns high sync rate for similar length responses", () => {
      const responses = [
        createResponse("MELCHIOR", "This is a response of moderate length."),
        createResponse("BALTHASAR", "This is also a response of similar size."),
        createResponse("CASPER", "Another response with comparable length here."),
      ];
      const rate = orchestrator.testCalculateSyncRate(responses);
      expect(rate).toBeGreaterThan(70);
      expect(rate).toBeLessThanOrEqual(100);
    });

    it("returns lower sync rate for vastly different responses", () => {
      const responses = [
        createResponse("MELCHIOR", "Short."),
        createResponse("BALTHASAR", "A".repeat(500)),
        createResponse("CASPER", "Medium length response here."),
      ];
      const rate = orchestrator.testCalculateSyncRate(responses);
      expect(rate).toBeLessThan(70);
    });

    it("returns 100 for identical length responses", () => {
      const responses = [
        createResponse("MELCHIOR", "Same."),
        createResponse("BALTHASAR", "Same."),
        createResponse("CASPER", "Same."),
      ];
      const rate = orchestrator.testCalculateSyncRate(responses);
      expect(rate).toBe(100);
    });
  });

  describe("determineDecision", () => {
    const orchestrator = new (class extends MagiOrchestrator {
      public testDetermineDecision(responses: AgentResponse[]) {
        return (this as any).determineDecision(responses);
      }
    })();

    it("returns APPROVE when majority approves", () => {
      const responses = [
        createResponse("MELCHIOR", "ok", "APPROVE"),
        createResponse("BALTHASAR", "ok", "APPROVE"),
        createResponse("CASPER", "no", "DENY"),
      ];
      expect(orchestrator.testDetermineDecision(responses)).toBe("APPROVE");
    });

    it("returns DENY when majority denies", () => {
      const responses = [
        createResponse("MELCHIOR", "no", "DENY"),
        createResponse("BALTHASAR", "no", "DENY"),
        createResponse("CASPER", "ok", "APPROVE"),
      ];
      expect(orchestrator.testDetermineDecision(responses)).toBe("DENY");
    });

    it("returns CONDITIONAL on tie", () => {
      const responses = [
        createResponse("MELCHIOR", "ok", "APPROVE"),
        createResponse("BALTHASAR", "no", "DENY"),
        createResponse("CASPER", "maybe", "CONDITIONAL"),
      ];
      expect(orchestrator.testDetermineDecision(responses)).toBe("CONDITIONAL");
    });

    it("returns APPROVE when no votes", () => {
      const responses = [
        createResponse("MELCHIOR", "ok"),
        createResponse("BALTHASAR", "ok"),
        createResponse("CASPER", "ok"),
      ];
      expect(orchestrator.testDetermineDecision(responses)).toBe("APPROVE");
    });

    it("returns APPROVE for unanimous approval", () => {
      const responses = [
        createResponse("MELCHIOR", "ok", "APPROVE"),
        createResponse("BALTHASAR", "ok", "APPROVE"),
        createResponse("CASPER", "ok", "APPROVE"),
      ];
      expect(orchestrator.testDetermineDecision(responses)).toBe("APPROVE");
    });
  });
});
