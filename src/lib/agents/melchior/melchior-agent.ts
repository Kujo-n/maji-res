import { BaseAgent } from "../base/base-agent";
import { loadPrompt } from "../prompts/prompt-loader";

export class MelchiorAgent extends BaseAgent {
  constructor() {
    super("MELCHIOR", "MELCHIOR");
  }

  getSystemPrompt(): string {
    return loadPrompt("melchior.md");
  }
}
