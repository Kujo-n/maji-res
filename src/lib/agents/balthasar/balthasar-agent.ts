import { BaseAgent } from "../base/base-agent";
import { loadPrompt } from "../prompts/prompt-loader";

export class BalthasarAgent extends BaseAgent {
  constructor() {
    super("BALTHASAR", "BALTHASAR");
  }

  getSystemPrompt(): string {
    return loadPrompt("balthasar.md");
  }
}
