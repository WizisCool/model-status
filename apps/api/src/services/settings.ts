import type { AdminSettings, AdminSettingsResponse, UpdateAdminSettingsRequest } from "@model-status/shared";

import type { AppConfig } from "../config";
import type { DbClient } from "../db";

const SETTING_KEYS = {
  bootstrapInitialized: "BOOTSTRAP_INITIALIZED",
  siteTitle: "SITE_TITLE",
  siteSubtitle: "SITE_SUBTITLE",
  showSummaryCards: "SHOW_SUMMARY_CARDS",
  probeIntervalMs: "PROBE_INTERVAL_MS",
  catalogSyncIntervalMs: "CATALOG_SYNC_INTERVAL_MS",
  probeTimeoutMs: "PROBE_TIMEOUT_MS",
  probeConcurrency: "PROBE_CONCURRENCY",
  probeMaxTokens: "PROBE_MAX_TOKENS",
  probeTemperature: "PROBE_TEMPERATURE",
  degradedRetryAttempts: "DEGRADED_RETRY_ATTEMPTS",
  failedRetryAttempts: "FAILED_RETRY_ATTEMPTS",
  modelStatusUpScoreThreshold: "MODEL_STATUS_UP_SCORE_THRESHOLD",
  modelStatusDegradedScoreThreshold: "MODEL_STATUS_DEGRADED_SCORE_THRESHOLD",
} as const;

type UpstreamRuntime = {
  id: string;
  name: string;
  group: string;
  apiBaseUrl: string;
  modelsUrl: string;
  apiKey: string;
  isActive: boolean;
};

export type RuntimeSettings = AdminSettings & {
  upstreams: UpstreamRuntime[];
};

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/u, "");
}

function sanitizeUpstreamId(name: string, fallbackIndex: number): string {
  const id = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return id || `upstream-${fallbackIndex}`;
}

function maskApiKey(apiKey: string): string | null {
  if (!apiKey) {
    return null;
  }

  return `••••••••${apiKey.slice(-4)}`;
}

function defaultAdminSettings(): AdminSettings {
  return {
    siteTitle: "Model Status",
    siteSubtitle: "Model API Monitoring Panel",
    showSummaryCards: true,
    probeIntervalMs: 5 * 60 * 1000,
    catalogSyncIntervalMs: 15 * 60 * 1000,
    probeTimeoutMs: 20_000,
    probeConcurrency: 4,
    probeMaxTokens: 4,
    probeTemperature: 0,
    degradedRetryAttempts: 2,
    failedRetryAttempts: 0,
    modelStatusUpScoreThreshold: 60,
    modelStatusDegradedScoreThreshold: 30,
  };
}

function readAdminSettings(db: DbClient): AdminSettings {
  const settings = db.listSettings();
  const defaults = defaultAdminSettings();

  return {
    siteTitle: settings[SETTING_KEYS.siteTitle] ?? defaults.siteTitle,
    siteSubtitle: settings[SETTING_KEYS.siteSubtitle] ?? defaults.siteSubtitle,
    showSummaryCards: settings[SETTING_KEYS.showSummaryCards] !== "0",
    probeIntervalMs: clampNumber(Number(settings[SETTING_KEYS.probeIntervalMs] ?? defaults.probeIntervalMs), 30_000, 86_400_000),
    catalogSyncIntervalMs: clampNumber(Number(settings[SETTING_KEYS.catalogSyncIntervalMs] ?? defaults.catalogSyncIntervalMs), 60_000, 86_400_000),
    probeTimeoutMs: clampNumber(Number(settings[SETTING_KEYS.probeTimeoutMs] ?? defaults.probeTimeoutMs), 2_000, 120_000),
    probeConcurrency: clampNumber(Number(settings[SETTING_KEYS.probeConcurrency] ?? defaults.probeConcurrency), 1, 32),
    probeMaxTokens: clampNumber(Number(settings[SETTING_KEYS.probeMaxTokens] ?? defaults.probeMaxTokens), 1, 64),
    probeTemperature: clampNumber(Number(settings[SETTING_KEYS.probeTemperature] ?? defaults.probeTemperature), 0, 2),
    degradedRetryAttempts: clampNumber(Number(settings[SETTING_KEYS.degradedRetryAttempts] ?? defaults.degradedRetryAttempts), 0, 3),
    failedRetryAttempts: clampNumber(Number(settings[SETTING_KEYS.failedRetryAttempts] ?? defaults.failedRetryAttempts), 0, 3),
    modelStatusUpScoreThreshold: clampNumber(Number(settings[SETTING_KEYS.modelStatusUpScoreThreshold] ?? defaults.modelStatusUpScoreThreshold), 0, 100),
    modelStatusDegradedScoreThreshold: clampNumber(Number(settings[SETTING_KEYS.modelStatusDegradedScoreThreshold] ?? defaults.modelStatusDegradedScoreThreshold), 0, 100),
  };
}

