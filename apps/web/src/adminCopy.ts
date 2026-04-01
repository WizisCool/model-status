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

export type DurationUnitOption = {
  value: "seconds" | "minutes" | "hours";
  label: string;
};

export type AdminCopy = {
  controlSurface: string;
  workspaceIntro: string;
  navigation: string;
  navigationAriaLabel: string;
  skipToMain: string;
  operator: string;
  liveSummary: string;
  modelsNav: string;
  overviewNav: string;
  upstreamsNav: string;
  runtimeNav: string;
  overviewDesc: string;
  modelsDesc: string;
  upstreamsDesc: string;
  runtimeDesc: string;
  operatorActions: string;
  operatorActionsDesc: string;
  diagnostics: string;
  diagnosticsDesc: string;
  upstreams: string;
  totalModels: string;
  available: string;
  degraded: string;
  error: string;
  up: string;
  down: string;
  emptyStatus: string;
  success: string;
  failure: string;
  connectivity: string;
  totalLatency: string;
  publicDashboard: string;
  adminDashboard: string;
  login: string;
  logout: string;
  username: string;
  password: string;
  toggleLanguage: string;
  toggleTheme: string;
  syncModels: string;
  runProbes: string;
  settings: string;
  saveSettings: string;
  accountSecurity: string;
  accountSecurityDesc: string;
  currentPassword: string;
  newPassword: string;
  passwordLeaveBlank: string;
  saveAccount: string;
  accountUpdated: string;
  currentPasswordRequired: string;
  newPasswordRequired: string;
  accountNoChanges: string;
  unauthorized: string;
  requestFailed: string;
  modelHealth: string;
  recentRuns: string;
  modelsSectionTitle: string;
  modelsSectionSubtitle: string;
  saveModelSettings: string;
  clearModelHistory: string;
  clearingModelHistory: string;
  clearModelHistoryConfirm: string;
  probeHistoryRecords: string;
  noManageableModels: string;
  order: string;
  displayName: string;
  displayNamePlaceholder: string;
  modelId: string;
  provider: string;
  icon: string;
  auto: string;
  dropHint: string;
  chooseIcon: string;
  hideIconOptions: string;
  showIconOptions: string;
  visible: string;
  hidden: string;
  upstreamsSectionDesc: string;
  runtimeSectionDesc: string;
  modelCountSuffix: string;
  unnamedUpstream: string;
  newUpstream: string;
  none: string;
  on: string;
  off: string;
  apiKeyMaskedLabel: string;
  activeLabel: string;
  addUpstream: string;
  remove: string;
  group: string;
  upstreamName: string;
  apiBaseUrl: string;
  modelsUrl: string;
  apiKeyReplace: string;
  closeIconPicker: string;
  dragModel: string;
  hideModelFromDashboard: string;
  showModelOnDashboard: string;
  durationSummaryHours: string;
  durationSummaryMinutes: string;
  durationSummarySeconds: string;
  failedRetryShort: string;
  degradedRetryShort: string;
  durationUnitOptions: DurationUnitOption[];
  settingGroups: SettingGroupConfig[];
};

