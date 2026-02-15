import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * Supported LLM provider names.
 * Each provider requires its own API key in environment variables:
 * - google:    GOOGLE_GENERATIVE_AI_API_KEY
 * - openai:    OPENAI_API_KEY
 * - anthropic: ANTHROPIC_API_KEY
 */
export type ProviderName = "google" | "openai" | "anthropic";

const providerFactories: Record<ProviderName, (model: string) => LanguageModel> = {
  google: (model) => google(model),
  openai: (model) => openai(model),
  anthropic: (model) => anthropic(model),
};

/**
 * Resolve a provider + model name into a Vercel AI SDK LanguageModel instance.
 *
 * @param providerName - The provider name (google, openai, anthropic)
 * @param modelName - The model identifier (e.g. "gemini-2.5-flash", "gpt-4o", "claude-sonnet-4-20250514")
 * @returns A LanguageModel instance ready for use with generateText/streamText
 * @throws Error if the provider is not supported
 */
export function resolveModel(providerName: string, modelName: string): LanguageModel {
  const factory = providerFactories[providerName as ProviderName];
  if (!factory) {
    const supported = Object.keys(providerFactories).join(", ");
    throw new Error(
      `プロバイダー "${providerName}" はサポートされていません。使用可能: ${supported}`
    );
  }
  return factory(modelName);
}
