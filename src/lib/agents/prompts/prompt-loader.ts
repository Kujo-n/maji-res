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
  provider?: string;
  defaultModel?: string;
  agents: AgentDefinition[];
}

// --- Sanitization ---

/**
 * Sanitize a name to prevent path traversal attacks.
 * Only allows alphanumeric characters, hyphens, and underscores.
 */
function sanitizeName(name: string, label: string): string {
  if (!name || typeof name !== "string") {
    throw new Error(`不正な${label}: 空または無効な値です。`);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(`不正な${label}: "${name}" に使用できない文字が含まれています。`);
  }
  if (name.includes("..")) {
    throw new Error(`不正な${label}: パストラバーサルが検出されました。`);
  }
  return name;
}

/**
 * Sanitize a filename to prevent path traversal.
 * Allows alphanumeric, hyphens, underscores, and dots (for extensions).
 * Rejects paths containing directory separators or "..".
 */
function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") {
    throw new Error("不正なファイル名: 空または無効な値です。");
  }
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error(`不正なファイル名: "${filename}" にパストラバーサルが検出されました。`);
  }
  if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename)) {
    throw new Error(`不正なファイル名: "${filename}" の形式が無効です。`);
  }
  return filename;
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
    // Validate promptFile to prevent path traversal
    sanitizeFilename(agent.promptFile);
  }

  return config;
}

// --- Preset Functions ---

/**
 * Get the active preset name from environment variable.
 * Defaults to "default" if not set.
 */
function getActivePreset(): string {
  return process.env.AGENT_PRESET || "MAGI";
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
  const presetName = sanitizeName(preset || getActivePreset(), "プリセット名");

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
 * List all available presets by scanning the prompts directory.
 * Returns preset names and their config summaries.
 */
export function listPresets(): { name: string; config: PresetConfig }[] {
  const promptsDir = getPromptsDir();
  const entries = fs.readdirSync(promptsDir, { withFileTypes: true });
  const presets: { name: string; config: PresetConfig }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const configPath = path.join(promptsDir, entry.name, "config.json");
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = loadPresetConfig(entry.name);
      presets.push({ name: entry.name, config });
    } catch {
      console.warn(`[prompt-loader] Skipping invalid preset: ${entry.name}`);
    }
  }

  return presets;
}

/**
 * Load a prompt file from a preset folder.
 */
export function loadPresetPrompt(filename: string, preset?: string): string {
  const presetName = sanitizeName(preset || getActivePreset(), "プリセット名");
  sanitizeFilename(filename);
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

/**
 * Load a prompt template from a preset folder and replace placeholder variables.
 * Placeholders use the format: {{key}}
 */
export function loadPresetPromptTemplate(filename: string, variables: Record<string, string>, preset?: string): string {
  let content = loadPresetPrompt(filename, preset);
  for (const [key, value] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}
