import fs from "fs";
import path from "path";

const promptCache = new Map<string, string>();
const configCache = new Map<string, PresetConfig>();

// --- Agent Definition Types ---

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  promptFile: string;
  model?: string;
}

export interface PresetConfig {
  agents: AgentDefinition[];
}

// --- Validation ---

function validateConfig(raw: unknown): PresetConfig {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as any).agents)) {
    throw new Error("プリセット設定が不正です: 'agents' 配列が必要です。");
  }

  const config = raw as PresetConfig;

  for (const agent of config.agents) {
    if (!agent.id || !agent.name || !agent.promptFile) {
      throw new Error(
        `プリセット設定が不正です: エージェント定義に必須フィールド (id, name, promptFile) が不足しています。`
      );
    }
  }

  return config;
}

// --- Preset Functions ---

/**
 * Get the active preset name from environment variable.
 * Defaults to "default" if not set.
 */
function getActivePreset(): string {
  return process.env.AGENT_PRESET || "default";
}

/**
 * Resolve the directory path for the prompts folder.
 */
function getPromptsDir(): string {
  return path.join(process.cwd(), "src", "lib", "agents", "prompts");
}

/**
 * Load the config.json for a given preset.
 * Parsed result is cached to avoid repeated JSON.parse calls.
 */
export function loadPresetConfig(preset?: string): PresetConfig {
  const presetName = preset || getActivePreset();

  if (configCache.has(presetName)) {
    return configCache.get(presetName)!;
  }

  const filePath = path.join(getPromptsDir(), presetName, "config.json");

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = validateConfig(JSON.parse(content));
    configCache.set(presetName, parsed);
    return parsed;
  } catch (error) {
    console.error(`[prompt-loader] Failed to load preset config: ${filePath}`, error);
    throw new Error(`プリセット "${presetName}" の設定ファイルを読み込めませんでした。`);
  }
}

/**
 * Load a prompt file from a preset folder.
 */
export function loadPresetPrompt(filename: string, preset?: string): string {
  const presetName = preset || getActivePreset();
  const cacheKey = `${presetName}/${filename}`;

  if (promptCache.has(cacheKey)) {
    return promptCache.get(cacheKey)!;
  }

  const filePath = path.join(getPromptsDir(), presetName, filename);

  try {
    const content = fs.readFileSync(filePath, "utf-8").trim();
    promptCache.set(cacheKey, content);
    return content;
  } catch (error) {
    console.error(`[prompt-loader] Failed to load preset prompt: ${filePath}`, error);
    throw new Error(`プリセット "${presetName}" のプロンプトファイル "${filename}" を読み込めませんでした。`);
  }
}

// --- Shared Prompt Functions (preset-independent) ---

/**
 * Load a shared prompt markdown file from the prompts directory.
 * Results are cached in memory after the first read.
 */
export function loadPrompt(filename: string): string {
  if (promptCache.has(filename)) {
    return promptCache.get(filename)!;
  }

  const filePath = path.join(getPromptsDir(), filename);

  try {
    const content = fs.readFileSync(filePath, "utf-8").trim();
    promptCache.set(filename, content);
    return content;
  } catch (error) {
    console.error(`[prompt-loader] Failed to load prompt: ${filePath}`, error);
    throw new Error(`プロンプトファイル "${filename}" を読み込めませんでした。`);
  }
}

/**
 * Load a prompt template and replace placeholder variables.
 * Placeholders use the format: {{key}}
 */
export function loadPromptTemplate(filename: string, variables: Record<string, string>): string {
  let content = loadPrompt(filename);
  for (const [key, value] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}
