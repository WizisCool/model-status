import type { ProbeRunResult } from "@model-status/shared";

import type { DbClient } from "../db";
import type { RuntimeSettings } from "./settings";

const PROBE_PROMPT = 'Respond with exactly: "ok"';

type ProbeAttemptResult = Omit<ProbeRunResult, "model" | "upstreamId" | "upstreamName">;

type ProbeTargetConfig = {
  apiBaseUrl: string;
  apiKey: string;
  probeTimeoutMs: number;
  probeMaxTokens: number;
  probeTemperature: number;
};

function parseSsePayloads(buffer: string): { payloads: string[]; remainder: string } {
  const events = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const remainder = events.pop() ?? "";
  const payloads = events.flatMap((event) =>
    event
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean),
  );

  return { payloads, remainder };
}

function extractContent(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const firstChoice = choices[0];

  if (firstChoice && typeof firstChoice === "object") {
    const choice = firstChoice as Record<string, unknown>;
    const delta = choice.delta;

    if (delta && typeof delta === "object") {
      const content = (delta as Record<string, unknown>).content;
      if (typeof content === "string" && content.length > 0) {
        return content;
      }
    }

    const text = choice.text;
    if (typeof text === "string" && text.length > 0) {
      return text;
    }
  }

  const content = record.content;
  return typeof content === "string" && content.length > 0 ? content : null;
}

function isParseableCompletionPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.choices)) {
    return true;
  }

  return typeof record.content === "string";
}

async function runSingleProbe(model: string, config: ProbeTargetConfig): Promise<ProbeAttemptResult> {
  const startedAtDate = new Date();
  const startedAtPerf = performance.now();
  let response: Response;

  try {
    response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: config.probeMaxTokens,
        temperature: config.probeTemperature,
        messages: [{ role: "user", content: PROBE_PROMPT }],
      }),
      signal: AbortSignal.timeout(config.probeTimeoutMs),
    });
  } catch (error) {
    const completedAt = new Date();
    return {
      startedAt: startedAtDate.toISOString(),
      completedAt: completedAt.toISOString(),
      success: false,
      error: error instanceof Error ? error.message : "Unknown fetch error",
      totalLatencyMs: Math.round(performance.now() - startedAtPerf),
    };
  }

  const connectivityLatencyMs = Math.round(performance.now() - startedAtPerf);

  if (!response.ok) {
    const rawResponseText = await response.text();
    const completedAt = new Date();
    return {
      startedAt: startedAtDate.toISOString(),
      completedAt: completedAt.toISOString(),
      success: false,
      statusCode: response.status,
      error: `Upstream returned status ${response.status}`,
      connectivityLatencyMs,
      totalLatencyMs: Math.round(performance.now() - startedAtPerf),
      rawResponseText,
    };
  }

  let firstTokenLatencyMs: number | undefined;
  let rawResponseText = "";
  let sseBuffer = "";
  let parsedPayloadSeen = false;
  let contentSeen = false;

  try {
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          rawResponseText += decoder.decode();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        rawResponseText += chunk;
        sseBuffer += chunk;

        const { payloads, remainder } = parseSsePayloads(sseBuffer);
        sseBuffer = remainder;

        for (const payload of payloads) {
          if (payload === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(payload) as unknown;
            parsedPayloadSeen = parsedPayloadSeen || isParseableCompletionPayload(parsed);
            const content = extractContent(parsed);
            if (content) {
              contentSeen = true;
            }
            if (firstTokenLatencyMs === undefined && content) {
              firstTokenLatencyMs = Math.round(performance.now() - startedAtPerf);
            }
          } catch {
            // Ignore fragmented or provider-specific payloads that are not valid JSON events.
          }
        }
      }
    }
  } catch (error) {
    const completedAt = new Date();
    return {
      startedAt: startedAtDate.toISOString(),
      completedAt: completedAt.toISOString(),
      success: false,
      statusCode: response.status,
      connectivityLatencyMs,
      totalLatencyMs: Math.round(performance.now() - startedAtPerf),
      error: error instanceof Error ? error.message : "Unknown stream read error",
      rawResponseText,
    };
  }

  const completedAt = new Date();

  if (!parsedPayloadSeen || !contentSeen) {
    return {
      startedAt: startedAtDate.toISOString(),
      completedAt: completedAt.toISOString(),
      success: false,
      statusCode: response.status,
      connectivityLatencyMs,
      totalLatencyMs: Math.round(performance.now() - startedAtPerf),
      error: !parsedPayloadSeen
        ? "Upstream stream did not contain a parseable completion payload"
        : "Upstream stream completed without content tokens",
      rawResponseText,
    };
  }

  const baseResult: ProbeAttemptResult = {
    startedAt: startedAtDate.toISOString(),
    completedAt: completedAt.toISOString(),
    success: true,
    statusCode: response.status,
    connectivityLatencyMs,
    totalLatencyMs: Math.round(performance.now() - startedAtPerf),
    rawResponseText,
  };

  return firstTokenLatencyMs === undefined
    ? baseResult
    : { ...baseResult, firstTokenLatencyMs };
}

