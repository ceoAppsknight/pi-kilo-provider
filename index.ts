import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const DEFAULT_BASE_URL = "https://api.kilo.ai/api/gateway";
const DEFAULT_CONTEXT_WINDOW = 128_000;
const DEFAULT_MAX_TOKENS = 4_096;

const KILO_COMPAT = {
  supportsStore: false,
  supportsDeveloperRole: false,
  supportsReasoningEffort: false,
  supportsUsageInStreaming: false,
  supportsStrictMode: false,
  thinkingFormat: "openrouter" as const,
  maxTokensField: "max_tokens" as const,
};

type KiloModel = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  architecture?: {
    input_modalities?: string[];
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    input_cache_read?: string;
    input_cache_write?: string;
  };
  supported_parameters?: string[];
};

type KiloModelsResponse = {
  data?: KiloModel[];
};

function dollarsPerMillionTokens(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed * 1_000_000 : 0;
}

function inputTypes(model: KiloModel): ("text" | "image")[] {
  const modalities = model.architecture?.input_modalities ?? ["text"];
  const input: ("text" | "image")[] = ["text"];

  if (modalities.includes("image")) {
    input.push("image");
  }

  return input;
}

function supportsReasoning(model: KiloModel): boolean {
  return model.supported_parameters?.some((parameter) => parameter === "reasoning" || parameter === "reasoning_effort") ?? false;
}

function toProviderModel(model: KiloModel) {
  const reasoning = supportsReasoning(model);

  return {
    id: model.id,
    name: model.name ?? model.id,
    reasoning,
    thinkingLevelMap: reasoning ? { off: "none" } : undefined,
    input: inputTypes(model),
    cost: {
      input: dollarsPerMillionTokens(model.pricing?.prompt),
      output: dollarsPerMillionTokens(model.pricing?.completion),
      cacheRead: dollarsPerMillionTokens(model.pricing?.input_cache_read),
      cacheWrite: dollarsPerMillionTokens(model.pricing?.input_cache_write),
    },
    contextWindow: model.context_length ?? model.top_provider?.context_length ?? DEFAULT_CONTEXT_WINDOW,
    maxTokens: model.top_provider?.max_completion_tokens ?? DEFAULT_MAX_TOKENS,
    compat: KILO_COMPAT,
  };
}

function fallbackModels() {
  return [
    {
      id: "kilo-auto/frontier",
      name: "Auto Frontier",
      reasoning: true,
      thinkingLevelMap: { off: "none" },
      input: ["text", "image"] as ("text" | "image")[],
      cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
      contextWindow: 1_000_000,
      maxTokens: 128_000,
      compat: KILO_COMPAT,
    },
    {
      id: "kilo-auto/balanced",
      name: "Auto Balanced",
      reasoning: true,
      thinkingLevelMap: { off: "none" },
      input: ["text", "image"] as ("text" | "image")[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: DEFAULT_CONTEXT_WINDOW,
      maxTokens: DEFAULT_MAX_TOKENS,
      compat: KILO_COMPAT,
    },
    {
      id: "kilo-auto/free",
      name: "Auto Free",
      reasoning: true,
      thinkingLevelMap: { off: "none" },
      input: ["text"] as ("text" | "image")[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: DEFAULT_CONTEXT_WINDOW,
      maxTokens: DEFAULT_MAX_TOKENS,
      compat: KILO_COMPAT,
    },
  ];
}

export default async function (pi: ExtensionAPI) {
  let models = fallbackModels();

  try {
    const response = await fetch(`${DEFAULT_BASE_URL}/models`);
    if (!response.ok) {
      throw new Error(`Kilo models request failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as KiloModelsResponse;
    if (Array.isArray(payload.data) && payload.data.length > 0) {
      models = payload.data.map(toProviderModel);
    }
  } catch (error) {
    console.warn(
      `Could not fetch Kilo models, using fallback models: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  pi.registerProvider("kilo", {
    name: "Kilo Gateway",
    baseUrl: DEFAULT_BASE_URL,
    apiKey: "KILO_API_KEY",
    api: "openai-completions",
    models,
  });
}
