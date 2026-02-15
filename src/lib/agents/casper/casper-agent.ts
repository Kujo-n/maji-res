import { BaseAgent } from "../base/base-agent";
import { loadPrompt } from "../prompts/prompt-loader";

export class CasperAgent extends BaseAgent {
  constructor() {
    super("CASPER", "CASPER");
  }

  getSystemPrompt(): string {
    return loadPrompt("casper.md");
  }
}