const adminCopyByLanguage: Record<Language, AdminCopy> = {
  en: {
    controlSurface: "Console",
    workspaceIntro: "Management console for Model Status.",
    navigation: "Navigation",
    navigationAriaLabel: "Admin sections",
    skipToMain: "Skip to main content",
    operator: "Operator",
    liveSummary: "Summary",
    modelsNav: "Models",
    overviewNav: "Overview",
    upstreamsNav: "Upstreams",
    runtimeNav: "Settings",
    overviewDesc: "Diagnostics and actions",
    modelsDesc: "Manage models",
    upstreamsDesc: "Configure upstreams",
    runtimeDesc: "System settings",
    operatorActions: "Actions",
    operatorActionsDesc: "Run model syncs and probes manually.",
    diagnostics: "Diagnostics",
    diagnosticsDesc: "Status, upstream quality, and recent probe history.",
    upstreams: "Upstreams",
    totalModels: "Total Models",
    available: "Available",
    degraded: "Degraded",
    error: "Error",
    up: "Up",
    down: "Down",
    emptyStatus: "Empty",
    success: "Success",
    failure: "Failure",
    connectivity: "Connectivity",
    totalLatency: "Total Latency",
    publicDashboard: "Public Dashboard",
    adminDashboard: "Admin Dashboard",
    login: "Login",
    logout: "Log out",
    username: "Username",
    password: "Password",
    toggleLanguage: "Toggle language",
    toggleTheme: "Toggle theme",
    syncModels: "Sync Models",
    runProbes: "Run Probes",
    settings: "Settings",
    saveSettings: "Save Settings",
    accountSecurity: "Account Security",
    accountSecurityDesc: "Update the current admin password.",
    currentPassword: "Current Password",
    newPassword: "New Password",
    passwordLeaveBlank: "Enter the current password and a new password to update credentials.",
    saveAccount: "Save Account",
    accountUpdated: "Account updated",
    currentPasswordRequired: "Current password is required",
    newPasswordRequired: "New password is required",
    accountNoChanges: "No password changes to save",
    unauthorized: "Unauthorized",
    requestFailed: "Request failed",
    modelHealth: "Model health",
    recentRuns: "Recent runs",
    modelsSectionTitle: "Model Library",
    modelsSectionSubtitle: "Manage model names, icons, and ordering.",
    saveModelSettings: "Save Model Settings",
    clearModelHistory: "Clear History",
    clearingModelHistory: "Clearing...",
    clearModelHistoryConfirm: "Clear all stored probe history for this model? This cannot be undone.",
    probeHistoryRecords: "probe records",
    noManageableModels: "No models are available to manage yet.",
    order: "Order",
    displayName: "Display Name",
    displayNamePlaceholder: "Custom display name",
    modelId: "Model ID",
    provider: "Provider",
    icon: "Icon",
    auto: "Auto",
    dropHint: "Drop here to move to the end",
    chooseIcon: "Choose icon",
    hideIconOptions: "Hide icon options",
    showIconOptions: "Show icon options",
    visible: "Visible",
    hidden: "Hidden",
    upstreamsSectionDesc: "Manage upstream URLs, groups, API keys, and activation state.",
    runtimeSectionDesc: "Adjust sync cadence, concurrency, retry policy, and score thresholds.",
    modelCountSuffix: "models",
    unnamedUpstream: "Unnamed Upstream",
    newUpstream: "New Upstream",
    none: "None",
    on: "On",
    off: "Off",
    apiKeyMaskedLabel: "API Key",
    activeLabel: "Active (Sync & Probe)",
    addUpstream: "Add Upstream",
    remove: "Remove",
    group: "Group",
    upstreamName: "Name",
    apiBaseUrl: "API Base URL",
    modelsUrl: "Models URL",
    apiKeyReplace: "Replace API key",
    closeIconPicker: "Close icon picker",
    dragModel: "Drag",
    hideModelFromDashboard: "Hide model from public dashboard",
    showModelOnDashboard: "Show model on public dashboard",
    durationSummaryHours: "hr",
    durationSummaryMinutes: "min",
    durationSummarySeconds: "sec",
    failedRetryShort: "fail",
    degradedRetryShort: "degr",
    durationUnitOptions: [
      { value: "seconds", label: "sec" },
      { value: "minutes", label: "min" },
      { value: "hours", label: "hr" },
    ],
    settingGroups: [
      {
        id: "branding",
        title: "Branding",
        description: "Configure the public title, subtitle, and summary cards.",
        fields: [
          { key: "siteTitle", label: "Site Title", description: "Primary title shown on public and admin pages.", type: "text" },
          { key: "siteSubtitle", label: "Site Subtitle", description: "Short supporting text displayed under the title.", type: "text" },
          { key: "showSummaryCards", label: "Show Summary Cards", description: "Show or hide the public dashboard summary cards.", type: "boolean" },
        ],
      },
      {
        id: "scheduling",
        title: "Scheduling",
        description: "Control how often sync and probe jobs run.",
        fields: [
          { key: "probeIntervalMs", label: "Probe Interval", description: "Run interval for automated probe cycles.", type: "duration", step: "1" },
          { key: "catalogSyncIntervalMs", label: "Catalog Sync Interval", description: "Run interval for automatic catalog sync.", type: "duration", step: "1" },
        ],
      },
      {
        id: "probe",
        title: "Probe Execution",
        description: "Tune timeout, concurrency, and request shape.",
        fields: [
          { key: "probeTimeoutMs", label: "Probe Timeout", description: "Timeout for a single model probe request.", type: "duration", step: "1" },
          { key: "probeConcurrency", label: "Probe Concurrency", description: "Maximum number of probe requests running at the same time.", type: "number", step: "1" },
          { key: "probeMaxTokens", label: "Probe Max Tokens", description: "Maximum completion tokens allowed during probing.", type: "number", step: "1" },
          { key: "probeTemperature", label: "Probe Temperature", description: "Temperature used for probe requests.", type: "number", step: "0.1" },
        ],
      },
      {
        id: "retries",
        title: "Retry Policy",
        description: "Configure retry behavior for degraded and failed results.",
        fields: [
          { key: "degradedRetryAttempts", label: "Degraded Retry Attempts", description: "Extra retries when a result lands in the degraded band.", type: "number", step: "1" },
          { key: "failedRetryAttempts", label: "Failed Retry Attempts", description: "Extra retries after timeouts, HTTP failures, or invalid streams.", type: "number", step: "1" },
        ],
      },
      {
        id: "classification",
        title: "Status Thresholds",
        description: "Map probe scores to up, degraded, and down states.",
        fields: [
          { key: "modelStatusUpScoreThreshold", label: "Up Threshold", description: "Scores at or above this threshold count as healthy.", type: "number", step: "1" },
          { key: "modelStatusDegradedScoreThreshold", label: "Degraded Threshold", description: "Scores at or above this threshold but below the up threshold count as degraded.", type: "number", step: "1" },
        ],
      },
    ],
  },
  "zh-CN": {
    controlSurface: "控制台",
    workspaceIntro: "Model Status 的管理面板。",
    navigation: "导航",
    navigationAriaLabel: "后台分区",
    skipToMain: "跳到主要内容",
    operator: "操作员",
    liveSummary: "实时摘要",
    modelsNav: "模型",
    overviewNav: "概览",
    upstreamsNav: "上游",
    runtimeNav: "设置",
    overviewDesc: "诊断与操作",
    modelsDesc: "管理模型",
    upstreamsDesc: "配置上游",
    runtimeDesc: "系统配置参数",
    operatorActions: "操作面板",
    operatorActionsDesc: "手动触发模型同步与探测。",
    diagnostics: "诊断信息",
    diagnosticsDesc: "状态、上游质量与最近探测记录。",
    upstreams: "上游",
    totalModels: "模型总数",
    available: "可用",
    degraded: "降级",
    error: "错误",
    up: "正常",
    down: "异常",
    emptyStatus: "无数据",
    success: "成功",
    failure: "失败",
    connectivity: "连通延迟",
    totalLatency: "总耗时",
    publicDashboard: "前台面板",
    adminDashboard: "后台控制台",
    login: "登录",
    logout: "退出登录",
    username: "用户名",
    password: "密码",
    toggleLanguage: "切换语言",
    toggleTheme: "切换主题",
    syncModels: "同步模型",
    runProbes: "立即探测",
    settings: "设置",
    saveSettings: "保存设置",
    accountSecurity: "账号安全",
    accountSecurityDesc: "修改当前管理员密码。",
    currentPassword: "当前密码",
    newPassword: "新密码",
    passwordLeaveBlank: "输入当前密码和新密码即可更新凭据。",
    saveAccount: "保存账号",
    accountUpdated: "账号已更新",
    currentPasswordRequired: "请输入当前密码",
    newPasswordRequired: "请输入新密码",
    accountNoChanges: "没有需要保存的密码变更",
    unauthorized: "未授权",
    requestFailed: "请求失败",
    modelHealth: "模型健康",
    recentRuns: "最近运行",
    modelsSectionTitle: "模型库",
    modelsSectionSubtitle: "管理模型名称、图标和排序。",
    saveModelSettings: "保存模型设置",
    clearModelHistory: "清除历史",
    clearingModelHistory: "清除中...",
    clearModelHistoryConfirm: "要清除这个模型的全部探测历史吗？此操作不可撤销。",
    probeHistoryRecords: "条探测记录",
    noManageableModels: "当前还没有可管理的模型。",
    order: "顺序",
    displayName: "显示名称",
    displayNamePlaceholder: "自定义显示名称",
    modelId: "模型 ID",
    provider: "提供方",
    icon: "图标",
    auto: "自动",
    dropHint: "拖到这里可移动到最后",
    chooseIcon: "选择图标",
    hideIconOptions: "收起图标",
    showIconOptions: "展开图标",
    visible: "可见",
    hidden: "隐藏",
    upstreamsSectionDesc: "管理上游地址、分组、密钥与启用状态。",
    runtimeSectionDesc: "调整同步周期、并发数、重试策略与评分阈值。",
    modelCountSuffix: "个模型",
    unnamedUpstream: "未命名上游",
    newUpstream: "新上游",
    none: "无",
    on: "开启",
    off: "关闭",
    apiKeyMaskedLabel: "API Key",
    activeLabel: "启用（同步与探测）",
    addUpstream: "添加上游",
    remove: "移除",
    group: "分组",
    upstreamName: "名称",
    apiBaseUrl: "API 基础地址",
    modelsUrl: "模型列表地址",
    apiKeyReplace: "替换 API 密钥",
    closeIconPicker: "关闭图标选择",
    dragModel: "拖动",
    hideModelFromDashboard: "从前台隐藏模型",
    showModelOnDashboard: "在前台显示模型",
    durationSummaryHours: "时",
    durationSummaryMinutes: "分",
    durationSummarySeconds: "秒",
    failedRetryShort: "失败",
    degradedRetryShort: "降级",
    durationUnitOptions: [
      { value: "seconds", label: "秒" },
      { value: "minutes", label: "分" },
      { value: "hours", label: "时" },
    ],
    settingGroups: [
      {
        id: "branding",
        title: "站点标识",
        description: "设置标题、副标题和摘要卡片开关。",
        fields: [
          { key: "siteTitle", label: "站点标题", description: "公共看板的主标题。", type: "text" },
          { key: "siteSubtitle", label: "站点副标题", description: "主标题下方的说明文案。", type: "text" },
          { key: "showSummaryCards", label: "显示顶部摘要卡片", description: "控制公共看板首页是否显示统计卡片。", type: "boolean" },
        ],
      },
      {
        id: "scheduling",
        title: "调度周期",
        description: "调整同步模型和探测任务的执行周期。",
        fields: [
          { key: "probeIntervalMs", label: "探测间隔", description: "自动探测任务的执行周期。", type: "duration", step: "1" },
          { key: "catalogSyncIntervalMs", label: "同步间隔", description: "自动同步模型目录的周期。", type: "duration", step: "1" },
        ],
      },
      {
        id: "probe",
        title: "探测执行",
        description: "控制单次探测的超时、并发和请求载荷。",
        fields: [
          { key: "probeTimeoutMs", label: "探测超时", description: "单个模型探测请求的最大等待时间。", type: "duration", step: "1" },
          { key: "probeConcurrency", label: "探测并发数", description: "同一轮探测同时运行的最大请求数。", type: "number", step: "1" },
          { key: "probeMaxTokens", label: "最大输出 Token", description: "探测请求允许生成的最大 token 数。", type: "number", step: "1" },
          { key: "probeTemperature", label: "Temperature", description: "探测请求使用的 temperature。", type: "number", step: "0.1" },
        ],
      },
      {
        id: "retries",
        title: "重试策略",
        description: "分别控制降级结果和失败结果的重试行为。",
        fields: [
          { key: "degradedRetryAttempts", label: "降级重试次数", description: "结果落在降级区间时，单轮额外重试的次数。", type: "number", step: "1" },
          { key: "failedRetryAttempts", label: "失败重试次数", description: "超时、HTTP 错误或流解析失败时，额外重试的次数。", type: "number", step: "1" },
        ],
      },
      {
        id: "classification",
        title: "状态分档",
        description: "指定分数如何映射为正常、降级或错误。",
        fields: [
          { key: "modelStatusUpScoreThreshold", label: "正常阈值", description: "分数高于等于该值时认为正常。", type: "number", step: "1" },
          { key: "modelStatusDegradedScoreThreshold", label: "降级阈值", description: "分数高于等于该值且低于正常阈值时认为降级。", type: "number", step: "1" },
        ],
      },
    ],
  },
};

export function getAdminCopy(language: Language): AdminCopy {
  return adminCopyByLanguage[language];
}
