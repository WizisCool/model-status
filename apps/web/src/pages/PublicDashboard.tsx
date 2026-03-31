import { Activity, CheckCircle2, Clock, Languages, LayoutGrid, List, Moon, Server, Sun, XCircle } from "lucide-react";
import type { DashboardRange, DashboardResponse, ModelSummary, ProbeStatusSample } from "@model-status/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ModelIcon } from "../components/ModelIcon";
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

  const timeLabel = `${formatDateTime(status.startedAt, language, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }, copy)} → ${formatDateTime(status.endedAt, language, { hour: "2-digit", minute: "2-digit" }, copy)}`;
  const scoreLabel = status.score === null ? "—" : `${Math.round(status.score)}`;

  return `${timeLabel} · ${getStatusLabel(status, copy)} · ${status.successCount}/${status.probeCount} · score ${scoreLabel}`;
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
  const isAnimated = tone === "up" || tone === "degraded";
  const colorClass = getStatusColor(tone);

  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      {isAnimated ? <span className={`absolute inline-flex h-full w-full rounded-full ${colorClass} animate-ping opacity-60`} /> : null}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colorClass}`} />
    </span>
  );
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
  const isSparse = range === "90m" && statuses.length < 30;
  const decoratedStatuses = decorateRecentStatuses(statuses, isProbeCycleRunning);

  return (
    <div className={`flex items-center ${isSparse ? "justify-end gap-[3px]" : gapClass} ${barHeight}`} role="img" aria-label={copy.recentStatus}>
      {decoratedStatuses.map((status) => (
        <span key={status.id} className={`${isSparse ? "w-[6px]" : "flex-1"} rounded-sm ${barHeight} ${getStatusColor(status.displayLevel)} ${getStatusOpacity(status)}`} title={getStatusTooltip(status, copy, language)} />
      ))}
    </div>
  );
}

function StatCard({ label, value, icon, valueColor = "text-textPrimary" }: { label: string; value: string | number; icon: React.ReactNode; valueColor?: string }) {
  return (
    <div className="glass-panel p-6 rounded-lg flex flex-col">
      <div className="text-textSecondary font-mono text-xs uppercase mb-3 flex items-center gap-2">
        {icon} {label}
      </div>
      <div className={`text-3xl font-medium tracking-tight ${valueColor}`}>{value}</div>
    </div>
  );
}

function getModelLabel(model: ModelSummary): string {
  return model.displayName?.trim() || model.model;
}

function ModelCard({ model, range, copy, language, isProbeCycleRunning }: { model: ModelSummary; range: DashboardRange; copy: Translation; language: Language; isProbeCycleRunning: boolean }) {
  const isHealthy = model.latestStatus === "up";
  const isDegraded = model.latestStatus === "degraded";
  const populatedBars = model.recentStatuses.filter((status) => status.level !== "empty").length;
  const displayLabel = getModelLabel(model);
  const showModelId = displayLabel !== model.model;

  return (
    <div className="glass-panel p-6 rounded-lg relative overflow-visible group hover:border-textSecondary transition-colors">
      <div className={`absolute top-0 left-0 w-1 h-full ${isHealthy ? "bg-success" : isDegraded ? "bg-warning" : model.latestStatus === "down" ? "bg-error" : "bg-border"}`} />

      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="min-w-0 pr-4">
          <h3 className="font-sans font-semibold text-[1.1rem] truncate text-textPrimary flex items-center gap-2 leading-tight" title={displayLabel}>
            <ModelIcon icon={model.icon} modelId={model.model} ownedBy={model.ownedBy} size={18} className="text-textPrimary" />
            <span className="truncate">{displayLabel}</span>
          </h3>
          {showModelId ? <div className="mt-1 truncate font-mono text-xs text-textMuted">{model.model}</div> : null}
        </div>
        <div className={`flex-shrink-0 text-xs font-mono px-2 py-1 rounded bg-surface border border-border ${isHealthy ? "text-success" : isDegraded ? "text-warning" : model.latestStatus === "down" ? "text-error" : "text-textMuted"}`}>
          {model.availabilityPercentage.toFixed(1)}%
        </div>
      </div>

      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wide text-textMuted">
          <span>{copy.recentStatus}</span>
          <span>{populatedBars}/{model.recentStatuses.length}</span>
        </div>
        <StatusBars statuses={model.recentStatuses} range={range} copy={copy} language={language} isProbeCycleRunning={isProbeCycleRunning} />
      </div>

      <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm mb-6">
        <div>
          <div className="text-textMuted text-xs mb-1 font-mono uppercase">{copy.totalLatency}</div>
          <div className="text-textPrimary font-medium">{model.avgTotalLatencyMs ? `${Math.round(model.avgTotalLatencyMs)}ms` : "—"}</div>
        </div>
        <div>
          <div className="text-textMuted text-xs mb-1 font-mono uppercase">{copy.connectivity}</div>
          <div className="text-textPrimary font-medium">{model.avgConnectivityLatencyMs ? `${Math.round(model.avgConnectivityLatencyMs)}ms` : "—"}</div>
        </div>
        <div>
          <div className="text-textMuted text-xs mb-1 font-mono uppercase">{copy.ttft}</div>
          <div className="text-textPrimary font-medium">{model.avgFirstTokenLatencyMs ? `${Math.round(model.avgFirstTokenLatencyMs)}ms` : "—"}</div>
        </div>
        <div>
          <div className="text-textMuted text-xs mb-1 font-mono uppercase">{copy.probes}</div>
          <div className="text-textSecondary">{model.probes}</div>
        </div>
        <div>
          <div className="text-textMuted text-xs mb-1 font-mono uppercase">{copy.failed}</div>
          <div className={model.failures > 0 ? "text-error font-medium" : "text-textSecondary"}>{model.failures}</div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-xs font-mono text-textMuted opacity-80">
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={12} />
          <span className="truncate">{`${copy.lastProbe}: ${formatDateTime(model.lastProbeAt, language, { hour: "2-digit", minute: "2-digit", second: "2-digit" }, copy)}`}</span>
        </div>
        <Indicator tone={model.latestStatus} />
      </div>
    </div>
  );
}

function ModelRow({ model, range, copy, language, isProbeCycleRunning }: { model: ModelSummary; range: DashboardRange; copy: Translation; language: Language; isProbeCycleRunning: boolean }) {
  const isHealthy = model.latestStatus === "up";
  const isDegraded = model.latestStatus === "degraded";
  const displayLabel = getModelLabel(model);
  const showModelId = displayLabel !== model.model;

  return (
    <tr className="hover:bg-surfaceHover transition-colors group">
      <td className="px-6 py-4 font-mono font-medium text-textPrimary">
        <div className="flex items-center gap-3">
          <ModelIcon icon={model.icon} modelId={model.model} ownedBy={model.ownedBy} size={18} className="text-textPrimary" />
          <div className="min-w-0">
            <span className="font-sans truncate max-w-xs block text-[0.98rem] font-semibold leading-tight" title={displayLabel}>{displayLabel}</span>
            {showModelId ? <span className="mt-1 block truncate text-xs text-textMuted">{model.model}</span> : null}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 min-w-[220px]">
        <div className="space-y-2">
          <div className={`inline-flex items-center px-2 py-1 rounded bg-surface border border-border text-xs font-mono ${isHealthy ? "text-success" : isDegraded ? "text-warning" : model.latestStatus === "down" ? "text-error" : "text-textMuted"}`}>
            {model.availabilityPercentage.toFixed(1)}% ({model.successes}/{model.probes})
          </div>
          <StatusBars statuses={model.recentStatuses} range={range} copy={copy} language={language} isProbeCycleRunning={isProbeCycleRunning} />
        </div>
      </td>
      <td className="px-6 py-4 text-textPrimary">{model.avgConnectivityLatencyMs ? `${Math.round(model.avgConnectivityLatencyMs)}ms` : "—"}</td>
      <td className="px-6 py-4 text-textPrimary">{model.avgTotalLatencyMs ? `${Math.round(model.avgTotalLatencyMs)}ms` : "—"}</td>
      <td className="px-6 py-4 text-textPrimary">{model.avgFirstTokenLatencyMs ? `${Math.round(model.avgFirstTokenLatencyMs)}ms` : "—"}</td>
      <td className="px-6 py-4 text-textSecondary text-xs font-mono">
        <div className="flex items-center justify-between gap-3">
          <span>{formatDateTime(model.lastProbeAt, language, { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }, copy)}</span>
          <Indicator tone={model.latestStatus} />
        </div>
      </td>
    </tr>
  );
}

function countModelsByLevel(models: ModelSummary[]) {
  return models.reduce(
    (accumulator, model) => {
      if (model.latestStatus === "up") {
        accumulator.available += 1;
      }
      if (model.latestStatus === "down") {
        accumulator.error += 1;
      }
      return accumulator;
    },
    { available: 0, error: 0 },
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
  const [nowMs, setNowMs] = useState(() => Date.now());

  const copy = useMemo(() => getTranslation(language), [language]);
  const modelAvailability = useMemo(() => countModelsByLevel(data?.models ?? []), [data?.models]);
  const scheduleExpired = data?.nextProbeAt ? Date.parse(data.nextProbeAt) <= nowMs : false;
  const isProbeCycleRunning = Boolean(data?.nextProbeAt) && scheduleExpired;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/dashboard?range=${range}`);
      if (!response.ok) {
        throw new Error(language === "zh-CN" ? "获取仪表盘数据失败" : "Failed to fetch dashboard data");
      }

      const json = (await response.json()) as DashboardResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : language === "zh-CN" ? "未知错误" : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [language, range]);

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
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  const countdownLabel = formatCountdown(data?.nextProbeAt ?? null, nowMs, copy);

  const groupedModels = useMemo(() => {
    if (!data) return [];
    
    const groups: Record<string, Record<string, ModelSummary[]>> = {};
    for (const m of data.models) {
      const groupName = m.upstreamGroup || "Default";
      const upstreamName = m.upstreamName || "Unknown";
      
      if (!groups[groupName]) groups[groupName] = {};
      if (!groups[groupName][upstreamName]) groups[groupName][upstreamName] = [];
      
      groups[groupName][upstreamName].push(m);
    }
    
    return Object.entries(groups).map(([groupName, upstreams]) => ({
      groupName,
      upstreams: Object.entries(upstreams).map(([upstreamName, models]) => ({
        upstreamName,
        models
      }))
    }));
  }, [data]);

  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/session");
      if (response.ok) {
        const json = await response.json();
        setIsAdmin(json.authenticated);
      }
    } catch {
      // Ignore error
    }
  }, []);

  useEffect(() => {
    void checkAdmin();
  }, [checkAdmin]);

  const toggleLanguage = () => setLanguage((prev) => (prev === "en" ? "zh-CN" : "en"));
  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto font-sans flex flex-col">
      <header className="mb-12">
        <div className="relative overflow-hidden rounded-[32px] border border-border bg-gradient-to-br from-surface via-surface to-accent/35 p-6 shadow-2xl shadow-black/10 md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-success/10 blur-3xl" />
            <div className="absolute left-0 top-24 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-4xl font-medium tracking-tight text-textPrimary flex items-center gap-3 leading-tight">
                <Activity className="text-success" />
                {data?.siteTitle || copy.title}
              </h1>
              <p className="text-textSecondary mt-2 text-sm">{data?.siteSubtitle || copy.subtitle}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-mono text-textSecondary shadow-sm">
                <Indicator tone={data ? (modelAvailability.error === 0 ? "up" : modelAvailability.available >= Math.max(1, Math.ceil(data.summary.totalModels * 0.7)) ? "degraded" : "down") : "empty"} />
                {countdownLabel}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-surface border border-border p-1 rounded-md shadow-sm">
                {(["90m", "24h", "7d", "30d"] as DashboardRange[]).map((value) => (
                  <button key={value} type="button" onClick={() => setRange(value)} className={`px-4 py-1.5 text-sm font-mono rounded-sm transition-colors ${range === value ? "bg-accent text-textPrimary shadow-sm" : "text-textSecondary hover:text-textPrimary hover:bg-surfaceHover"}`}>
                    {value}
                  </button>
                ))}
              </div>

              <div className="flex bg-surface border border-border p-1 rounded-md shadow-sm">
                <button type="button" onClick={() => setViewMode("grid")} className={`p-1.5 rounded-sm transition-colors ${viewMode === "grid" ? "bg-accent text-textPrimary" : "text-textSecondary hover:text-textPrimary hover:bg-surfaceHover"}`}>
                  <LayoutGrid size={16} />
                </button>
                <button type="button" onClick={() => setViewMode("list")} className={`p-1.5 rounded-sm transition-colors ${viewMode === "list" ? "bg-accent text-textPrimary" : "text-textSecondary hover:text-textPrimary hover:bg-surfaceHover"}`}>
                  <List size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <a href="/admin" className="glass-button p-2 rounded-md text-textSecondary hover:text-textPrimary text-sm font-mono flex items-center h-8" title={copy.adminDashboard}>
                    {copy.admin}
                  </a>
                )}
                <button type="button" onClick={toggleLanguage} className="glass-button p-2 rounded-md text-textSecondary hover:text-textPrimary h-8 flex items-center" title={copy.toggleLanguage}>
                  <Languages size={16} />
                </button>
                <button type="button" onClick={toggleTheme} className="glass-button p-2 rounded-md text-textSecondary hover:text-textPrimary h-8 flex items-center" title={copy.toggleTheme}>
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <div className="glass-panel p-6 rounded-lg border flex flex-col items-center justify-center text-center py-20" style={{ borderColor: "color-mix(in srgb, var(--error) 50%, transparent)" }}>
          <XCircle className="text-error mb-4" size={48} />
          <h2 className="text-xl font-mono mb-2 text-textPrimary">{copy.connectionError}</h2>
          <p className="text-textSecondary max-w-md">{error}</p>
        </div>
      ) : loading && !data ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Activity className="animate-pulse text-textMuted" size={32} />
          <p className="text-textMuted font-mono text-sm animate-pulse">{copy.establishingConnection}</p>
        </div>
      ) : data ? (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label={copy.totalModels} value={data.summary.totalModels} icon={<Server size={18} />} />
            <StatCard label={copy.successRate} value={`${data.summary.availabilityPercentage.toFixed(1)}%`} icon={<Activity size={18} />} valueColor={data.summary.availabilityPercentage >= 80 ? "text-success" : data.summary.availabilityPercentage >= 50 ? "text-warning" : "text-error"} />
            <StatCard label={copy.successes} value={data.summary.availableModels} icon={<CheckCircle2 size={18} />} valueColor="text-success" />
            <StatCard label={copy.failures} value={data.summary.errorModels} icon={<XCircle size={18} />} valueColor={data.summary.errorModels > 0 ? "text-error" : "text-textPrimary"} />
          </div>

          <div>
            <h2 className="font-display text-[1.65rem] text-textPrimary mb-6 flex items-center gap-2 leading-tight">
              <span className="w-2 h-2 rounded-full bg-accent inline-block" />
              {copy.monitoredModels}
            </h2>

            {data.models.length === 0 ? (
              <div className="glass-panel p-12 rounded-lg text-center flex flex-col items-center justify-center">
                <Server className="text-textMuted mb-4" size={40} />
                <h3 className="font-display text-2xl font-medium text-textPrimary mb-2">{copy.noModelsFound}</h3>
                <p className="text-textSecondary mb-6">{copy.syncToBegin}</p>
              </div>
            ) : (
              <div className="space-y-12">
                {groupedModels.map((group) => (
                  <div key={group.groupName} className="space-y-8">
                    <h3 className="font-display text-xl text-textPrimary border-b border-border pb-2">{group.groupName}</h3>
                    
                    {group.upstreams.map((upstream) => (
                      <div key={upstream.upstreamName} className="space-y-4">
                        <div className="flex items-center gap-2 text-textSecondary mb-4">
                          <Server size={14} className="text-accent" />
                          <span className="font-medium text-sm">{upstream.upstreamName}</span>
                          <span className="text-xs text-textMuted font-mono bg-surface px-2 py-0.5 rounded ml-2">{upstream.models.length} models</span>
                        </div>
                        
                        {viewMode === "grid" ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upstream.models.map((model) => (
                              <ModelCard key={model.model} model={model} range={range} copy={copy} language={language} isProbeCycleRunning={isProbeCycleRunning} />
                            ))}
                          </div>
                        ) : (
                          <div className="glass-panel rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-surface border-b border-border text-textSecondary font-mono text-xs uppercase">
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
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <footer className="mt-auto pt-24 pb-8 flex flex-col items-center justify-center gap-4 text-textMuted text-sm font-mono">
        <a href={data?.githubRepoUrl || "https://github.com/WizisCool/model-status"} target="_blank" rel="noopener noreferrer" className="hover:text-textPrimary transition-colors flex items-center gap-2">
          <svg aria-label="GitHub" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><title>GitHub</title><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>
          Powered by model status
        </a>
        {data?.githubRepoUrl && (
          <a href={data.githubRepoUrl} target="_blank" rel="noopener noreferrer" className="hover:text-textPrimary transition-colors">
            {copy.githubLink}
          </a>
        )}
      </footer>
    </div>
  );
}
