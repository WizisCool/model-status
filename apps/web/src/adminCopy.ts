import type { Language } from "./i18n";

export type AdminCopy = {
  controlSurface: string;
  workspaceIntro: string;
  navigation: string;
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
  diagnosticsDesc: string;
  totalModels: string;
  available: string;
  degraded: string;
  error: string;
  up: string;
  down: string;
  emptyStatus: string;
  modelsSectionTitle: string;
  modelsSectionSubtitle: string;
  saveModelSettings: string;
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
};

const adminCopyByLanguage: Record<Language, AdminCopy> = {
  en: {
    controlSurface: "Control Surface",
    workspaceIntro: "Configure upstream connections, tune probing behavior, and control how the public dashboard is presented.",
    navigation: "Navigation",
    skipToMain: "Skip to main content",
    operator: "Operator",
    liveSummary: "Live Summary",
    modelsNav: "Models",
    overviewNav: "Overview",
    upstreamsNav: "Upstreams",
    runtimeNav: "Settings",
    overviewDesc: "Diagnostics, runs, and operator actions",
    modelsDesc: "Names, colorful icons, and drag sorting",
    upstreamsDesc: "Routes, groups, and credentials",
    runtimeDesc: "Probe and sync parameters",
    operatorActions: "Operator Actions",
    operatorActionsDesc: "Run syncs or probes immediately and review the result without leaving the dashboard.",
    diagnosticsDesc: "Inspect upstream health, model quality, and the latest probe activity in one place.",
    totalModels: "Total Models",
    available: "Available",
    degraded: "Degraded",
    error: "Error",
    up: "Up",
    down: "Down",
    emptyStatus: "Empty",
    modelsSectionTitle: "Model Library",
    modelsSectionSubtitle: "Manage model naming, colorful icons, and ordering in a compact, drag-friendly layout.",
    saveModelSettings: "Save Model Settings",
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
    upstreamsSectionDesc: "Manage upstream routes, grouping, credentials, and activation.",
    runtimeSectionDesc: "Tune sync cadence, concurrency, retries, and score thresholds.",
    modelCountSuffix: "models",
    unnamedUpstream: "Unnamed Upstream",
    newUpstream: "New Upstream",
    none: "None",
    on: "On",
    off: "Off",
    apiKeyMaskedLabel: "API Key",
  },
  "zh-CN": {
    controlSurface: "控制台",
    workspaceIntro: "配置上游连接、调整探测行为，并控制公共看板的展示方式。",
    navigation: "导航",
    skipToMain: "跳到主要内容",
    operator: "操作员",
    liveSummary: "实时摘要",
    modelsNav: "模型",
    overviewNav: "概览",
    upstreamsNav: "上游",
    runtimeNav: "设置",
    overviewDesc: "诊断、运行与操作入口",
    modelsDesc: "名称、彩色图标与拖动排序",
    upstreamsDesc: "路由、分组与凭据",
    runtimeDesc: "探测与同步参数",
    operatorActions: "操作面板",
    operatorActionsDesc: "手动触发模型同步与探测，并在当前界面立即查看结果。",
    diagnosticsDesc: "把状态、上游质量与最近探测记录集中展示在一个区域里。",
    totalModels: "模型总数",
    available: "可用",
    degraded: "降级",
    error: "错误",
    up: "正常",
    down: "异常",
    emptyStatus: "无数据",
    modelsSectionTitle: "模型库",
    modelsSectionSubtitle: "用更紧凑、适合拖动的布局管理模型名称、图标和排序。",
    saveModelSettings: "保存模型设置",
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
  },
};

export function getAdminCopy(language: Language): AdminCopy {
  return adminCopyByLanguage[language];
}
