import fs from "fs";
import path from "path";

const promptCache = new Map<string, string>();

/**
 * Load a prompt markdown file from the prompts directory.
 * Results are cached in memory after the first read.
 */
export function loadPrompt(filename: string): string {
  if (promptCache.has(filename)) {
    return promptCache.get(filename)!;
  }

  const filePath = path.join(process.cwd(), "src", "lib", "agents", "prompts", filename);
  const content = fs.readFileSync(filePath, "utf-8").trim();
  promptCache.set(filename, content);
  return content;
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
