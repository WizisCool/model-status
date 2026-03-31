import { Activity, CheckCircle2, Clock, Languages, LayoutGrid, List, LoaderCircle, Moon, Server, Shield, Sun, XCircle } from "lucide-react";
import { PROJECT_REPOSITORY_URL } from "@model-status/shared";
import type { DashboardRange, DashboardResponse, ModelSummary, ProbeStatusSample } from "@model-status/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ModelIcon } from "../components/ModelIcon";
import { ProjectIcon } from "../components/ProjectIcon";
import { buildApiPath, buildAppPath } from "../basePath";
import { getTranslation, normalizeLanguage, type Language, type Translation } from "../i18n";
import { applyTheme, getInitialRange, getInitialTheme, getInitialViewMode, syncUrlState, type ThemeMode, type ViewMode } from "../preferences";
import { listenForDashboardRefresh } from "../services/dashboardEvents";

type DisplayProbeStatus = ProbeStatusSample & {
  displayLevel: ProbeStatusSample["level"] | "pending";
};

function formatCountdown(nextProbeAt: string | null, nowMs: number, copy: Translation): string {
  if (!nextProbeAt) {
    return copy.schedulerIdle;
  }

  const diffMs = Date.parse(nextProbeAt) - nowMs;
  if (Number.isNaN(diffMs)) {
    return copy.schedulerIdle;
  }

  if (diffMs <= 0) {
    return copy.refreshing;
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${copy.nextDetection} ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDateTime(value: string | null, language: Language, options: Intl.DateTimeFormatOptions, copy: Translation): string {
  if (!value) {
    return copy.never;
  }

  return new Date(value).toLocaleString(language, options);
}

function getStatusColor(level: DisplayProbeStatus["displayLevel"]): string {
  switch (level) {
    case "up":
      return "bg-success";
    case "degraded":
      return "bg-warning";
    case "down":
      return "bg-error";
    case "pending":
      return "status-pending";
    default:
      return "bg-surfaceHover border border-border";
  }
}

function getStatusOpacity(status: DisplayProbeStatus): string {
  if (status.level === "empty") {
    return "opacity-40";
  }

  if (status.score === null) {
    return "opacity-75";
  }

  if (status.score >= 80) {
    return "opacity-100";
  }

  if (status.score >= 50) {
    return "opacity-90";
  }

  return "opacity-80";
}

function getStatusLabel(status: DisplayProbeStatus, copy: Translation): string {
  if (status.displayLevel === "pending") {
    return copy.pendingProbe;
  }

  switch (status.level) {
    case "up":
      return copy.success;
    case "degraded":
      return copy.degraded;
    case "down":
      return copy.failure;
    default:
      return copy.noDataWindow;
  }
}

function getStatusTooltip(status: DisplayProbeStatus, copy: Translation, language: Language): string {
  if (status.displayLevel === "pending") {
    const timeLabel = `${formatDateTime(status.startedAt, language, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }, copy)} -> ${formatDateTime(status.endedAt, language, { hour: "2-digit", minute: "2-digit" }, copy)}`;
    return `${timeLabel} / ${copy.pendingProbe}`;
  }

  if (status.level === "empty") {
    return copy.noDataWindow;
  }

  const timeLabel = `${formatDateTime(status.startedAt, language, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }, copy)} -> ${formatDateTime(status.endedAt, language, { hour: "2-digit", minute: "2-digit" }, copy)}`;
  const scoreLabel = status.score === null ? "--" : `${Math.round(status.score)}`;

  return `${timeLabel} | ${getStatusLabel(status, copy)} | ${status.successCount}/${status.probeCount} | score ${scoreLabel}`;
}

function decorateRecentStatuses(statuses: ProbeStatusSample[], isProbeCycleRunning: boolean): DisplayProbeStatus[] {
  if (!isProbeCycleRunning) {
    return statuses.map((status) => ({ ...status, displayLevel: status.level }));
  }

  const allEmpty = statuses.every((status) => status.level === "empty");
  if (allEmpty) {
    return statuses.map((status) => ({ ...status, displayLevel: "pending" }));
  }

  let pendingStartIndex = statuses.length;
  for (let index = statuses.length - 1; index >= 0; index -= 1) {
    if (statuses[index]?.level === "empty") {
      pendingStartIndex = index;
      continue;
    }
    break;
  }

  return statuses.map((status, index) => ({
    ...status,
    displayLevel: index >= pendingStartIndex && status.level === "empty" ? "pending" : status.level,
  }));
}

function getRangeMeta(range: DashboardRange) {
  switch (range) {
    case "90m":
      return { barHeight: "h-2.5", gapClass: "gap-px" };
    case "24h":
      return { barHeight: "h-3", gapClass: "gap-[2px]" };
    case "7d":
      return { barHeight: "h-3.5", gapClass: "gap-[3px]" };
    case "30d":
      return { barHeight: "h-4", gapClass: "gap-[3px]" };
  }
}

function Indicator({ tone }: { tone: ProbeStatusSample["level"] }) {
  const colorClass = getStatusColor(tone);

  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colorClass}`} />
    </span>
  );
}

function SchedulerStatusPill({
  nextProbeAt,
  dashboardTone,
  copy,
  successLabel,
}: {
  nextProbeAt: string | null;
  dashboardTone: ProbeStatusSample["level"];
  copy: Translation;
  successLabel: string | null;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] font-mono text-textSecondary shadow-sm sm:text-xs">
      <Indicator tone={dashboardTone} />
      <span>{formatCountdown(nextProbeAt, nowMs, copy)}</span>
      {successLabel ? <span className="text-textMuted">|</span> : null}
      {successLabel ? <span>{successLabel}</span> : null}
    </div>
  );
}

function LoadingScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="glass-panel flex min-h-[60vh] flex-col items-center justify-center rounded-[28px] border px-6 py-20 text-center shadow-lg shadow-black/5">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-border bg-background/80 text-textPrimary">
        <ProjectIcon className="h-8 w-8" />
        <LoaderCircle size={16} className="absolute -bottom-1 -right-1 animate-spin rounded-full bg-background text-accent" />
      </div>
      <h2 className="mt-6 text-2xl font-mono text-textPrimary">{title}</h2>
      <p className="mt-2 text-sm font-mono text-textMuted">{subtitle}</p>
    </div>
  );
}

function getDashboardTone(summary: DashboardResponse["summary"] | null): ProbeStatusSample["level"] {
  if (!summary || summary.totalModels === 0) {
    return "empty";
  }

  if (summary.errorModels > 0) {
    return summary.availableModels >= Math.max(1, Math.ceil(summary.totalModels * 0.7)) ? "degraded" : "down";
  }

  if (summary.degradedModels > 0) {
    return "degraded";
  }

  return "up";
}

function StatusBars({
  statuses,
  range,
  copy,
  language,
  isProbeCycleRunning,
}: {
  statuses: ProbeStatusSample[];
  range: DashboardRange;
  copy: Translation;
  language: Language;
  isProbeCycleRunning: boolean;
}) {
  const { barHeight, gapClass } = getRangeMeta(range);
  const decoratedStatuses = decorateRecentStatuses(statuses, isProbeCycleRunning);

  return (
    <div className={`flex w-full items-center ${gapClass} ${barHeight}`} role="img" aria-label={copy.recentStatus}>
      {decoratedStatuses.map((status) => (
        <span
          key={status.id}
          className={`min-w-0 flex-1 rounded-sm ${barHeight} ${getStatusColor(status.displayLevel)} ${getStatusOpacity(status)}`}
          title={getStatusTooltip(status, copy, language)}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  valueColor = "text-textPrimary",
  detail,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueColor?: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[24px] border border-border bg-surface/78 p-4 shadow-sm shadow-black/5 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-textMuted">{label}</div>
          <div className={`mt-3 text-3xl font-mono ${valueColor}`}>{value}</div>
          {detail ? <div className="mt-2 text-xs text-textMuted">{detail}</div> : null}
        </div>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-background/80 text-textSecondary">
          {icon}
        </div>
      </div>
    </div>
  );
}

function getModelLabel(model: ModelSummary): string {
  return model.displayName?.trim() || model.model;
}

function ModelCard({
  model,
  range,
  copy,
  language,
  isProbeCycleRunning,
}: {
  model: ModelSummary;
  range: DashboardRange;
  copy: Translation;
  language: Language;
  isProbeCycleRunning: boolean;
}) {
  const isHealthy = model.latestStatus === "up";
  const isDegraded = model.latestStatus === "degraded";
  const populatedBars = model.recentStatuses.filter((status) => status.level !== "empty").length;
  const displayLabel = getModelLabel(model);
  const showModelId = displayLabel !== model.model;

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-border bg-surface/72 p-6 shadow-sm shadow-black/5 transition-colors hover:border-textSecondary">
      <div className={`absolute inset-y-0 left-0 w-1 ${isHealthy ? "bg-success" : isDegraded ? "bg-warning" : model.latestStatus === "down" ? "bg-error" : "bg-border"}`} />

      <div className="min-w-0 pr-4">
        <div className="flex items-center gap-3">
          <ModelIcon icon={model.icon} modelId={model.model} ownedBy={model.ownedBy} size={32} className="text-textPrimary flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="truncate font-mono text-[1rem] font-semibold leading-tight text-textPrimary" title={displayLabel}>
              {displayLabel}
            </h3>
            {showModelId ? <div className="mt-2 truncate font-mono text-xs text-textMuted">{`${copy.modelId}: ${model.model}`}</div> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.22em] text-textMuted">
          <span>{copy.recentStatus}</span>
          <span>{populatedBars}/{model.recentStatuses.length}</span>
        </div>
        <StatusBars statuses={model.recentStatuses} range={range} copy={copy} language={language} isProbeCycleRunning={isProbeCycleRunning} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 text-sm">
        <div>
          <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.18em] text-textMuted">{copy.successRate}</div>
          <div className="font-mono text-textPrimary">{`${model.availabilityPercentage.toFixed(1)}%`}</div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.18em] text-textMuted">{copy.totalLatency}</div>
          <div className="font-mono text-textPrimary">{model.avgTotalLatencyMs ? `${Math.round(model.avgTotalLatencyMs)}ms` : "--"}</div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.18em] text-textMuted">{copy.connectivity}</div>
          <div className="font-mono text-textPrimary">{model.avgConnectivityLatencyMs ? `${Math.round(model.avgConnectivityLatencyMs)}ms` : "--"}</div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.18em] text-textMuted">{copy.ttft}</div>
          <div className="font-mono text-textPrimary">{model.avgFirstTokenLatencyMs ? `${Math.round(model.avgFirstTokenLatencyMs)}ms` : "--"}</div>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5 text-xs font-mono text-textMuted">
        <div className="flex min-w-0 items-center gap-2">
          <Clock size={12} />
          <span className="truncate">{`${copy.lastProbe}: ${formatDateTime(model.lastProbeAt, language, { hour: "2-digit", minute: "2-digit", second: "2-digit" }, copy)}`}</span>
        </div>
        <Indicator tone={model.latestStatus} />
      </div>
    </div>
  );
}

function ModelRow({
  model,
  range,
  copy,
  language,
  isProbeCycleRunning,
}: {
  model: ModelSummary;
  range: DashboardRange;
  copy: Translation;
  language: Language;
  isProbeCycleRunning: boolean;
}) {
  const displayLabel = getModelLabel(model);
  const showModelId = displayLabel !== model.model;

  return (
    <tr className="transition-colors hover:bg-surfaceHover">
      <td className="px-6 py-4 font-mono font-medium text-textPrimary">
        <div className="flex items-center gap-3">
          <ModelIcon icon={model.icon} modelId={model.model} ownedBy={model.ownedBy} size={24} className="text-textPrimary flex-shrink-0" />
          <div className="min-w-0">
            <span className="block max-w-xs truncate font-mono text-[0.98rem] font-semibold leading-tight" title={displayLabel}>{displayLabel}</span>
            {showModelId ? <span className="mt-1 block truncate text-xs text-textMuted">{`${copy.modelId}: ${model.model}`}</span> : null}
          </div>
        </div>
      </td>
      <td className="min-w-[220px] px-6 py-4">
        <div className="space-y-2">
          <div className="text-xs font-mono text-textMuted">{`${copy.successRate}: ${model.availabilityPercentage.toFixed(1)}%`}</div>
          <StatusBars statuses={model.recentStatuses} range={range} copy={copy} language={language} isProbeCycleRunning={isProbeCycleRunning} />
        </div>
      </td>
      <td className="px-6 py-4 text-textPrimary">{model.avgConnectivityLatencyMs ? `${Math.round(model.avgConnectivityLatencyMs)}ms` : "--"}</td>
      <td className="px-6 py-4 text-textPrimary">{model.avgTotalLatencyMs ? `${Math.round(model.avgTotalLatencyMs)}ms` : "--"}</td>
      <td className="px-6 py-4 text-textPrimary">{model.avgFirstTokenLatencyMs ? `${Math.round(model.avgFirstTokenLatencyMs)}ms` : "--"}</td>
      <td className="px-6 py-4 text-xs font-mono text-textSecondary">
        <div className="flex items-center justify-between gap-3">
          <span>{formatDateTime(model.lastProbeAt, language, { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }, copy)}</span>
          <Indicator tone={model.latestStatus} />
        </div>
      </td>
    </tr>
  );
}

function MobileModelListItem({
  model,
  range,
  copy,
  language,
  isProbeCycleRunning,
}: {
  model: ModelSummary;
  range: DashboardRange;
  copy: Translation;
  language: Language;
  isProbeCycleRunning: boolean;
}) {
  const displayLabel = getModelLabel(model);
  const showModelId = displayLabel !== model.model;

  return (
    <div className="rounded-[22px] border border-border bg-surface/72 p-4 shadow-sm shadow-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <ModelIcon icon={model.icon} modelId={model.model} ownedBy={model.ownedBy} size={24} className="text-textPrimary flex-shrink-0" />
            <h3 className="truncate font-mono text-[0.98rem] font-semibold text-textPrimary" title={displayLabel}>
              {displayLabel}
            </h3>
          </div>
          {showModelId ? <div className="mt-1 truncate pl-[36px] text-xs text-textMuted">{`${copy.modelId}: ${model.model}`}</div> : null}
        </div>
        <Indicator tone={model.latestStatus} />
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-textMuted">{copy.recentStatus}</div>
        <StatusBars statuses={model.recentStatuses} range={range} copy={copy} language={language} isProbeCycleRunning={isProbeCycleRunning} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-textMuted">{copy.successRate}</div>
          <div className="mt-1 font-mono text-textPrimary">{`${model.availabilityPercentage.toFixed(1)}%`}</div>
        </div>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-textMuted">{copy.connectivity}</div>
          <div className="mt-1 font-mono text-textPrimary">{model.avgConnectivityLatencyMs ? `${Math.round(model.avgConnectivityLatencyMs)}ms` : "--"}</div>
        </div>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-textMuted">{copy.totalLatency}</div>
          <div className="mt-1 font-mono text-textPrimary">{model.avgTotalLatencyMs ? `${Math.round(model.avgTotalLatencyMs)}ms` : "--"}</div>
        </div>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-textMuted">{copy.ttft}</div>
          <div className="mt-1 font-mono text-textPrimary">{model.avgFirstTokenLatencyMs ? `${Math.round(model.avgFirstTokenLatencyMs)}ms` : "--"}</div>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3 text-xs font-mono text-textMuted">
        {`${copy.lastProbe}: ${formatDateTime(model.lastProbeAt, language, { hour: "2-digit", minute: "2-digit", second: "2-digit" }, copy)}`}
      </div>
    </div>
  );
}

export function PublicDashboard() {
  const [range, setRange] = useState<DashboardRange>(getInitialRange);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [language, setLanguage] = useState<Language>(() => normalizeLanguage(localStorage.getItem("lang")));
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleExpired, setScheduleExpired] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const copy = useMemo(() => getTranslation(language), [language]);
  const isProbeCycleRunning = Boolean(data?.nextProbeAt) && scheduleExpired;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(buildApiPath(`/api/dashboard?range=${range}`));
      if (!response.ok) {
        throw new Error(copy.fetchDashboardFailed);
      }

      const json = (await response.json()) as DashboardResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.unknownError);
    } finally {
      setLoading(false);
    }
  }, [copy.fetchDashboardFailed, copy.unknownError, range]);

  useEffect(() => {
    localStorage.setItem("lang", language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.title = data?.siteTitle || copy.title;
  }, [data?.siteTitle, copy.title]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    syncUrlState(range, viewMode);
  }, [range, viewMode]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => listenForDashboardRefresh(() => {
    void fetchData();
  }), [fetchData]);

  useEffect(() => {
    if (!data?.nextProbeAt) {
      setScheduleExpired(false);
      return;
    }

    const nextProbeMs = Date.parse(data.nextProbeAt);
    if (!Number.isFinite(nextProbeMs)) {
      setScheduleExpired(false);
      return;
    }

    if (nextProbeMs <= Date.now()) {
      setScheduleExpired(true);
      return;
    }

    setScheduleExpired(false);
    const timeout = setTimeout(() => {
      setScheduleExpired(true);
    }, nextProbeMs - Date.now());

    return () => clearTimeout(timeout);
  }, [data?.nextProbeAt]);

  useEffect(() => {
    if (!data?.nextProbeAt) {
      const fallbackInterval = setInterval(() => {
        void fetchData();
      }, 60000);

      return () => clearInterval(fallbackInterval);
    }

    const nextProbeMs = Date.parse(data.nextProbeAt);
    if (!Number.isFinite(nextProbeMs)) {
      return;
    }

    const delayMs = nextProbeMs - Date.now();
    if (delayMs <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      void fetchData();
    }, delayMs + 300);

    return () => clearTimeout(timeout);
  }, [data?.nextProbeAt, fetchData]);

  useEffect(() => {
    if (!data?.nextProbeAt || !scheduleExpired) {
      return;
    }

    const refreshInterval = setInterval(() => {
      void fetchData();
    }, 2000);

    return () => clearInterval(refreshInterval);
  }, [data?.nextProbeAt, fetchData, scheduleExpired]);

  const groupedModels = useMemo(() => {
    if (!data) {
      return [];
    }

    const groups: Record<string, Record<string, ModelSummary[]>> = {};
    for (const model of data.models) {
      const groupName = model.upstreamGroup || "Default";
      const upstreamName = model.upstreamName || "Unknown";

      if (!groups[groupName]) {
        groups[groupName] = {};
      }
      if (!groups[groupName][upstreamName]) {
        groups[groupName][upstreamName] = [];
      }

      groups[groupName][upstreamName].push(model);
    }

    return Object.entries(groups).map(([groupName, upstreams]) => ({
      groupName,
      upstreams: Object.entries(upstreams).map(([upstreamName, models]) => ({
        upstreamName,
        models,
      })),
    }));
  }, [data]);

  const checkAdmin = useCallback(async () => {
    try {
      const response = await fetch(buildApiPath("/api/admin/session"));
      if (response.ok) {
        const json = await response.json();
        setIsAdmin(json.authenticated);
      }
    } catch {
      // Ignore session errors on the public dashboard.
    }
  }, []);

  useEffect(() => {
    void checkAdmin();
  }, [checkAdmin]);

  const healthyRate = data && data.summary.totalModels > 0
    ? Number(((data.summary.availableModels / data.summary.totalModels) * 100).toFixed(1))
    : 0;
  const rangeSuccessLabel = data ? `${copy.successRate}: ${data.summary.availabilityPercentage.toFixed(1)}%` : null;
  const dashboardTone = getDashboardTone(data?.summary ?? null);

  const handleRangeChange = (value: DashboardRange) => {
    if (value === range) {
      return;
    }

    setLoading(true);
    setData(null);
    setRange(value);
  };
  const toggleLanguage = () => {
    setLoading(true);
    setData(null);
    setLanguage((prev) => (prev === "en" ? "zh-CN" : "en"));
  };
  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  if (error) {
    return (
      <div className="min-h-screen px-4 py-6 font-sans md:px-6 md:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="glass-panel flex flex-col items-center justify-center rounded-[28px] border p-6 py-20 text-center" style={{ borderColor: "color-mix(in srgb, var(--error) 50%, transparent)" }}>
            <XCircle className="mb-4 text-error" size={48} />
            <h2 className="mb-2 text-xl font-mono text-textPrimary">{copy.connectionError}</h2>
            <p className="max-w-md text-textSecondary">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen px-4 py-6 font-sans md:px-6 md:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <LoadingScreen title={copy.title} subtitle={copy.establishingConnection} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 font-sans md:px-6 md:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="relative overflow-hidden rounded-[32px] border border-border bg-gradient-to-br from-surface via-surface to-accent/40 p-5 shadow-2xl shadow-black/10 sm:p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-success/10 blur-3xl" />
            <div className="absolute left-0 top-24 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div>
                <h1 className="text-3xl font-mono font-semibold tracking-tight text-textPrimary md:text-4xl">
                  {data?.siteTitle || copy.title}
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm text-textSecondary">
                  {data?.siteSubtitle || copy.subtitle}
                </p>
              </div>
              <SchedulerStatusPill nextProbeAt={data?.nextProbeAt ?? null} dashboardTone={dashboardTone} copy={copy} successLabel={rangeSuccessLabel} />
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
              <div className="flex w-full min-w-0 rounded-2xl border border-border bg-background/70 p-1 shadow-sm sm:w-auto">
                {(["90m", "24h", "7d", "30d"] as DashboardRange[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRangeChange(value)}
                    className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-center text-sm font-mono transition-colors sm:flex-none sm:px-4 sm:py-1.5 ${range === value ? "bg-accent text-textPrimary shadow-sm" : "text-textSecondary hover:bg-surfaceHover hover:text-textPrimary"}`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                <div className="flex rounded-2xl border border-border bg-background/70 p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-xl p-2 transition-colors ${viewMode === "grid" ? "bg-accent text-textPrimary" : "text-textSecondary hover:bg-surfaceHover hover:text-textPrimary"}`}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`rounded-xl p-2 transition-colors ${viewMode === "list" ? "bg-accent text-textPrimary" : "text-textSecondary hover:bg-surfaceHover hover:text-textPrimary"}`}
                  >
                    <List size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <a
                      href={buildAppPath("/admin")}
                      className="glass-button flex h-10 w-10 items-center justify-center rounded-xl text-textSecondary hover:text-textPrimary"
                      title={copy.adminDashboard}
                      aria-label={copy.adminDashboard}
                    >
                      <Shield size={16} />
                    </a>
                  ) : null}
                  <button type="button" onClick={toggleLanguage} className="glass-button rounded-xl p-2 text-textSecondary hover:text-textPrimary" title={copy.toggleLanguage}>
                    <Languages size={16} />
                  </button>
                  <button type="button" onClick={toggleTheme} className="glass-button rounded-xl p-2 text-textSecondary hover:text-textPrimary" title={copy.toggleTheme}>
                    {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {data ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {data.showSummaryCards ? (
              <section className="glass-panel rounded-[28px] border border-border p-5 shadow-lg shadow-black/5">
                <div className="mb-4 border-b border-border pb-3">
                  <div>
                    <h2 className="text-lg font-mono text-textPrimary">{copy.overview}</h2>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label={copy.totalModels} value={data.summary.totalModels} icon={<Server size={18} />} />
                  <StatCard label={copy.successes} value={data.summary.availableModels} icon={<CheckCircle2 size={18} />} valueColor="text-success" detail={`${healthyRate.toFixed(1)}%`} />
                  <StatCard label={copy.degraded} value={data.summary.degradedModels} icon={<Activity size={18} />} valueColor={data.summary.degradedModels > 0 ? "text-warning" : "text-textPrimary"} />
                  <StatCard label={copy.failures} value={data.summary.errorModels} icon={<XCircle size={18} />} valueColor={data.summary.errorModels > 0 ? "text-error" : "text-textPrimary"} />
                </div>
              </section>
            ) : null}

            <section className="glass-panel rounded-[28px] border border-border p-5 shadow-lg shadow-black/5 sm:p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-mono text-textPrimary">{copy.monitoredModels}</h2>
                </div>
              </div>

              {data.models.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Server className="mb-4 text-textMuted" size={40} />
                  <h3 className="text-2xl font-mono text-textPrimary">{copy.noModelsFound}</h3>
                  <p className="mt-2 text-textSecondary">{copy.syncToBegin}</p>
                </div>
              ) : (
                <div className="mt-8 space-y-8">
                  {groupedModels.map((group) => (
                    <section key={group.groupName} className="space-y-5">
                      <div className="border-b border-border pb-3">
                        <h3 className="text-xl font-mono text-textPrimary">{group.groupName}</h3>
                      </div>

                      {group.upstreams.map((upstream) => (
                        <div key={upstream.upstreamName} className="space-y-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-mono text-textSecondary">
                              <Server size={14} className="text-accent" />
                              <span>{upstream.upstreamName}</span>
                            </div>
                            <span className="rounded-full border border-border bg-surface/70 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-textMuted">
                              {upstream.models.length} models
                            </span>
                          </div>

                          {viewMode === "grid" ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                              {upstream.models.map((model) => (
                                <ModelCard key={model.model} model={model} range={range} copy={copy} language={language} isProbeCycleRunning={isProbeCycleRunning} />
                              ))}
                            </div>
                          ) : (
                            <>
                              <div className="space-y-3 md:hidden">
                                {upstream.models.map((model) => (
                                  <MobileModelListItem key={model.model} model={model} range={range} copy={copy} language={language} isProbeCycleRunning={isProbeCycleRunning} />
                                ))}
                              </div>
                              <div className="hidden overflow-x-auto rounded-[24px] border border-border bg-surface/72 md:block">
                                <table className="min-w-[760px] w-full text-left text-sm">
                                  <thead className="border-b border-border bg-background/70 text-[11px] font-mono uppercase tracking-[0.18em] text-textSecondary">
                                    <tr>
                                      <th className="px-6 py-4">{copy.model}</th>
                                      <th className="px-6 py-4">{copy.status}</th>
                                      <th className="px-6 py-4">{copy.connectivity}</th>
                                      <th className="px-6 py-4">{copy.avgTotalLatency}</th>
                                      <th className="px-6 py-4">{copy.ttft}</th>
                                      <th className="px-6 py-4">{copy.lastProbe}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {upstream.models.map((model) => (
                                      <ModelRow key={model.model} model={model} range={range} copy={copy} language={language} isProbeCycleRunning={isProbeCycleRunning} />
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}

        <footer className="flex flex-col items-center justify-center gap-4 pb-4 pt-10 text-sm font-mono text-textMuted">
          <a href={PROJECT_REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition-colors hover:text-textPrimary">
            <ProjectIcon className="h-4 w-4" />
            Powered by Model Status
          </a>
        </footer>
      </div>
    </div>
  );
}
