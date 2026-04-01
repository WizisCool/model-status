export const FIXED_DASHBOARD_RANGES = ["90m", "24h", "7d", "30d"] as const;
export const PROJECT_REPOSITORY_URL = "https://github.com/WizisCool/model-status";

export type DashboardRange = (typeof FIXED_DASHBOARD_RANGES)[number];

export const RANGE_TO_MS: Record<DashboardRange, number> = {
  "90m": 90 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export type ModelCatalogEntry = {
  id: string;
  created?: number;
  owned_by?: string;
};

export type SyncModelsResponse = {
  syncedAt: string;
  totalFetched: number;
  upserted: number;
};

export type ProbeRunResult = {
  upstreamId: string;
  upstreamName: string;
  model: string;
  startedAt: string;
  completedAt: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  connectivityLatencyMs?: number;
  firstTokenLatencyMs?: number;
  totalLatencyMs: number;
  rawResponseText?: string;
};

export type ProbeStatusSample = {
  id: string;
  startedAt: string;
  endedAt: string;
  score: number | null;
  level: "up" | "degraded" | "down" | "empty";
  probeCount: number;
  successCount: number;
  avgConnectivityLatencyMs: number | null;
  avgTotalLatencyMs: number | null;
};

export type UpstreamSettings = {
  id: string;
  name: string;
  group: string;
  apiBaseUrl: string;
  modelsUrl: string;
  isActive: boolean;
  apiKeyConfigured: boolean;
  apiKeyMasked: string | null;
};

export type ModelSummary = {
  upstreamId: string;
  upstreamName: string;
  upstreamGroup: string;
  model: string;
  displayName: string | null;
  icon: string | null;
  isVisible: boolean;
  sortOrder: number;
  created: number | null;
  ownedBy: string | null;
  probes: number;
  successes: number;
  failures: number;
  availabilityPercentage: number;
  avgConnectivityLatencyMs: number | null;
  avgFirstTokenLatencyMs: number | null;
  avgTotalLatencyMs: number | null;
  lastProbeAt: string | null;
  latestStatus: "up" | "degraded" | "down" | "empty";
  recentStatuses: ProbeStatusSample[];
};

export type ProbePoint = {
  id: number;
  upstreamId: string;
  upstreamName: string;
  model: string;
  startedAt: string;
  completedAt: string;
  success: boolean;
  statusCode: number | null;
  error: string | null;
  connectivityLatencyMs: number | null;
  firstTokenLatencyMs: number | null;
  totalLatencyMs: number;
  rawResponseText: string | null;
};

export type DashboardResponse = {
  range: DashboardRange;
  from: string;
  to: string;
  nextProbeAt: string | null;
  siteTitle: string;
  siteSubtitle: string;
  showSummaryCards: boolean;
  summary: {
    totalModels: number;
    availableModels: number;
    degradedModels: number;
    errorModels: number;
    availabilityPercentage: number;
  };
  models: ModelSummary[];
};

export type UpstreamDashboardSummary = {
  upstreamId: string;
  upstreamName: string;
  upstreamGroup: string;
  totalModels: number;
  availableModels: number;
  degradedModels: number;
  errorModels: number;
  availabilityPercentage: number;
};

export type AdminDashboardResponse = {
  range: DashboardRange;
  from: string;
  to: string;
  nextProbeAt: string | null;
  siteTitle: string;
  siteSubtitle: string;
  showSummaryCards: boolean;
  summary: DashboardResponse["summary"];
  models: ModelSummary[];
  upstreams: UpstreamDashboardSummary[];
  recentProbes: ProbePoint[];
};

export type AdminSessionResponse = {
  authenticated: boolean;
  username: string | null;
};

export type AdminSettings = {
  siteTitle: string;
  siteSubtitle: string;
  showSummaryCards: boolean;
  probeIntervalMs: number;
  catalogSyncIntervalMs: number;
  probeTimeoutMs: number;
  probeConcurrency: number;
  probeMaxTokens: number;
  probeTemperature: number;
  degradedRetryAttempts: number;
  failedRetryAttempts: number;
  modelStatusUpScoreThreshold: number;
  modelStatusDegradedScoreThreshold: number;
};

export type AdminSettingsResponse = {
  settings: AdminSettings;
  apiKeyConfigured: boolean;
  apiKeyMasked: string | null;
  upstreams: UpstreamSettings[];
};

export type UpdateAdminSettingsRequest = Partial<AdminSettings> & {
  upstreams?: Array<{
    id?: string;
    name: string;
    group?: string;
    apiBaseUrl: string;
    modelsUrl: string;
    isActive?: boolean;
    apiKey?: string;
  }>;
};

export type UpdateAdminModelsRequest = {
  models: Array<{
    upstreamId: string;
    model: string;
    displayName?: string | null;
    icon?: string | null;
    isVisible?: boolean;
    sortOrder?: number;
  }>;
};

export type ClearModelHistoryRequest = {
  upstreamId: string;
  model: string;
};

export type AdminActionResponse = {
  ok: boolean;
  message: string;
};

export type UpdateAdminAccountRequest = {
  currentPassword: string;
  newPassword: string;
};

export function isDashboardRange(value: string): value is DashboardRange {
  return FIXED_DASHBOARD_RANGES.includes(value as DashboardRange);
}

export function rangeStartIso(range: DashboardRange, now = new Date()): string {
  return new Date(now.getTime() - RANGE_TO_MS[range]).toISOString();
}