function scoreResult(result: ProbeAttemptResult): number {
  if (!result.success) {
    return 0;
  }

  const connectivityPenalty = Math.min(result.connectivityLatencyMs ?? 1500, 1500) / 1500;
  const totalPenalty = Math.min(result.totalLatencyMs, 5000) / 5000;
  const blendedPenalty = connectivityPenalty * 0.55 + totalPenalty * 0.45;
  return Math.max(0, Math.round((1 - blendedPenalty) * 100));
}

async function runProbeWithRetries(
  model: string,
  config: ProbeTargetConfig,
  degradedRetryAttempts: number,
  failedRetryAttempts: number,
  upThreshold: number,
  degradedThreshold: number,
): Promise<ProbeAttemptResult> {
  let bestResult: ProbeAttemptResult | null = null;
  let bestScore = -1;
  let degradedRetriesLeft = Math.max(0, degradedRetryAttempts);
  let failedRetriesLeft = Math.max(0, failedRetryAttempts);

  while (true) {
    const result = await runSingleProbe(model, config);
    const currentScore = scoreResult(result);
    if (!bestResult || currentScore > bestScore) {
      bestResult = result;
      bestScore = currentScore;
    }

    const isHealthy = result.success && currentScore >= upThreshold;
    const isDegraded = result.success && currentScore >= degradedThreshold && currentScore < upThreshold;
    if (isHealthy) {
      break;
    }

    if (isDegraded && degradedRetriesLeft > 0) {
      degradedRetriesLeft -= 1;
      continue;
    }

    if (!result.success && failedRetriesLeft > 0) {
      failedRetriesLeft -= 1;
      continue;
    }

    break;
  }

  if (!bestResult) {
    throw new Error("Probe retry flow produced no result");
  }

  return bestResult;
}

async function runWithConcurrency<T>(
  items: string[],
  concurrency: number,
  worker: (item: string) => Promise<T>,
): Promise<T[]> {
  const pending = [...items];
  const output: T[] = [];

  async function runWorker(): Promise<void> {
    while (pending.length > 0) {
      const item = pending.shift();
      if (!item) {
        return;
      }
      const result = await worker(item);
      output.push(result);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );

  return output.sort((left, right) => {
    const leftModel = (left as ProbeRunResult).model;
    const rightModel = (right as ProbeRunResult).model;
    return leftModel.localeCompare(rightModel);
  });
}

export async function probeAllModels(config: RuntimeSettings, db: DbClient): Promise<ProbeRunResult[]> {
  const models = db.listModels().filter((row) => config.upstreams.some((upstream) => upstream.id === row.upstreamId));
  if (models.length === 0 || config.upstreams.length === 0) {
    return [];
  }

  const modelKeys = models.map((row) => `${row.upstreamId}::${row.id}`);
  const upstreamById = new Map(config.upstreams.map((upstream) => [upstream.id, upstream]));

  const results = await runWithConcurrency(modelKeys, config.probeConcurrency, async (modelKey) => {
    const separatorIndex = modelKey.indexOf("::");
    const upstreamId = modelKey.slice(0, separatorIndex);
    const model = modelKey.slice(separatorIndex + 2);
    const upstream = upstreamById.get(upstreamId);
    if (!upstream) {
      throw new Error(`Active upstream ${upstreamId} not found for model ${model}`);
    }

    const probe = await runProbeWithRetries(
      model,
      {
        apiBaseUrl: upstream.apiBaseUrl,
        apiKey: upstream.apiKey,
        probeTimeoutMs: config.probeTimeoutMs,
        probeMaxTokens: config.probeMaxTokens,
        probeTemperature: config.probeTemperature,
      },
      config.degradedRetryAttempts,
      config.failedRetryAttempts,
      config.modelStatusUpScoreThreshold,
      config.modelStatusDegradedScoreThreshold,
    );
    db.insertProbe({
      upstreamId,
      upstreamName: upstream.name,
      model,
      startedAt: probe.startedAt,
      completedAt: probe.completedAt,
      success: probe.success,
      statusCode: probe.statusCode ?? null,
      error: probe.error ?? null,
      connectivityLatencyMs: probe.connectivityLatencyMs ?? null,
      firstTokenLatencyMs: probe.firstTokenLatencyMs ?? null,
      totalLatencyMs: probe.totalLatencyMs,
      rawResponseText: probe.rawResponseText ?? null,
    });
    return { upstreamId, upstreamName: upstream.name, model, ...probe };
  });

  return results.sort((left, right) => {
    const leftKey = `${left.upstreamName}/${left.model}`;
    const rightKey = `${right.upstreamName}/${right.model}`;
    return leftKey.localeCompare(rightKey);
  });
}

export const __probeTestUtils = {
  extractContent,
  isParseableCompletionPayload,
  parseSsePayloads,
};
