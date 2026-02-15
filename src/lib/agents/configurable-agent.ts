import { BaseAgent } from "./base/base-agent";
import { AgentDefinition, loadPresetPrompt } from "./prompts/prompt-loader";
import { AgentRole } from "./types";

/**
 * A generic agent that loads its prompt from a preset folder
 * based on the AgentDefinition provided at construction time.
 */
export class ConfigurableAgent extends BaseAgent {
  private promptFile: string;
  private preset?: string;

  constructor(definition: AgentDefinition, preset?: string, defaultModel?: string) {
    super(definition.name, definition.name as AgentRole, definition.model || defaultModel);
    this.promptFile = definition.promptFile;
    this.preset = preset;
  }

  getSystemPrompt(): string {
    return loadPresetPrompt(this.promptFile, this.preset);
  }
}
