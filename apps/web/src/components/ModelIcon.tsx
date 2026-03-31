import { useId, type ComponentType, type CSSProperties } from "react";
import ClaudeAvatar from "@lobehub/icons/es/Claude/components/Avatar";
import DeepSeekAvatar from "@lobehub/icons/es/DeepSeek/components/Avatar";
import GeminiAvatar from "@lobehub/icons/es/Gemini/components/Avatar";
import GroqAvatar from "@lobehub/icons/es/Groq/components/Avatar";
import KimiAvatar from "@lobehub/icons/es/Kimi/components/Avatar";
import MetaAvatar from "@lobehub/icons/es/Meta/components/Avatar";
import MinimaxAvatar from "@lobehub/icons/es/Minimax/components/Avatar";
import MistralAvatar from "@lobehub/icons/es/Mistral/components/Avatar";
import MoonshotAvatar from "@lobehub/icons/es/Moonshot/components/Avatar";
import OpenAIAvatar from "@lobehub/icons/es/OpenAI/components/Avatar";
import OpenRouterAvatar from "@lobehub/icons/es/OpenRouter/components/Avatar";
import QwenAvatar from "@lobehub/icons/es/Qwen/components/Avatar";
import VertexAIAvatar from "@lobehub/icons/es/VertexAI/components/Avatar";
import XAIAvatar from "@lobehub/icons/es/XAI/components/Avatar";
import ZAIAvatar from "@lobehub/icons/es/ZAI/components/Avatar";
import ZhipuAvatar from "@lobehub/icons/es/Zhipu/components/Avatar";
import IconAvatar from "@lobehub/icons/es/features/IconAvatar";
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
  | "openrouter"
  | "minimax"
  | "zhipu"
  | "zai";

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
  { value: "minimax", label: "MiniMax" },
  { value: "zhipu", label: "Zhipu" },
  { value: "zai", label: "Z.ai" },
];

const MODEL_ICON_COMPONENTS: Record<Exclude<ModelIconKey, "auto" | "openai" | "codex">, IconComponent> = {
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
  minimax: MinimaxAvatar,
  zhipu: ZhipuAvatar,
  zai: ZAIAvatar,
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
  if (haystack.includes("minimax") || haystack.includes("abab")) return "minimax";
  if (haystack.includes("moonshot")) return "moonshot";
  if (haystack.includes("deepseek")) return "deepseek";
  if (haystack.includes("zhipu") || haystack.includes("chatglm") || haystack.includes("glm-") || haystack.includes("glm4") || haystack.includes("glm-4")) return "zhipu";
  if (haystack.includes("z.ai") || haystack.includes("z-ai") || haystack.includes("zai")) return "zai";
  if (haystack.includes("llama") || haystack.includes("meta")) return "meta";
  if (haystack.includes("openrouter")) return "openrouter";
  if (haystack.includes("gpt") || haystack.includes("o1") || haystack.includes("o3") || haystack.includes("openai")) return "openai";

  return null;
}

function resolveOpenAIAvatarType(modelId: string): OpenAIAvatarType {
  const normalized = modelId.toLowerCase();
  if (normalized.includes("gpt")) return "normal";
  if (normalized.includes("o1")) return "o1";
  if (normalized.includes("o3")) return "o3";
  if (normalized.includes("oss")) return "oss";
  return "normal";
}

function isDarkThemeActive(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  return document.documentElement.classList.contains("dark");
}

function UniqueCodexInner({
  size,
  className,
  style,
}: {
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  const codexFillId = `lobe-icons-codex-fill-${useId().replace(/:/gu, "")}`;
  return (
    <svg
      className={className}
      height={size}
      style={{
        flex: "none",
        lineHeight: 1,
        ...style,
      }}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Codex</title>
      <path
        clipRule="evenodd"
        d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z"
        fill={`url(#${codexFillId})`}
        fillRule="evenodd"
      />
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id={codexFillId} x1="12" x2="12" y1="0" y2="24">
          <stop stopColor="#B1A7FF" />
          <stop offset=".5" stopColor="#7A9DFF" />
          <stop offset="1" stopColor="#3941FF" />
        </linearGradient>
      </defs>
    </svg>
  );
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
    const darkTheme = isDarkThemeActive();
    return (
      <OpenAIAvatar
        size={size}
        className={className}
        type={resolveOpenAIAvatarType(modelId)}
        background={darkTheme ? "#ffffff" : "#000000"}
        color={darkTheme ? "#000000" : "#ffffff"}
      />
    );
  }

  if (resolvedKey === "codex") {
    const darkTheme = isDarkThemeActive();
    return (
      <IconAvatar
        Icon={UniqueCodexInner as never}
        size={size}
        className={className}
        background="#ffffff"
        color={darkTheme ? "#111827" : "#ffffff"}
        iconMultiple={0.88}
      />
    );
  }

  const IconComponent = MODEL_ICON_COMPONENTS[resolvedKey];
  return <IconComponent size={size} className={className} />;
}
