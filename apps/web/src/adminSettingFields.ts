import type { AdminSettings } from "@model-status/shared";

import type { Language } from "./i18n";

export type SettingFieldConfig = {
  key: keyof AdminSettings;
  label: string;
  description: string;
  type: "text" | "number" | "duration" | "boolean";
  step?: string;
};

export type SettingGroupConfig = {
  id: "branding" | "scheduling" | "probe" | "retries" | "classification";
  title: string;
  description: string;
  note?: string;
  fields: SettingFieldConfig[];
};

export function getAdminSettingGroups(language: Language): SettingGroupConfig[] {
  if (language === "zh-CN") {
    return [
      {
        id: "branding",
        title: "\u7ad9\u70b9\u6807\u8bc6",
        description: "\u53ea\u7ef4\u62a4\u5c55\u793a\u7ed9\u8bbf\u5ba2\u7684\u6807\u9898\u4e0e\u526f\u6807\u9898\uff0c\u7248\u6743\u4ed3\u5e93\u94fe\u63a5\u4fdd\u6301\u4e3a\u5b98\u65b9\u56fa\u5b9a\u503c\u3002",
        note: "\u9875\u811a GitHub \u7248\u6743\u58f0\u660e\u5df2\u56fa\u5b9a\u5230\u5b98\u65b9\u9879\u76ee\u4ed3\u5e93\uff0c\u4e0d\u5728\u540e\u53f0\u63d0\u4f9b\u81ea\u5b9a\u4e49\u5165\u53e3\u3002",
        fields: [
          { key: "siteTitle", label: "\u7ad9\u70b9\u6807\u9898", description: "\u516c\u5171\u770b\u677f\u4e0e\u540e\u53f0\u5934\u90e8\u663e\u793a\u7684\u4e3b\u6807\u9898\u3002", type: "text" },
          { key: "siteSubtitle", label: "\u7ad9\u70b9\u526f\u6807\u9898", description: "\u4e3b\u6807\u9898\u4e0b\u65b9\u7684\u8bf4\u660e\u6587\u6848\u3002", type: "text" },
          { key: "showSummaryCards", label: "\u663e\u793a\u9876\u90e8\u6458\u8981\u5361\u7247", description: "\u63a7\u5236\u516c\u5171\u770b\u677f\u9996\u5c4f\u662f\u5426\u663e\u793a\u7edf\u8ba1\u5361\u7247\u3002", type: "boolean" },
        ],
      },
      {
        id: "scheduling",
        title: "\u8c03\u5ea6\u8282\u594f",
        description: "\u628a\u81ea\u52a8\u540c\u6b65\u548c\u81ea\u52a8\u63a2\u6d4b\u7684\u5468\u671f\u653e\u5728\u4e00\u8d77\uff0c\u4fbf\u4e8e\u7edf\u4e00\u8c03\u6574\u3002",
        fields: [
          { key: "probeIntervalMs", label: "\u63a2\u6d4b\u95f4\u9694", description: "\u81ea\u52a8\u63a2\u6d4b\u4efb\u52a1\u7684\u6267\u884c\u5468\u671f\u3002", type: "duration", step: "1" },
          { key: "catalogSyncIntervalMs", label: "\u540c\u6b65\u95f4\u9694", description: "\u81ea\u52a8\u540c\u6b65\u6a21\u578b\u76ee\u5f55\u7684\u5468\u671f\u3002", type: "duration", step: "1" },
        ],
      },
      {
        id: "probe",
        title: "\u63a2\u6d4b\u6267\u884c",
        description: "\u63a7\u5236\u5355\u6b21\u63a2\u6d4b\u7684\u8017\u65f6\u3001\u5e76\u53d1\u548c\u8bf7\u6c42\u8f7d\u8377\uff0c\u907f\u514d\u524d\u53f0\u770b\u8d77\u6765\u957f\u65f6\u95f4\u201c\u5728\u6d4b\u8bd5\u201d\u3002",
        fields: [
          { key: "probeTimeoutMs", label: "\u63a2\u6d4b\u8d85\u65f6", description: "\u5355\u4e2a\u6a21\u578b\u63a2\u6d4b\u8bf7\u6c42\u7684\u6700\u5927\u7b49\u5f85\u65f6\u95f4\u3002", type: "duration", step: "1" },
          { key: "probeConcurrency", label: "\u6700\u5927\u5e76\u53d1\u6570", description: "\u540c\u4e00\u8f6e\u63a2\u6d4b\u7684\u6700\u9ad8\u5e76\u53d1\u6570\u3002", type: "number", step: "1" },
          { key: "probeMaxTokens", label: "\u6700\u5927\u8f93\u51fa Token", description: "\u63a2\u6d4b\u8bf7\u6c42\u5141\u8bb8\u751f\u6210\u7684\u6700\u5927 token \u6570\u3002", type: "number", step: "1" },
          { key: "probeTemperature", label: "Temperature", description: "\u63a2\u6d4b\u8bf7\u6c42\u4f7f\u7528\u7684 temperature\u3002", type: "number", step: "0.1" },
        ],
      },
      {
        id: "retries",
        title: "\u91cd\u8bd5\u7b56\u7565",
        description: "\u628a\u964d\u7ea7\u91cd\u8bd5\u548c\u5931\u8d25\u91cd\u8bd5\u62c6\u5f00\uff0c\u65b9\u4fbf\u5355\u72ec\u63a7\u5236\u7a33\u5b9a\u6027\u4e0e\u603b\u8017\u65f6\u3002",
        fields: [
          { key: "degradedRetryAttempts", label: "\u964d\u7ea7\u91cd\u8bd5\u6b21\u6570", description: "\u7ed3\u679c\u843d\u5728\u964d\u7ea7\u533a\u95f4\u65f6\uff0c\u5355\u8f6e\u989d\u5916\u91cd\u8bd5\u7684\u6b21\u6570\u3002", type: "number", step: "1" },
          { key: "failedRetryAttempts", label: "\u5931\u8d25\u91cd\u8bd5\u6b21\u6570", description: "\u8d85\u65f6\u3001HTTP \u9519\u8bef\u6216\u6d41\u89e3\u6790\u5931\u8d25\u65f6\uff0c\u989d\u5916\u91cd\u8bd5\u7684\u6b21\u6570\u3002", type: "number", step: "1" },
        ],
      },
      {
        id: "classification",
        title: "\u72b6\u6001\u5206\u6863",
        description: "\u6307\u5b9a\u5f97\u5206\u5982\u4f55\u6620\u5c04\u4e3a\u6b63\u5e38\u3001\u964d\u7ea7\u6216\u9519\u8bef\u3002",
        fields: [
          { key: "modelStatusUpScoreThreshold", label: "\u6b63\u5e38\u9608\u503c", description: "\u5206\u6570\u9ad8\u4e8e\u7b49\u4e8e\u8be5\u503c\u65f6\u8ba4\u4e3a\u6b63\u5e38\u3002", type: "number", step: "1" },
          { key: "modelStatusDegradedScoreThreshold", label: "\u964d\u7ea7\u9608\u503c", description: "\u5206\u6570\u9ad8\u4e8e\u7b49\u4e8e\u8be5\u503c\u4e14\u4f4e\u4e8e\u6b63\u5e38\u9608\u503c\u65f6\u8ba4\u4e3a\u964d\u7ea7\u3002", type: "number", step: "1" },
        ],
      },
    ];
  }

  return [
    {
      id: "branding",
      title: "Branding",
      description: "Keep the public-facing identity here. The footer repository attribution stays pinned to the official project.",
      note: "The public GitHub attribution is fixed to the official repository and is no longer editable from admin settings.",
      fields: [
        { key: "siteTitle", label: "Site Title", description: "Primary title shown across public and admin surfaces.", type: "text" },
        { key: "siteSubtitle", label: "Site Subtitle", description: "Secondary copy shown beneath the title.", type: "text" },
        { key: "showSummaryCards", label: "Show Summary Cards", description: "Toggle the public dashboard KPI cards beneath the hero.", type: "boolean" },
      ],
    },
    {
      id: "scheduling",
      title: "Scheduling",
      description: "Control how often the catalog syncs and how often automated probes run.",
      fields: [
        { key: "probeIntervalMs", label: "Probe Interval", description: "Cadence for automated probe runs.", type: "duration", step: "1" },
        { key: "catalogSyncIntervalMs", label: "Catalog Sync Interval", description: "Cadence for automated catalog sync.", type: "duration", step: "1" },
      ],
    },
    {
      id: "probe",
      title: "Probe Execution",
      description: "Tune the shape of each probe so cycles stay fast enough for operators and gentle enough for upstreams.",
      fields: [
        { key: "probeTimeoutMs", label: "Probe Timeout", description: "Timeout for a single model probe request.", type: "duration", step: "1" },
        { key: "probeConcurrency", label: "Max Probe Concurrency", description: "Upper bound for simultaneous probes to avoid flooding upstreams.", type: "number", step: "1" },
        { key: "probeMaxTokens", label: "Max Probe Tokens", description: "Maximum completion tokens allowed during probing.", type: "number", step: "1" },
        { key: "probeTemperature", label: "Probe Temperature", description: "Temperature used for probe requests.", type: "number", step: "0.1" },
      ],
    },
    {
      id: "retries",
      title: "Retry Policy",
      description: "Separate degraded retries from hard-failure retries so you can balance signal quality against total cycle time.",
      fields: [
        { key: "degradedRetryAttempts", label: "Degraded Retry Attempts", description: "Extra retries when a successful result still lands in the degraded score band.", type: "number", step: "1" },
        { key: "failedRetryAttempts", label: "Failed Retry Attempts", description: "Extra retries after timeouts, HTTP failures, or invalid completion streams.", type: "number", step: "1" },
      ],
    },
    {
      id: "classification",
      title: "Status Thresholds",
      description: "Define how probe scores map into up, degraded, and down states.",
      fields: [
        { key: "modelStatusUpScoreThreshold", label: "Up Threshold", description: "Scores at or above this threshold count as healthy.", type: "number", step: "1" },
        { key: "modelStatusDegradedScoreThreshold", label: "Degraded Threshold", description: "Scores at or above this threshold but below the up threshold count as degraded.", type: "number", step: "1" },
      ],
    },
  ];
}