export function ensureRuntimeSettings(db: DbClient, _config: AppConfig): void {
  const nowIso = new Date().toISOString();
  const defaults = defaultAdminSettings();
  const bootstrapInitialized = db.getSetting(SETTING_KEYS.bootstrapInitialized) === "1";

  for (const [key, value] of Object.entries({
    [SETTING_KEYS.siteTitle]: defaults.siteTitle,
    [SETTING_KEYS.siteSubtitle]: defaults.siteSubtitle,
    [SETTING_KEYS.showSummaryCards]: defaults.showSummaryCards ? "1" : "0",
    [SETTING_KEYS.probeIntervalMs]: String(defaults.probeIntervalMs),
    [SETTING_KEYS.catalogSyncIntervalMs]: String(defaults.catalogSyncIntervalMs),
    [SETTING_KEYS.probeTimeoutMs]: String(defaults.probeTimeoutMs),
    [SETTING_KEYS.probeConcurrency]: String(defaults.probeConcurrency),
    [SETTING_KEYS.probeMaxTokens]: String(defaults.probeMaxTokens),
    [SETTING_KEYS.probeTemperature]: String(defaults.probeTemperature),
    [SETTING_KEYS.degradedRetryAttempts]: String(defaults.degradedRetryAttempts),
    [SETTING_KEYS.failedRetryAttempts]: String(defaults.failedRetryAttempts),
    [SETTING_KEYS.modelStatusUpScoreThreshold]: String(defaults.modelStatusUpScoreThreshold),
    [SETTING_KEYS.modelStatusDegradedScoreThreshold]: String(defaults.modelStatusDegradedScoreThreshold),
  })) {
    if (db.getSetting(key) === null) {
      db.setSetting(key, value, nowIso);
    }
  }

  const upstreams = db.listUpstreams(false);
  if (!bootstrapInitialized && upstreams.length === 0) {
    db.upsertUpstream({
      id: "default",
      name: "Default Upstream",
      group: "default",
      apiBaseUrl: "https://ai.dooo.ng/v1",
      modelsUrl: "https://ai.dooo.ng/v1/models",
      apiKey: "",
      isActive: true,
      updatedAt: nowIso,
    });
  }

  if (!bootstrapInitialized) {
    db.setSetting(SETTING_KEYS.bootstrapInitialized, "1", nowIso);
  }
}

export function getRuntimeSettings(db: DbClient, _config: AppConfig): RuntimeSettings {
  const adminSettings = readAdminSettings(db);
  const upstreams = db
    .listUpstreams(true)
    .filter((upstream) => upstream.apiKey.trim().length > 0)
    .map((upstream) => ({
      id: upstream.id,
      name: upstream.name,
      group: upstream.group,
      apiBaseUrl: normalizeUrl(upstream.apiBaseUrl),
      modelsUrl: upstream.modelsUrl,
      apiKey: upstream.apiKey,
      isActive: upstream.isActive,
    }));

  return {
    ...adminSettings,
    upstreams,
  };
}

export function getAdminSettingsResponse(db: DbClient, config: AppConfig): AdminSettingsResponse {
  const runtime = getRuntimeSettings(db, config);
  const activeUpstreams = db.listUpstreams(true);

  return {
    settings: {
      siteTitle: runtime.siteTitle,
      siteSubtitle: runtime.siteSubtitle,
      showSummaryCards: runtime.showSummaryCards,
      probeIntervalMs: runtime.probeIntervalMs,
      catalogSyncIntervalMs: runtime.catalogSyncIntervalMs,
      probeTimeoutMs: runtime.probeTimeoutMs,
      probeConcurrency: runtime.probeConcurrency,
      probeMaxTokens: runtime.probeMaxTokens,
      probeTemperature: runtime.probeTemperature,
      degradedRetryAttempts: runtime.degradedRetryAttempts,
      failedRetryAttempts: runtime.failedRetryAttempts,
      modelStatusUpScoreThreshold: runtime.modelStatusUpScoreThreshold,
      modelStatusDegradedScoreThreshold: runtime.modelStatusDegradedScoreThreshold,
    },
    apiKeyConfigured: runtime.upstreams.some((upstream) => upstream.apiKey.trim().length > 0),
    apiKeyMasked: maskApiKey(runtime.upstreams[0]?.apiKey ?? ""),
    upstreams: activeUpstreams.map((upstream) => ({
      id: upstream.id,
      name: upstream.name,
      group: upstream.group,
      apiBaseUrl: normalizeUrl(upstream.apiBaseUrl),
      modelsUrl: upstream.modelsUrl,
      isActive: upstream.isActive,
      apiKeyConfigured: upstream.apiKey.length > 0,
      apiKeyMasked: maskApiKey(upstream.apiKey),
    })),
  };
}

