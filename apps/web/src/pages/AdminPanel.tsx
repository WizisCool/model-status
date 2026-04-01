import { Clock3, Gauge, Languages, LogOut, Monitor, Moon, RefreshCw, ShieldCheck, Sun, SwatchBook } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AdminActionResponse,
  AdminSettings,
  AdminDashboardResponse,
  AdminSessionResponse,
  ClearModelHistoryRequest,
  AdminSettingsResponse,
  UpdateAdminAccountRequest,
  UpdateAdminModelsRequest,
  UpdateAdminSettingsRequest,
} from "@model-status/shared";

import { ModelManagerSection } from "../components/ModelManagerSection";
import { buildApiPath, buildAppPath } from "../basePath";
import { ProjectIcon } from "../components/ProjectIcon";
import { getAdminCopy, type SettingGroupConfig } from "../adminCopy";
import { ToastRegion, type ToastNotice, type ToastTone } from "../components/ToastRegion";
import { normalizeLanguage, type Language } from "../i18n";
import { applyTheme, getInitialTheme, type ThemeMode } from "../preferences";
import { announceDashboardRefresh } from "../services/dashboardEvents";

type EditableUpstream = AdminSettingsResponse["upstreams"][number] & {
  newApiKey?: string;
};

type EditableAdminSettingsResponse = Omit<AdminSettingsResponse, "upstreams"> & {
  upstreams: EditableUpstream[];
};

type EditableModel = AdminDashboardResponse["models"][number];
type AdminSection = "overview" | "models" | "upstreams" | "runtime";
type DurationUnit = "seconds" | "minutes" | "hours";

const DURATION_UNIT_FACTORS: Record<DurationUnit, number> = {
  seconds: 1000,
  minutes: 60_000,
  hours: 3_600_000,
};

function inferDurationUnit(valueMs: number): DurationUnit {
  if (valueMs % DURATION_UNIT_FACTORS.hours === 0) return "hours";
  if (valueMs % DURATION_UNIT_FACTORS.minutes === 0) return "minutes";
  return "seconds";
}

function formatDurationValue(valueMs: number, unit: DurationUnit): number {
  const factor = DURATION_UNIT_FACTORS[unit];
  return Number((valueMs / factor).toFixed(2));
}

function formatDurationSummary(valueMs: number, copy: ReturnType<typeof getAdminCopy>): string {
  if (valueMs % DURATION_UNIT_FACTORS.hours === 0) {
    return `${valueMs / DURATION_UNIT_FACTORS.hours} ${copy.durationSummaryHours}`;
  }
  if (valueMs % DURATION_UNIT_FACTORS.minutes === 0) {
    return `${valueMs / DURATION_UNIT_FACTORS.minutes} ${copy.durationSummaryMinutes}`;
  }
  return `${valueMs / DURATION_UNIT_FACTORS.seconds} ${copy.durationSummarySeconds}`;
}

function getSettingGroupIcon(groupId: SettingGroupConfig["id"]) {
  switch (groupId) {
    case "branding":
      return <SwatchBook size={18} />;
    case "scheduling":
      return <Clock3 size={18} />;
    case "probe":
      return <Gauge size={18} />;
    case "retries":
      return <RefreshCw size={18} />;
    case "classification":
      return <ShieldCheck size={18} />;
  }
}

async function readResponseMessage(response: Response, fallback: string): Promise<string> {
  const raw = await response.text().catch(() => "");
  if (!raw.trim()) {
    return fallback;
  }

  try {
    const json = JSON.parse(raw) as { error?: string; message?: string };
    if (typeof json.error === "string" && json.error.trim().length > 0) return json.error;
    if (typeof json.message === "string" && json.message.trim().length > 0) return json.message;
  } catch {
    // Ignore parse errors and return raw body.
  }

  return raw;
}

function getToastTitle(language: Language, tone: ToastTone): string {
  if (language === "zh-CN") {
    if (tone === "success") return "成功";
    if (tone === "error") return "操作失败";
    return "提示";
  }
  if (tone === "success") return "Success";
  if (tone === "error") return "Action failed";
  return "Notice";
}

function getEditableModelKey(model: Pick<EditableModel, "upstreamId" | "model">): string {
  return `${model.upstreamId}::${model.model}`;
}

function mergeModelDrafts(nextModels: EditableModel[], currentDrafts: EditableModel[]): EditableModel[] {
  const draftByKey = new Map(currentDrafts.map((model) => [getEditableModelKey(model), model]));

  return nextModels.map((model) => {
    const draft = draftByKey.get(getEditableModelKey(model));
    if (!draft) {
      return { ...model };
    }

    return {
      ...model,
      displayName: draft.displayName,
      icon: draft.icon,
      isVisible: draft.isVisible,
      sortOrder: draft.sortOrder,
    };
  });
}

