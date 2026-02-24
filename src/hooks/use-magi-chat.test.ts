import { describe, it, expect, vi } from "vitest";

// Mock Firebase and context dependencies to prevent initialization errors
vi.mock("@/lib/firebase/client", () => ({ db: {} }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/components/chat/chat-context", () => ({
  useChatContext: () => ({ activeThreadId: null, setActiveThreadId: vi.fn(), refreshHistory: vi.fn() }),
}));
vi.mock("@/components/preset/preset-context", () => ({
  usePreset: () => ({ preset: "default" }),
}));
vi.mock("@/lib/services/chat-service", () => ({ ChatService: {} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { findLastAssistantMessage } from "@/hooks/use-magi-chat";
import { Message } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helper: テスト用メッセージを生成
// ---------------------------------------------------------------------------
function msg(
  overrides: Partial<Message> & { role: Message["role"] }
): Message {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 8)}`,
    content: "test",
    ...overrides,
  };
}

describe("findLastAssistantMessage", () => {
  it("空の配列の場合は null を返す", () => {
    expect(findLastAssistantMessage([])).toBeNull();
  });

  it("ユーザーメッセージのみの場合は null を返す", () => {
    const messages = [
      msg({ role: "user", content: "hello" }),
      msg({ role: "user", content: "world" }),
    ];
    expect(findLastAssistantMessage(messages)).toBeNull();
  });

  it("アシスタントメッセージが1つある場合にそれを返す", () => {
    const assistant = msg({
      role: "assistant",
      content: "response",
      agentResponses: [{ content: "test", role: "MELCHIOR" }],
      verdict: "APPROVE",
    });
    const messages = [msg({ role: "user" }), assistant];
    expect(findLastAssistantMessage(messages)).toBe(assistant);
  });

  it("複数のアシスタントメッセージがある場合に最後のものを返す", () => {
    const first = msg({
      role: "assistant",
      content: "first",
      verdict: "DENY",
    });
    const second = msg({
      role: "assistant",
      content: "second",
      verdict: "APPROVE",
      syncRate: 85,
    });
    const messages = [
      msg({ role: "user" }),
      first,
      msg({ role: "user" }),
      second,
    ];
    const result = findLastAssistantMessage(messages);
    expect(result).toBe(second);
    expect(result?.verdict).toBe("APPROVE");
    expect(result?.syncRate).toBe(85);
  });

  it("最後のメッセージがユーザーでも直前のアシスタントを返す", () => {
    const assistant = msg({
      role: "assistant",
      content: "answer",
      agentResponses: [
        { content: "analysis", role: "MELCHIOR" },
        { content: "review", role: "BALTHASAR" },
        { content: "opinion", role: "CASPER" },
      ],
      verdict: "CONDITIONAL",
      syncRate: 62.5,
      contradiction: {
        hasContradiction: true,
        conflictingAgents: { approve: ["MELCHIOR"], deny: ["CASPER"] },
        severity: "mild",
      },
    });
    const messages = [
      msg({ role: "user" }),
      assistant,
      msg({ role: "user", content: "follow-up" }),
    ];
    const result = findLastAssistantMessage(messages);
    expect(result).toBe(assistant);
    expect(result?.agentResponses).toHaveLength(3);
    expect(result?.contradiction?.hasContradiction).toBe(true);
  });
});