export function updateAdminSettings(db: DbClient, config: AppConfig, updates: UpdateAdminSettingsRequest): AdminSettingsResponse {
  const current = readAdminSettings(db);
  const next = {
    ...current,
    ...updates,
    siteTitle: typeof updates.siteTitle === "string" ? updates.siteTitle.trim() || current.siteTitle : current.siteTitle,
    siteSubtitle: typeof updates.siteSubtitle === "string" ? updates.siteSubtitle.trim() : current.siteSubtitle,
    showSummaryCards: typeof updates.showSummaryCards === "boolean" ? updates.showSummaryCards : current.showSummaryCards,
  };
  const nowIso = new Date().toISOString();

  db.setSetting(SETTING_KEYS.siteTitle, next.siteTitle, nowIso);
  db.setSetting(SETTING_KEYS.siteSubtitle, next.siteSubtitle, nowIso);
  db.setSetting(SETTING_KEYS.showSummaryCards, next.showSummaryCards ? "1" : "0", nowIso);
  db.setSetting(SETTING_KEYS.probeIntervalMs, String(clampNumber(next.probeIntervalMs, 30_000, 86_400_000)), nowIso);
  db.setSetting(SETTING_KEYS.catalogSyncIntervalMs, String(clampNumber(next.catalogSyncIntervalMs, 60_000, 86_400_000)), nowIso);
  db.setSetting(SETTING_KEYS.probeTimeoutMs, String(clampNumber(next.probeTimeoutMs, 2_000, 120_000)), nowIso);
  db.setSetting(SETTING_KEYS.probeConcurrency, String(clampNumber(next.probeConcurrency, 1, 32)), nowIso);
  db.setSetting(SETTING_KEYS.probeMaxTokens, String(clampNumber(next.probeMaxTokens, 1, 64)), nowIso);
  db.setSetting(SETTING_KEYS.probeTemperature, String(clampNumber(next.probeTemperature, 0, 2)), nowIso);
  db.setSetting(SETTING_KEYS.degradedRetryAttempts, String(clampNumber(next.degradedRetryAttempts, 0, 3)), nowIso);
  db.setSetting(SETTING_KEYS.failedRetryAttempts, String(clampNumber(next.failedRetryAttempts, 0, 3)), nowIso);
  db.setSetting(SETTING_KEYS.modelStatusUpScoreThreshold, String(clampNumber(next.modelStatusUpScoreThreshold, 0, 100)), nowIso);
  db.setSetting(SETTING_KEYS.modelStatusDegradedScoreThreshold, String(clampNumber(next.modelStatusDegradedScoreThreshold, 0, 100)), nowIso);

  if (Array.isArray(updates.upstreams)) {
    const keepIds: string[] = [];
    let fallbackIndex = 1;

    for (const upstream of updates.upstreams) {
      const id = (upstream.id?.trim() || sanitizeUpstreamId(upstream.name, fallbackIndex)).toLowerCase();
      fallbackIndex += 1;
      keepIds.push(id);

      const existing = db.listUpstreams(false).find((row) => row.id === id);
      db.upsertUpstream({
        id,
        name: upstream.name.trim() || `Upstream ${fallbackIndex}`,
        group: upstream.group?.trim() || existing?.group || "default",
        apiBaseUrl: normalizeUrl(upstream.apiBaseUrl),
        modelsUrl: upstream.modelsUrl.trim(),
        apiKey: typeof upstream.apiKey === "string" && upstream.apiKey.trim().length > 0 ? upstream.apiKey.trim() : (existing?.apiKey ?? ""),
        isActive: upstream.isActive ?? true,
        updatedAt: nowIso,
      });
    }

    db.deactivateMissingUpstreams(keepIds, nowIso);
  }

  return getAdminSettingsResponse(db, config);
}