export function AdminPanel() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [language, setLanguage] = useState<Language>(() => normalizeLanguage(localStorage.getItem("lang")));
  const [session, setSession] = useState<AdminSessionResponse>({ authenticated: false, username: null });
  const [settings, setSettings] = useState<EditableAdminSettingsResponse | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [notifications, setNotifications] = useState<ToastNotice[]>([]);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [editableModels, setEditableModels] = useState<EditableModel[]>([]);
  const [isSavingModels, setIsSavingModels] = useState(false);
  const [clearingModelKey, setClearingModelKey] = useState<string | null>(null);
  const [durationUnits, setDurationUnits] = useState<Partial<Record<keyof AdminSettings, DurationUnit>>>({});
  const [activeSection, setActiveSection] = useState<AdminSection>(() => {
    const stored = localStorage.getItem("admin-section");
    return stored === "overview" || stored === "models" || stored === "upstreams" || stored === "runtime" ? stored : "overview";
  });
  const toastIdRef = useRef(0);
  const toastTimersRef = useRef(new Map<number, number>());

  const copy = useMemo(() => getAdminCopy(language), [language]);
  const adminCopy = copy;
  const settingGroups = copy.settingGroups;
  const settingFields = useMemo(() => settingGroups.flatMap((group) => group.fields), [settingGroups]);
  const requestFailedCopy = copy.requestFailed;

  const dismissNotification = useCallback((id: number) => {
    const timer = toastTimersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setNotifications((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const pushNotification = useCallback((tone: ToastTone, description: string) => {
    const id = toastIdRef.current + 1;
    toastIdRef.current = id;
    setNotifications((current) => [
      ...current.slice(-2),
      { id, tone, title: getToastTitle(language, tone), description },
    ]);
    const timer = window.setTimeout(() => {
      setNotifications((current) => current.filter((notice) => notice.id !== id));
      toastTimersRef.current.delete(id);
    }, tone === "error" ? 8000 : 4500);
    toastTimersRef.current.set(id, timer);
  }, [language]);

  const notifyErrorResponse = useCallback(async (response: Response) => {
    pushNotification("error", await readResponseMessage(response, response.status === 401 ? copy.unauthorized : requestFailedCopy));
  }, [copy.unauthorized, pushNotification]);

  useEffect(() => {
    return () => {
      for (const timer of toastTimersRef.current.values()) window.clearTimeout(timer);
      toastTimersRef.current.clear();
    };
  }, []);

  const refreshSession = useCallback(async () => {
    const response = await fetch(buildApiPath("/api/admin/session"));
    setSession((await response.json()) as AdminSessionResponse);
  }, []);

  const refreshSettings = useCallback(async () => {
    const response = await fetch(buildApiPath("/api/admin/settings"), { credentials: "include" });
    if (!response.ok) {
      await notifyErrorResponse(response);
      return;
    }
    const json = (await response.json()) as AdminSettingsResponse;
    setSettings({ ...json, upstreams: json.upstreams.map((upstream) => ({ ...upstream })) });
  }, [notifyErrorResponse]);

  const refreshDashboard = useCallback(async () => {
    const response = await fetch(buildApiPath("/api/admin/dashboard?range=24h"), { credentials: "include" });
    if (!response.ok) return;
    setDashboard((await response.json()) as AdminDashboardResponse);
  }, []);

  useEffect(() => {
    localStorage.setItem("lang", language);
    localStorage.setItem("admin-section", activeSection);
    applyTheme(theme);
    void refreshSession();
  }, [activeSection, language, theme, refreshSession]);

  useEffect(() => {
    document.title = settings?.settings.siteTitle || copy.adminDashboard;
  }, [copy.adminDashboard, settings?.settings.siteTitle]);

  useEffect(() => {
    if (session.authenticated) {
      void refreshSettings();
      void refreshDashboard();
    }
  }, [refreshDashboard, refreshSettings, session.authenticated]);

  useEffect(() => {
    setEditableModels((current) => mergeModelDrafts(dashboard?.models ?? [], current));
  }, [dashboard]);

  useEffect(() => {
    if (!settings) return;

    setDurationUnits((current) => {
      const next = { ...current };
      for (const field of settingFields) {
        if (field.type !== "duration") continue;
        const valueMs = Number(settings.settings[field.key]);
        if (!Number.isFinite(valueMs)) continue;
        next[field.key] = current[field.key] ?? inferDurationUnit(valueMs);
      }
      return next;
    });
  }, [settingFields, settings]);

  async function login() {
    const response = await fetch(buildApiPath("/api/admin/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      await notifyErrorResponse(response);
      return;
    }
    setPassword("");
    await refreshSession();
  }

  async function logout() {
    await fetch(buildApiPath("/api/admin/logout"), { method: "POST", credentials: "include" });
    setSession({ authenticated: false, username: null });
    setSettings(null);
  }

  async function saveSettings() {
    if (!settings) return;
    const payload: UpdateAdminSettingsRequest = {
      ...settings.settings,
      upstreams: settings.upstreams.map((upstream) => ({
        id: upstream.id || undefined,
        name: upstream.name,
        group: upstream.group,
        apiBaseUrl: upstream.apiBaseUrl,
        modelsUrl: upstream.modelsUrl,
        isActive: upstream.isActive,
        apiKey: upstream.newApiKey || undefined,
      })),
    };
    const response = await fetch(buildApiPath("/api/admin/settings"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      await notifyErrorResponse(response);
      return;
    }
    const json = (await response.json()) as AdminSettingsResponse;
    setSettings({ ...json, upstreams: json.upstreams.map((upstream) => ({ ...upstream, newApiKey: "" })) });
    pushNotification("success", copy.saveSettings);
    announceDashboardRefresh("settings-saved");
    if (payload.upstreams?.some((upstream) => upstream.apiKey !== undefined)) {
      const syncResponse = await fetch(buildApiPath("/api/admin/actions/sync-models"), { method: "POST", credentials: "include" }).catch(() => null);
      if (!syncResponse) {
        pushNotification("error", requestFailedCopy);
        return;
      }
      if (!syncResponse.ok) {
        await notifyErrorResponse(syncResponse);
        return;
      }
      announceDashboardRefresh("models-synced");
      await refreshDashboard();
    }
  }

  function handleUpstreamChange<K extends keyof EditableUpstream>(index: number, field: K, value: EditableUpstream[K]) {
    setSettings((current) => {
      if (!current) return current;
      const nextUpstreams = [...current.upstreams] as EditableUpstream[];
      nextUpstreams[index] = { ...nextUpstreams[index], [field]: value };
      return { ...current, upstreams: nextUpstreams };
    });
  }

  function addUpstream() {
    setSettings((current) => {
      if (!current) return current;
      return {
        ...current,
        upstreams: [
          ...current.upstreams,
          {
            id: "",
            name: adminCopy.newUpstream,
            group: "default",
            apiBaseUrl: "https://api.example.com/v1",
            modelsUrl: "https://api.example.com/v1/models",
            isActive: true,
            apiKeyConfigured: false,
            apiKeyMasked: null,
            newApiKey: "",
          },
        ],
      };
    });
  }

  function removeUpstream(index: number) {
    setSettings((current) => {
      if (!current) return current;
      const nextUpstreams = [...current.upstreams];
      nextUpstreams.splice(index, 1);
      return { ...current, upstreams: nextUpstreams };
    });
  }

  function handleModelChange(upstreamId: string, modelId: string, field: "displayName" | "icon" | "sortOrder" | "isVisible", value: string | number | boolean | null) {
    setEditableModels((current) =>
      current.map((model) =>
        model.upstreamId === upstreamId && model.model === modelId ? { ...model, [field]: value } : model,
      ),
    );
  }

  function reorderModels(upstreamId: string, orderedModelIds: string[]) {
    setEditableModels((current) => {
      const nextSortOrder = new Map(orderedModelIds.map((modelId, index) => [modelId, index + 1]));
      return current.map((model) =>
        model.upstreamId === upstreamId && nextSortOrder.has(model.model)
          ? { ...model, sortOrder: nextSortOrder.get(model.model)! }
          : model,
      );
    });
  }

  async function saveModelSettings() {
    if (editableModels.length === 0) return;
    setIsSavingModels(true);
    try {
      const payload: UpdateAdminModelsRequest = {
        models: editableModels.map((model) => ({
          upstreamId: model.upstreamId,
          model: model.model,
          displayName: model.displayName,
          icon: model.icon,
          isVisible: model.isVisible,
          sortOrder: model.sortOrder,
        })),
      };
      const response = await fetch(buildApiPath("/api/admin/models"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        await notifyErrorResponse(response);
        return;
      }
      const json = (await response.json()) as AdminActionResponse;
      pushNotification("success", json.message);
      announceDashboardRefresh("models-updated");
      await refreshDashboard();
    } finally {
      setIsSavingModels(false);
    }
  }

  async function clearModelHistory(upstreamId: string, modelId: string) {
    const target = editableModels.find((model) => model.upstreamId === upstreamId && model.model === modelId);
    if (!target || target.probes === 0) {
      return;
    }

    if (!window.confirm(copy.clearModelHistoryConfirm)) {
      return;
    }

    const modelKey = getEditableModelKey(target);
    setClearingModelKey(modelKey);

    try {
      const payload: ClearModelHistoryRequest = {
        upstreamId,
        model: modelId,
      };
      const response = await fetch(buildApiPath("/api/admin/models/clear-history"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        await notifyErrorResponse(response);
        return;
      }

      const json = (await response.json()) as AdminActionResponse;
      pushNotification("success", json.message);
      await refreshDashboard();
      announceDashboardRefresh("model-history-cleared");
    } finally {
      setClearingModelKey(null);
    }
  }

  async function saveAccountSettings() {
    if (!currentPassword) {
      pushNotification("error", adminCopy.currentPasswordRequired);
      return;
    }

    if (!newPassword) {
      pushNotification("error", adminCopy.newPasswordRequired);
      return;
    }

    setIsSavingAccount(true);
    try {
      const payload: UpdateAdminAccountRequest = {
        currentPassword,
        newPassword,
      };

      const response = await fetch(buildApiPath("/api/admin/account"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        await notifyErrorResponse(response);
        return;
      }

      const json = (await response.json()) as AdminSessionResponse;
      setSession(json);
      setCurrentPassword("");
      setNewPassword("");
      pushNotification("success", adminCopy.accountUpdated);
    } finally {
      setIsSavingAccount(false);
    }
  }

  async function runAction(endpoint: string) {
    const response = await fetch(buildApiPath(endpoint), { method: "POST", credentials: "include" });
    if (!response.ok) {
      await notifyErrorResponse(response);
      return;
    }
    const json = (await response.json()) as AdminActionResponse;
    pushNotification("success", json.message);
    await refreshSettings();
    await refreshDashboard();
    announceDashboardRefresh(endpoint);
  }

  const sectionOptions = [
    { id: "overview" as const, label: adminCopy.overviewNav, description: adminCopy.overviewDesc, badge: dashboard ? String(dashboard.summary.totalModels) : undefined },
    { id: "models" as const, label: adminCopy.modelsNav, description: adminCopy.modelsDesc, badge: editableModels.length > 0 ? String(editableModels.length) : undefined },
    { id: "upstreams" as const, label: adminCopy.upstreamsNav, description: adminCopy.upstreamsDesc, badge: settings ? String(settings.upstreams.length) : undefined },
    { id: "runtime" as const, label: adminCopy.runtimeNav, description: adminCopy.runtimeDesc },
  ];
  const durationUnitOptions = copy.durationUnitOptions;
  const settingFieldByKey = useMemo(
    () => new Map(settingFields.map((field) => [field.key, field])),
    [settingFields],
  );
  const runtimeHighlights = useMemo(() => {
    if (!settings) {
      return [];
    }

    return [
      {
        label: settingFieldByKey.get("probeIntervalMs")?.label ?? "Probe Interval",
        value: formatDurationSummary(settings.settings.probeIntervalMs, copy),
      },
      {
        label: settingFieldByKey.get("probeTimeoutMs")?.label ?? "Probe Timeout",
        value: formatDurationSummary(settings.settings.probeTimeoutMs, copy),
      },
      {
        label: settingFieldByKey.get("probeConcurrency")?.label ?? "Max Probe Concurrency",
        value: `${settings.settings.probeConcurrency}x`,
      },
      {
        label: settingGroups.find((group) => group.id === "retries")?.title ?? "Retry Policy",
        value: `${copy.failedRetryShort} ${settings.settings.failedRetryAttempts} / ${copy.degradedRetryShort} ${settings.settings.degradedRetryAttempts}`,
      },
    ];
  }, [copy, settingFieldByKey, settingGroups, settings]);

  if (!session.authenticated) {
    return (
      <div className="min-h-screen px-4 py-6 font-sans md:px-6 md:py-8">
        <ToastRegion notices={notifications} onDismiss={dismissNotification} />
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[32px] border border-border bg-gradient-to-br from-surface via-surface to-accent/40 p-6 shadow-2xl shadow-black/10 md:p-8">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-success/10 blur-3xl" />
              <div className="absolute left-0 top-24 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
            </div>

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl space-y-3">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-background/80 text-textPrimary shadow-sm">
                    <ProjectIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-mono font-semibold tracking-tight text-textPrimary md:text-4xl">{copy.adminDashboard}</h1>
                    <p className="mt-2 text-sm text-textSecondary">{adminCopy.workspaceIntro}</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel w-full max-w-md rounded-[28px] border border-border p-6 shadow-lg shadow-black/5">
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setLanguage((prev) => (prev === "en" ? "zh-CN" : "en"))} className="glass-button flex h-10 w-10 items-center justify-center rounded-xl text-textSecondary hover:text-textPrimary" title={copy.toggleLanguage} aria-label={copy.toggleLanguage}>
                    <Languages size={16} />
                  </button>
                  <button type="button" onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))} className="glass-button flex h-10 w-10 items-center justify-center rounded-xl text-textSecondary hover:text-textPrimary" title={copy.toggleTheme} aria-label={copy.toggleTheme}>
                    {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </div>
                <div className="mt-5 space-y-4">
                  <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder={copy.username} className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-textPrimary" />
                  <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder={copy.password} type="password" className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-textPrimary" />
                  <button type="button" onClick={login} className="glass-button w-full rounded-xl px-4 py-2 font-mono text-sm">{copy.login}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 font-sans md:px-6 md:py-8 lg:px-8">
      <ToastRegion notices={notifications} onDismiss={dismissNotification} />
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-textPrimary">
        {adminCopy.skipToMain}
      </a>

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-[32px] border border-border bg-gradient-to-br from-surface via-surface to-accent/40 p-6 shadow-2xl shadow-black/10 md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-success/10 blur-3xl" />
            <div className="absolute left-0 top-24 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-background/80 text-textPrimary shadow-sm">
                  <ProjectIcon className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-mono font-semibold tracking-tight text-textPrimary md:text-4xl">{copy.adminDashboard}</h1>
                  <p className="mt-2 max-w-2xl text-sm text-textSecondary">
                    {adminCopy.workspaceIntro}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setLanguage((prev) => (prev === "en" ? "zh-CN" : "en"))} className="glass-button flex h-10 w-10 items-center justify-center rounded-xl text-textSecondary hover:text-textPrimary" title={copy.toggleLanguage} aria-label={copy.toggleLanguage}>
                <Languages size={16} />
              </button>
              <button type="button" onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))} className="glass-button flex h-10 w-10 items-center justify-center rounded-xl text-textSecondary hover:text-textPrimary" title={copy.toggleTheme} aria-label={copy.toggleTheme}>
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <a href={buildAppPath("/")} className="glass-button flex h-10 w-10 items-center justify-center rounded-xl text-textSecondary hover:text-textPrimary" title={copy.publicDashboard} aria-label={copy.publicDashboard}>
                <Monitor size={16} />
              </a>
              <button type="button" onClick={logout} className="glass-button flex h-10 w-10 items-center justify-center rounded-xl text-textSecondary hover:text-textPrimary" title={copy.logout} aria-label={copy.logout}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px,minmax(0,1fr)] lg:items-start">
          <aside className="glass-panel rounded-[28px] border border-border p-4 shadow-lg shadow-black/5 lg:sticky lg:top-6">
            <p className="px-3 text-[11px] font-mono uppercase tracking-[0.28em] text-textMuted">{adminCopy.navigation}</p>
            <nav className="mt-3 grid gap-2" aria-label="Admin sections">
              {sectionOptions.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                      isActive ? "border-accent bg-accent text-textPrimary shadow-lg shadow-accent/10" : "border-transparent bg-surface/50 text-textSecondary hover:border-border hover:text-textPrimary"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-sm">{section.label}</div>
                        <div className="mt-1 text-xs text-textMuted">{section.description}</div>
                      </div>
                      {section.badge ? <span className="rounded-full border border-border bg-background/70 px-2 py-1 text-[10px] font-mono text-textMuted">{section.badge}</span> : null}
                    </div>
                  </button>
                );
              })}
            </nav>

            {dashboard ? (
              <div className="mt-6 rounded-2xl border border-border bg-background/60 p-4">
                <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-textMuted">{adminCopy.liveSummary}</div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border bg-surface/70 px-3 py-3"><div className="text-[10px] font-mono uppercase text-textMuted">{adminCopy.modelsNav}</div><div className="mt-1 text-xl font-mono text-textPrimary">{dashboard.summary.totalModels}</div></div>
                  <div className="rounded-xl border border-border bg-surface/70 px-3 py-3"><div className="text-[10px] font-mono uppercase text-textMuted">{adminCopy.available}</div><div className="mt-1 text-xl font-mono text-success">{dashboard.summary.availableModels}</div></div>
                  <div className="rounded-xl border border-border bg-surface/70 px-3 py-3"><div className="text-[10px] font-mono uppercase text-textMuted">{adminCopy.degraded}</div><div className="mt-1 text-xl font-mono text-warning">{dashboard.summary.degradedModels}</div></div>
                  <div className="rounded-xl border border-border bg-surface/70 px-3 py-3"><div className="text-[10px] font-mono uppercase text-textMuted">{adminCopy.error}</div><div className="mt-1 text-xl font-mono text-error">{dashboard.summary.errorModels}</div></div>
                </div>
              </div>
            ) : null}
          </aside>

          <main id="admin-main" className="space-y-6">
            {activeSection === "overview" ? (
              <>
                <section className="glass-panel rounded-[28px] border border-border p-6 shadow-lg shadow-black/5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-mono text-textPrimary">{adminCopy.operatorActions}</h2>
                      <p className="mt-1 text-sm text-textSecondary">
                        {adminCopy.operatorActionsDesc}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => void runAction("/api/admin/actions/sync-models")} className="glass-button rounded-xl px-4 py-2 font-mono text-sm">{copy.syncModels}</button>
                      <button type="button" onClick={() => void runAction("/api/admin/actions/run-probes")} className="glass-button rounded-xl px-4 py-2 font-mono text-sm">{copy.runProbes}</button>
                    </div>
                  </div>
                </section>

                {dashboard ? (
                  <section className="glass-panel rounded-[28px] border border-border p-6 shadow-lg shadow-black/5">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-mono text-textPrimary">{copy.diagnostics}</h2>
                        <p className="mt-1 text-sm text-textSecondary">{adminCopy.diagnosticsDesc}</p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-border bg-surface/70 p-4"><div className="text-[11px] font-mono uppercase tracking-[0.22em] text-textMuted">{adminCopy.totalModels}</div><div className="mt-2 text-3xl font-mono text-textPrimary">{dashboard.summary.totalModels}</div></div>
                        <div className="rounded-2xl border border-border bg-surface/70 p-4"><div className="text-[11px] font-mono uppercase tracking-[0.22em] text-textMuted">{adminCopy.available}</div><div className="mt-2 text-3xl font-mono text-success">{dashboard.summary.availableModels}</div></div>
                        <div className="rounded-2xl border border-border bg-surface/70 p-4"><div className="text-[11px] font-mono uppercase tracking-[0.22em] text-textMuted">{adminCopy.degraded}</div><div className="mt-2 text-3xl font-mono text-warning">{dashboard.summary.degradedModels}</div></div>
                        <div className="rounded-2xl border border-border bg-surface/70 p-4"><div className="text-[11px] font-mono uppercase tracking-[0.22em] text-textMuted">{adminCopy.error}</div><div className="mt-2 text-3xl font-mono text-error">{dashboard.summary.errorModels}</div></div>
                      </div>

                      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr),minmax(0,1.1fr)]">
                        <div className="space-y-3">
                          <h3 className="text-sm font-mono uppercase tracking-[0.22em] text-textMuted">{copy.upstreams}</h3>
                          <div className="space-y-3">
                            {dashboard.upstreams?.map((upstream) => (
                              <div key={upstream.upstreamId} className="rounded-2xl border border-border bg-surface/70 px-4 py-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-mono text-textPrimary">{upstream.upstreamName}</div>
                                    <div className="mt-1 text-xs text-textMuted">{upstream.upstreamGroup}</div>
                                  </div>
                                  <div className={`rounded-full border px-3 py-1 text-xs font-mono ${
                                    upstream.availabilityPercentage > 95 ? "border-success/30 bg-success/10 text-success" :
                                    upstream.availabilityPercentage > 80 ? "border-warning/30 bg-warning/10 text-warning" :
                                    "border-error/30 bg-error/10 text-error"
                                  }`}>{upstream.availabilityPercentage.toFixed(1)}%</div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono text-textMuted">
                                  <span className="rounded-full border border-border px-2 py-1">{upstream.availableModels} {adminCopy.up}</span>
                                  <span className="rounded-full border border-border px-2 py-1">{upstream.degradedModels} {adminCopy.degraded}</span>
                                  <span className="rounded-full border border-border px-2 py-1">{upstream.errorModels} {adminCopy.down}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-sm font-mono uppercase tracking-[0.22em] text-textMuted">{copy.recentRuns}</h3>
                          <div className="max-h-[620px] space-y-3 overflow-auto pr-1">
                            {dashboard.recentProbes.slice(0, 20).map((probe) => (
                              <div key={probe.id} className="rounded-2xl border border-border bg-surface/70 px-4 py-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-mono text-textPrimary">{probe.model}</div>
                                    <div className="mt-1 text-xs text-textMuted">{probe.startedAt}</div>
                                  </div>
                                  <div className={`rounded-full border px-3 py-1 text-xs font-mono ${probe.success ? "border-success/30 bg-success/10 text-success" : "border-error/30 bg-error/10 text-error"}`}>{probe.success ? copy.success : copy.failure}</div>
                                </div>
                                <div className="mt-3 text-xs text-textSecondary">{copy.connectivity.toLowerCase()}: {probe.connectivityLatencyMs ?? "-"}ms / {copy.totalLatency.toLowerCase()}: {probe.totalLatencyMs}ms</div>
                                {probe.error ? <div className="mt-2 text-xs text-error">{probe.error}</div> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}

            {activeSection === "models" ? (
              <ModelManagerSection
                models={editableModels}
                isSaving={isSavingModels}
                clearingModelKey={clearingModelKey}
                onChange={handleModelChange}
                onReorder={reorderModels}
                onSave={() => void saveModelSettings()}
                onClearHistory={(upstreamId, modelId) => void clearModelHistory(upstreamId, modelId)}
                language={language}
              />
            ) : null}

            {activeSection === "upstreams" && settings ? (
              <section className="glass-panel rounded-[28px] border border-border p-6 shadow-lg shadow-black/5 space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-mono text-textPrimary">{copy.upstreams}</h2>
                    <p className="mt-1 text-sm text-textSecondary">{adminCopy.upstreamsSectionDesc}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={addUpstream} className="glass-button rounded-xl px-4 py-2 text-sm font-mono">{copy.addUpstream}</button>
                    <button type="button" onClick={saveSettings} className="glass-button rounded-xl px-4 py-2 text-sm font-mono">{copy.saveSettings}</button>
                  </div>
                </div>

                <div className="space-y-4">
                  {settings.upstreams.map((upstream, index) => (
                    <div key={upstream.id || index} className="rounded-2xl border border-border bg-surface/60 p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-mono text-lg text-textPrimary">{upstream.name || adminCopy.unnamedUpstream}</h3>
                          <div className="mt-1 text-xs text-textMuted">{upstream.group}</div>
                        </div>
                        <button type="button" onClick={() => removeUpstream(index)} className="text-xs font-mono text-error hover:underline">{copy.remove}</button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="space-y-1 text-sm text-textSecondary"><span className="font-mono text-xs uppercase">{copy.upstreamName}</span><input value={upstream.name} onChange={(event) => handleUpstreamChange(index, "name", event.target.value)} className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-textPrimary" /></label>
                        <label className="space-y-1 text-sm text-textSecondary"><span className="font-mono text-xs uppercase">{copy.group}</span><input value={upstream.group} onChange={(event) => handleUpstreamChange(index, "group", event.target.value)} className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-textPrimary" /></label>
                        <label className="space-y-1 text-sm text-textSecondary"><span className="font-mono text-xs uppercase">{copy.apiBaseUrl}</span><input value={upstream.apiBaseUrl} onChange={(event) => handleUpstreamChange(index, "apiBaseUrl", event.target.value)} className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-textPrimary" /></label>
                        <label className="space-y-1 text-sm text-textSecondary"><span className="font-mono text-xs uppercase">{copy.modelsUrl}</span><input value={upstream.modelsUrl} onChange={(event) => handleUpstreamChange(index, "modelsUrl", event.target.value)} className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-textPrimary" /></label>
                        <label className="space-y-1 text-sm text-textSecondary"><span className="font-mono text-xs uppercase">{`${adminCopy.apiKeyMaskedLabel} (${upstream.apiKeyMasked ?? adminCopy.none})`}</span><input value={upstream.newApiKey || ""} onChange={(event) => handleUpstreamChange(index, "newApiKey", event.target.value)} placeholder={copy.apiKeyReplace} className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-textPrimary" /></label>
                        <label className="flex items-center gap-2 self-end rounded-xl border border-border bg-background/70 px-3 py-3 text-sm text-textSecondary"><input type="checkbox" checked={upstream.isActive} onChange={(event) => handleUpstreamChange(index, "isActive", event.target.checked)} className="rounded border-border bg-surface text-accent focus:ring-accent" /><span>{copy.activeLabel}</span></label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {activeSection === "runtime" && settings ? (
              <section className="glass-panel rounded-[28px] border border-border p-6 shadow-lg shadow-black/5 space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-mono text-textPrimary">{copy.settings}</h2>
                    <p className="mt-1 text-sm text-textSecondary">{adminCopy.runtimeSectionDesc}</p>
                  </div>
                  <button type="button" onClick={saveSettings} className="glass-button rounded-xl px-4 py-2 text-sm font-mono">{copy.saveSettings}</button>
                </div>

                <section className="rounded-[26px] border border-border bg-surface/55 p-5 shadow-sm shadow-black/5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-lg font-mono text-textPrimary">{adminCopy.accountSecurity}</h3>
                      <p className="mt-1 text-sm text-textSecondary">{adminCopy.accountSecurityDesc}</p>
                      <p className="mt-2 text-xs text-textMuted">{adminCopy.passwordLeaveBlank}</p>
                    </div>
                    <button type="button" onClick={() => void saveAccountSettings()} className="glass-button rounded-xl px-4 py-2 text-sm font-mono" disabled={isSavingAccount}>
                      {adminCopy.saveAccount}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 rounded-2xl border border-border bg-background/70 p-4 text-sm text-textSecondary">
                      <div className="space-y-1">
                        <span className="font-mono text-xs uppercase">{adminCopy.currentPassword}</span>
                      </div>
                      <input
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        type="password"
                        className="w-full rounded-xl border border-border bg-surface/80 px-3 py-2 text-textPrimary"
                      />
                    </label>

                    <label className="space-y-2 rounded-2xl border border-border bg-background/70 p-4 text-sm text-textSecondary">
                      <div className="space-y-1">
                        <span className="font-mono text-xs uppercase">{adminCopy.newPassword}</span>
                      </div>
                      <input
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        type="password"
                        className="w-full rounded-xl border border-border bg-surface/80 px-3 py-2 text-textPrimary"
                      />
                    </label>
                  </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {runtimeHighlights.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border bg-background/60 px-4 py-4">
                      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-textMuted">{item.label}</div>
                      <div className="mt-2 text-2xl font-mono text-textPrimary">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {settingGroups.map((group) => (
                    <section key={group.id} className="rounded-[26px] border border-border bg-surface/55 p-5 shadow-sm shadow-black/5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-background/80 text-textPrimary">
                          {getSettingGroupIcon(group.id)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-mono text-textPrimary">{group.title}</h3>
                          <p className="mt-1 text-sm text-textSecondary">{group.description}</p>
                        </div>
                      </div>

                      <div className={`mt-4 grid gap-4 ${group.fields.length > 2 ? "md:grid-cols-2" : ""}`}>
                        {group.fields.map((field) => {
                          const value = settings.settings[field.key];
                          const durationUnit = field.type === "duration"
                            ? (durationUnits[field.key] ?? inferDurationUnit(Number(value)))
                            : null;

                          return (
                            <label key={field.key} className="space-y-2 rounded-2xl border border-border bg-background/70 p-4 text-sm text-textSecondary">
                              <div className="space-y-1">
                                <span className="font-mono text-xs uppercase">{field.label}</span>
                                <p className="text-xs text-textMuted">{field.description}</p>
                              </div>
                              {field.type === "duration" && durationUnit ? (
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step={field.step ?? "1"}
                                    value={String(formatDurationValue(Number(value), durationUnit))}
                                    onChange={(event) =>
                                      setSettings((current) =>
                                        current
                                          ? {
                                              ...current,
                                              settings: {
                                                ...current.settings,
                                                [field.key]: Math.max(0, Math.round(Number(event.target.value || "0") * DURATION_UNIT_FACTORS[durationUnit])),
                                              },
                                            }
                                          : current,
                                      )
                                    }
                                    className="w-full rounded-xl border border-border bg-surface/80 px-3 py-2 text-textPrimary"
                                  />
                                  <select
                                    value={durationUnit}
                                    onChange={(event) => setDurationUnits((current) => ({ ...current, [field.key]: event.target.value as DurationUnit }))}
                                    className="rounded-xl border border-border bg-surface/80 px-3 py-2 text-textPrimary"
                                  >
                                    {durationUnitOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : field.type === "boolean" ? (
                                <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/80 px-3 py-3 text-textPrimary">
                                  <span className="text-sm">{value ? adminCopy.on : adminCopy.off}</span>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(value)}
                                    onChange={(event) =>
                                      setSettings((current) =>
                                        current
                                          ? {
                                              ...current,
                                              settings: {
                                                ...current.settings,
                                                [field.key]: event.target.checked,
                                              },
                                            }
                                          : current,
                                      )
                                    }
                                    className="h-4 w-4 rounded border-border bg-background text-accent focus:ring-accent"
                                  />
                                </label>
                              ) : (
                                <input
                                  type={field.type}
                                  step={field.step}
                                  value={String(value)}
                                  onChange={(event) =>
                                    setSettings((current) =>
                                      current
                                        ? {
                                            ...current,
                                            settings: {
                                              ...current.settings,
                                              [field.key]: field.type === "number" ? Number(event.target.value || "0") : event.target.value,
                                            },
                                          }
                                        : current,
                                    )
                                  }
                                  className="w-full rounded-xl border border-border bg-surface/80 px-3 py-2 text-textPrimary"
                                />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
