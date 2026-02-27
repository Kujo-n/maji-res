import { describe, it, expect } from "vitest";
import { collectClarificationQuestions } from "@/components/magi/clarification-display";
import { AgentResponse } from "@/lib/agents/types";

// ---------------------------------------------------------------------------
// Helper: テスト用 AgentResponse を生成
// ---------------------------------------------------------------------------
function agentResponse(
  role: string,
  overrides?: Partial<AgentResponse["metadata"]>
): AgentResponse {
  return {
    content: "test response",
    role,
    metadata: {
      confidence: 0.8,
      ...overrides,
    },
  };
}

describe("collectClarificationQuestions", () => {
  it("空の配列の場合は空配列を返す", () => {
    expect(collectClarificationQuestions([])).toEqual([]);
  });

  it("clarificationQuestions がないレスポンスの場合は空配列を返す", () => {
    const responses = [
      agentResponse("MELCHIOR"),
      agentResponse("BALTHASAR"),
      agentResponse("CASPER"),
    ];
    expect(collectClarificationQuestions(responses)).toEqual([]);
  });

  it("metadata が undefined のレスポンスを安全にスキップする", () => {
    const responses: AgentResponse[] = [
      { content: "test", role: "MELCHIOR" },
    ];
    expect(collectClarificationQuestions(responses)).toEqual([]);
  });

  it("clarificationQuestions が空配列の場合は空配列を返す", () => {
    const responses = [
      agentResponse("MELCHIOR", { clarificationQuestions: [] }),
    ];
    expect(collectClarificationQuestions(responses)).toEqual([]);
  });

  it("1つのエージェントから1つの質問を収集する", () => {
    const responses = [
      agentResponse("MELCHIOR", {
        needsClarification: true,
        clarificationQuestions: ["予算はいくらですか？"],
      }),
    ];
    const result = collectClarificationQuestions(responses);
    expect(result).toEqual([
      { agent: "MELCHIOR", question: "予算はいくらですか？" },
    ]);
  });

  it("1つのエージェントから複数の質問を収集する", () => {
    const responses = [
      agentResponse("BALTHASAR", {
        needsClarification: true,
        clarificationQuestions: ["対象ユーザーは？", "期限はいつですか？"],
      }),
    ];
    const result = collectClarificationQuestions(responses);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ agent: "BALTHASAR", question: "対象ユーザーは？" });
    expect(result[1]).toEqual({ agent: "BALTHASAR", question: "期限はいつですか？" });
  });

  it("複数のエージェントから質問を収集する", () => {
    const responses = [
      agentResponse("MELCHIOR", {
        needsClarification: true,
        clarificationQuestions: ["技術スタックは？"],
      }),
      agentResponse("BALTHASAR"),  // 質問なし
      agentResponse("CASPER", {
        needsClarification: true,
        clarificationQuestions: ["セキュリティ要件は？", "パフォーマンス目標は？"],
      }),
    ];
    const result = collectClarificationQuestions(responses);
    expect(result).toHaveLength(3);
    expect(result[0].agent).toBe("MELCHIOR");
    expect(result[1].agent).toBe("CASPER");
    expect(result[2].agent).toBe("CASPER");
  });

  it("エージェント名と質問の対応が正しいことを確認する", () => {
    const responses = [
      agentResponse("MELCHIOR", {
        clarificationQuestions: ["Q1"],
      }),
      agentResponse("BALTHASAR", {
        clarificationQuestions: ["Q2"],
      }),
      agentResponse("CASPER", {
        clarificationQuestions: ["Q3"],
      }),
    ];
    const result = collectClarificationQuestions(responses);
    expect(result).toEqual([
      { agent: "MELCHIOR", question: "Q1" },
      { agent: "BALTHASAR", question: "Q2" },
      { agent: "CASPER", question: "Q3" },
    ]);
  });
});
