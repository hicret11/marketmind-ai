import type { BenchmarkModelId, ModelRegistryEntry } from "@/types/evaluation";
import { AnthropicBenchmarkProvider } from "./anthropic";
import { GeminiBenchmarkProvider } from "./gemini";
import { GroqGptOssProvider, GroqQwenProvider } from "./groq";
import { OpenAiBenchmarkProvider } from "./openai";
import { OpenRouterNemotronProvider } from "./openrouter";
import type { BenchmarkModelProvider } from "./types";

/** The six visible model slots, in display order. Never hidden, even when unconfigured. */
const PROVIDERS: BenchmarkModelProvider[] = [
  new GeminiBenchmarkProvider(),
  new GroqGptOssProvider(),
  new GroqQwenProvider(),
  new OpenRouterNemotronProvider(),
  new OpenAiBenchmarkProvider(),
  new AnthropicBenchmarkProvider(),
];

export function getAllProviders(): BenchmarkModelProvider[] {
  return PROVIDERS;
}

export function getProvider(id: BenchmarkModelId): BenchmarkModelProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getConfiguredProviders(): BenchmarkModelProvider[] {
  return PROVIDERS.filter((p) => p.isConfigured());
}

export function getModelRegistry(): ModelRegistryEntry[] {
  return PROVIDERS.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    provider: p.providerName,
    requestedModelId: p.requestedModelId,
    status: p.status(),
    statusDetail: p.isConfigured() ? null : `${envHintFor(p.id)} is not set.`,
    freeTierNote: p.freeTierNote,
  }));
}

function envHintFor(id: BenchmarkModelId): string {
  switch (id) {
    case "gemini":
      return "GEMINI_API_KEY";
    case "gpt-oss":
    case "qwen":
      return "GROQ_API_KEY";
    case "nemotron":
      return "OPENROUTER_API_KEY";
    case "gpt":
      return "OPENAI_API_KEY";
    case "claude":
      return "ANTHROPIC_API_KEY";
  }
}
