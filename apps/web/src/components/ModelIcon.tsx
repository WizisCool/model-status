import type { ComponentType } from "react";
import ClaudeAvatar from "@lobehub/icons/es/Claude/components/Avatar";
import CodexAvatar from "@lobehub/icons/es/Codex/components/Avatar";
import DeepSeekAvatar from "@lobehub/icons/es/DeepSeek/components/Avatar";
import GeminiAvatar from "@lobehub/icons/es/Gemini/components/Avatar";
import GroqAvatar from "@lobehub/icons/es/Groq/components/Avatar";
import KimiAvatar from "@lobehub/icons/es/Kimi/components/Avatar";
import MetaAvatar from "@lobehub/icons/es/Meta/components/Avatar";
import MistralAvatar from "@lobehub/icons/es/Mistral/components/Avatar";
import MoonshotAvatar from "@lobehub/icons/es/Moonshot/components/Avatar";
import OpenAIAvatar from "@lobehub/icons/es/OpenAI/components/Avatar";
import OpenRouterAvatar from "@lobehub/icons/es/OpenRouter/components/Avatar";
import QwenAvatar from "@lobehub/icons/es/Qwen/components/Avatar";
import VertexAIAvatar from "@lobehub/icons/es/VertexAI/components/Avatar";
import XAIAvatar from "@lobehub/icons/es/XAI/components/Avatar";
import { Bot } from "lucide-react";

type IconComponent = ComponentType<{ size: number; className?: string }>;
type OpenAIAvatarType = "normal" | "gpt3" | "gpt4" | "gpt5" | "o1" | "o3" | "oss" | "platform";

export type ModelIconKey =
  | "auto"
  | "openai"
  | "codex"
  | "claude"
  | "gemini"
  | "vertexai"
  | "groq"
  | "xai"
  | "mistral"
  | "qwen"
  | "kimi"
  | "moonshot"
  | "deepseek"
  | "meta"
  | "openrouter";

export const MODEL_ICON_OPTIONS: Array<{ value: ModelIconKey; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "openai", label: "OpenAI" },
  { value: "codex", label: "Codex" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "vertexai", label: "Vertex AI" },
  { value: "groq", label: "Groq" },
  { value: "xai", label: "xAI" },
  { value: "mistral", label: "Mistral" },
  { value: "qwen", label: "Qwen" },
  { value: "kimi", label: "Kimi" },
  { value: "moonshot", label: "Moonshot" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "meta", label: "Meta" },
  { value: "openrouter", label: "OpenRouter" },
];

const MODEL_ICON_COMPONENTS: Record<Exclude<ModelIconKey, "auto" | "openai">, IconComponent> = {
  codex: CodexAvatar,
  claude: ClaudeAvatar,
  gemini: GeminiAvatar,
  vertexai: VertexAIAvatar,
  groq: GroqAvatar,
  xai: XAIAvatar,
  mistral: MistralAvatar,
  qwen: QwenAvatar,
  kimi: KimiAvatar,
  moonshot: MoonshotAvatar,
  deepseek: DeepSeekAvatar,
  meta: MetaAvatar,
  openrouter: OpenRouterAvatar,
};

function normalizeIconKey(value: string | null | undefined): ModelIconKey | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return MODEL_ICON_OPTIONS.find((option) => option.value === normalized)?.value ?? null;
}

function detectIconKey(modelId: string, ownedBy: string | null): Exclude<ModelIconKey, "auto"> | null {
  const haystack = `${modelId} ${ownedBy ?? ""}`.toLowerCase();

  if (haystack.includes("codex")) return "codex";
  if (haystack.includes("claude")) return "claude";
  if (haystack.includes("gemini")) return "gemini";
  if (haystack.includes("vertex")) return "vertexai";
  if (haystack.includes("grok")) return "xai";
  if (haystack.includes("groq")) return "groq";
  if (haystack.includes("mistral")) return "mistral";
  if (haystack.includes("qwen")) return "qwen";
  if (haystack.includes("kimi")) return "kimi";
  if (haystack.includes("moonshot")) return "moonshot";
  if (haystack.includes("deepseek")) return "deepseek";
  if (haystack.includes("llama") || haystack.includes("meta")) return "meta";
  if (haystack.includes("openrouter")) return "openrouter";
  if (haystack.includes("gpt") || haystack.includes("o1") || haystack.includes("o3") || haystack.includes("openai")) return "openai";

  return null;
}

function resolveOpenAIAvatarType(modelId: string): OpenAIAvatarType {
  const normalized = modelId.toLowerCase();
  if (normalized.includes("gpt-5")) return "platform";
  if (normalized.includes("gpt-4")) return "gpt4";
  if (normalized.includes("gpt-3")) return "gpt3";
  if (normalized.includes("o1")) return "o1";
  if (normalized.includes("o3")) return "o3";
  if (normalized.includes("oss")) return "oss";
  return "normal";
}

export function resolveModelIconKey(icon: string | null | undefined, modelId: string, ownedBy: string | null): Exclude<ModelIconKey, "auto"> | null {
  const normalized = normalizeIconKey(icon);
  if (normalized && normalized !== "auto") {
    return normalized;
  }

  return detectIconKey(modelId, ownedBy);
}

export function ModelIcon({
  icon,
  modelId,
  ownedBy,
  size = 18,
  className,
}: {
  icon: string | null | undefined;
  modelId: string;
  ownedBy: string | null;
  size?: number;
  className?: string;
}) {
  const resolvedKey = resolveModelIconKey(icon, modelId, ownedBy);
  if (!resolvedKey) {
    return <Bot size={size} className={className} />;
  }

  if (resolvedKey === "openai") {
    return <OpenAIAvatar size={size} className={className} type={resolveOpenAIAvatarType(modelId)} />;
  }

  const IconComponent = MODEL_ICON_COMPONENTS[resolvedKey];
  return <IconComponent size={size} className={className} />;
}
