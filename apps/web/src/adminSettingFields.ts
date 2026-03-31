import type { AdminSettings } from "@model-status/shared";

import type { Language } from "./i18n";

type SettingFieldConfig = {
  key: keyof AdminSettings;
  label: string;
  description: string;
  type: "text" | "number";
  step?: string;
};

export function getAdminSettingFields(language: Language): SettingFieldConfig[] {
  if (language === "zh-CN") {
    return [
      { key: "siteTitle", label: "站点标题", description: "前台和后台展示的主标题。", type: "text" },
      { key: "siteSubtitle", label: "站点副标题", description: "显示在标题下方的简介文案。", type: "text" },
      { key: "githubRepoUrl", label: "仓库地址", description: "前台页脚使用的仓库链接。", type: "text" },
      { key: "probeIntervalMs", label: "探测间隔（毫秒）", description: "自动探测任务的执行周期。", type: "number", step: "1000" },
      { key: "catalogSyncIntervalMs", label: "同步间隔（毫秒）", description: "自动同步模型目录的周期。", type: "number", step: "1000" },
      { key: "probeTimeoutMs", label: "探测超时（毫秒）", description: "单个模型探测请求的超时时间。", type: "number", step: "1000" },
      { key: "probeConcurrency", label: "最大并发数", description: "同一轮探测允许的最高并发，防止同时压上游。", type: "number", step: "1" },
      { key: "probeMaxTokens", label: "最大输出 Token", description: "探测请求允许生成的最大 token 数。", type: "number", step: "1" },
      { key: "probeTemperature", label: "Temperature", description: "探测请求使用的 temperature。", type: "number", step: "0.1" },
      { key: "degradedRetryAttempts", label: "降级重试次数", description: "命中降级时，单轮额外重试的次数。", type: "number", step: "1" },
      { key: "modelStatusUpScoreThreshold", label: "正常阈值", description: "高于该分数时归类为正常。", type: "number", step: "1" },
      { key: "modelStatusDegradedScoreThreshold", label: "降级阈值", description: "高于该分数且低于正常阈值时归类为降级。", type: "number", step: "1" },
    ];
  }

  return [
    { key: "siteTitle", label: "Site Title", description: "Primary title shown across public and admin surfaces.", type: "text" },
    { key: "siteSubtitle", label: "Site Subtitle", description: "Secondary copy shown beneath the title.", type: "text" },
    { key: "githubRepoUrl", label: "Repository URL", description: "Repository link used in the public footer.", type: "text" },
    { key: "probeIntervalMs", label: "Probe Interval (ms)", description: "Cadence for automated probe runs.", type: "number", step: "1000" },
    { key: "catalogSyncIntervalMs", label: "Catalog Sync Interval (ms)", description: "Cadence for automated catalog sync.", type: "number", step: "1000" },
    { key: "probeTimeoutMs", label: "Probe Timeout (ms)", description: "Timeout for a single model probe request.", type: "number", step: "1000" },
    { key: "probeConcurrency", label: "Max Probe Concurrency", description: "Upper bound for simultaneous probes to avoid flooding upstreams.", type: "number", step: "1" },
    { key: "probeMaxTokens", label: "Max Probe Tokens", description: "Maximum completion tokens allowed during probing.", type: "number", step: "1" },
    { key: "probeTemperature", label: "Probe Temperature", description: "Temperature used for probe requests.", type: "number", step: "0.1" },
    { key: "degradedRetryAttempts", label: "Degraded Retry Attempts", description: "Extra retries within one probe cycle when a result looks degraded.", type: "number", step: "1" },
    { key: "modelStatusUpScoreThreshold", label: "Up Threshold", description: "Scores above this threshold count as healthy.", type: "number", step: "1" },
    { key: "modelStatusDegradedScoreThreshold", label: "Degraded Threshold", description: "Scores above this threshold but below the up threshold count as degraded.", type: "number", step: "1" },
  ];
}
