import { type AdminDashboardResponse, type DashboardRange, type DashboardResponse, rangeStartIso } from "@model-status/shared";

import type { DbClient, ModelRecord, ProbeRecord } from "../db";

type DashboardScoreConfig = {
  modelStatusUpScoreThreshold: number;
  modelStatusDegradedScoreThreshold: number;
};

type DashboardMetaConfig = DashboardScoreConfig & {
  siteTitle: string;
  siteSubtitle: string;
  showSummaryCards: boolean;
  probeIntervalMs: number;
};

const RANGE_BUCKET_COUNT: Record<DashboardRange, number> = {
  "90m": 90,
  "24h": 24,
  "7d": 7,
  "30d": 30,
};

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(2));
}

function aggregateAvailability(models: Array<{ successes: number; probes: number }>): number {
  const successes = models.reduce((sum, model) => sum + model.successes, 0);
  const probes = models.reduce((sum, model) => sum + model.probes, 0);
  return percentage(successes, probes);
}

function scoreProbe(probe: ProbeRecord): number {
  if (!probe.success) {
    return 0;
  }

  const connectivityPenalty = Math.min(probe.connectivityLatencyMs ?? 1500, 1500) / 1500;
  const totalPenalty = Math.min(probe.totalLatencyMs, 5000) / 5000;
  const blendedPenalty = connectivityPenalty * 0.55 + totalPenalty * 0.45;
  return Math.max(0, Math.round((1 - blendedPenalty) * 100));
}

function isSuccessfulProbe(probe: ProbeRecord, config: DashboardScoreConfig): boolean {
  return scoreProbe(probe) >= config.modelStatusUpScoreThreshold;
}

function classifyBucket(score: number | null, config: DashboardScoreConfig): "up" | "degraded" | "down" | "empty" {
  if (score === null) {
    return "empty";
  }

  if (score >= config.modelStatusUpScoreThreshold) {
    return "up";
  }

  if (score >= config.modelStatusDegradedScoreThreshold) {
    return "degraded";
  }

  return "down";
}

function buildProbeSample(probe: ProbeRecord, config: DashboardMetaConfig) {
  const score = scoreProbe(probe);

  return {
    id: `${probe.upstreamId}:${probe.model}:${probe.startedAt}`,
    startedAt: probe.startedAt,
    endedAt: probe.completedAt,
    score,
    level: classifyBucket(score, config),
    probeCount: 1,
    successCount: isSuccessfulProbe(probe, config) ? 1 : 0,
    avgConnectivityLatencyMs: probe.connectivityLatencyMs,
    avgTotalLatencyMs: probe.totalLatencyMs,
  };
}

function buildEmptySample(id: string, startedAt: string, endedAt: string) {
  return {
    id,
    startedAt,
    endedAt,
    score: null,
    level: "empty" as const,
    probeCount: 0,
    successCount: 0,
    avgConnectivityLatencyMs: null,
    avgTotalLatencyMs: null,
  };
}

function buildRecentStatuses(range: DashboardRange, probes: ProbeRecord[], toDate: Date, config: DashboardMetaConfig) {
  const fromMs = Date.parse(rangeStartIso(range, toDate));
  const toMs = toDate.getTime();
  const bucketCount = range === "90m"
    ? Math.max(1, Math.min(RANGE_BUCKET_COUNT[range], Math.ceil((90 * 60 * 1000) / config.probeIntervalMs)))
    : RANGE_BUCKET_COUNT[range];

  if (range === "90m") {
    const sortedProbes = [...probes]
      .filter((probe) => {
        const probeMs = Date.parse(probe.startedAt);
        return probeMs >= fromMs && probeMs <= toMs;
      })
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
    const recentProbeSamples = sortedProbes.slice(-bucketCount).map((probe) => buildProbeSample(probe, config));

    if (recentProbeSamples.length >= bucketCount) {
      return recentProbeSamples;
    }

    const missingCount = bucketCount - recentProbeSamples.length;
    const padding = Array.from({ length: missingCount }, (_, index) => {
      const bucketStartMs = fromMs + index * config.probeIntervalMs;
      const bucketEndMs = Math.min(bucketStartMs + config.probeIntervalMs, toMs);
      return buildEmptySample(
        `${range}-empty-${bucketStartMs}`,
        new Date(bucketStartMs).toISOString(),
        new Date(bucketEndMs).toISOString(),
      );
    });

    return [...padding, ...recentProbeSamples];
  }

  const bucketMs = Math.max(1, Math.floor((toMs - fromMs) / bucketCount));

  return Array.from({ length: bucketCount }, (_, index) => {
    const bucketStartMs = fromMs + index * bucketMs;
    const bucketEndMs = index === bucketCount - 1 ? toMs : bucketStartMs + bucketMs;
    const bucketProbes = probes.filter((probe) => {
      const probeMs = Date.parse(probe.startedAt);
      return probeMs >= bucketStartMs && probeMs < bucketEndMs;
    });
    const scores = bucketProbes.map(scoreProbe);
    const score = scores.length > 0 ? average(scores) : null;
    const connectivity = bucketProbes
      .map((probe) => probe.connectivityLatencyMs)
      .filter((value): value is number => value !== null);
    const total = bucketProbes.map((probe) => probe.totalLatencyMs);

    return {
      id: `${range}-${bucketStartMs}`,
      startedAt: new Date(bucketStartMs).toISOString(),
      endedAt: new Date(bucketEndMs).toISOString(),
      score,
      level: classifyBucket(score, config),
      probeCount: bucketProbes.length,
      successCount: bucketProbes.filter((probe) => isSuccessfulProbe(probe, config)).length,
      avgConnectivityLatencyMs: average(connectivity),
      avgTotalLatencyMs: average(total),
    };
  });
}

function summarizeModel(modelRecord: ModelRecord, upstreamName: string, upstreamGroup: string, probes: ProbeRecord[], range: DashboardRange, toDate: Date, config: DashboardMetaConfig) {
  const successes = probes.filter((probe) => isSuccessfulProbe(probe, config)).length;
  const failures = probes.length - successes;
  const connectivity = probes
    .map((probe) => probe.connectivityLatencyMs)
    .filter((value): value is number => value !== null);
  const firstToken = probes
    .map((probe) => probe.firstTokenLatencyMs)
    .filter((value): value is number => value !== null);
  const total = probes.map((probe) => probe.totalLatencyMs);
  const sortedByStartedAt = [...probes].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const recentStatuses = buildRecentStatuses(range, probes, toDate, config);
  const latestStatus = [...recentStatuses].reverse().find((status) => status.level !== "empty")?.level ?? "empty";
  const availabilityPercentage = percentage(successes, probes.length);

  return {
    upstreamId: modelRecord.upstreamId,
    upstreamName,
    upstreamGroup,
    model: modelRecord.id,
    displayName: modelRecord.displayName,
    icon: modelRecord.icon,
    isVisible: modelRecord.isVisible,
    sortOrder: modelRecord.sortOrder,
    created: modelRecord.created,
    ownedBy: modelRecord.ownedBy,
    probes: probes.length,
    successes,
    failures,
    availabilityPercentage,
    avgConnectivityLatencyMs: average(connectivity),
    avgFirstTokenLatencyMs: average(firstToken),
    avgTotalLatencyMs: average(total),
    lastProbeAt: sortedByStartedAt[0]?.startedAt ?? null,
    latestStatus,
    recentStatuses,
  };
}

export function getDashboardData(
  db: DbClient,
  range: DashboardRange,
  config: DashboardMetaConfig,
): AdminDashboardResponse {
  const toDate = new Date();
  const fromIso = rangeStartIso(range, toDate);
  const probes = db.listProbesSince(fromIso);
  const models = db.listModels();
  const upstreams = db.listUpstreams(true);
  const upstreamById = new Map(upstreams.map((upstream) => [upstream.id, upstream]));
  const byModel = new Map<string, ProbeRecord[]>();

  for (const probe of probes) {
    const key = `${probe.upstreamId}::${probe.model}`;
    const list = byModel.get(key) ?? [];
    list.push(probe);
    byModel.set(key, list);
  }

  const modelSummaries = models
    .map((model) =>
        summarizeModel(
          model,
          upstreamById.get(model.upstreamId)?.name ?? model.upstreamId,
          upstreamById.get(model.upstreamId)?.group ?? "default",
          byModel.get(`${model.upstreamId}::${model.id}`) ?? [],
          range,
          toDate,
          config,
      ),
    )
    .sort((left, right) => {
      const upstreamComparison = `${left.upstreamGroup}/${left.upstreamName}`.localeCompare(`${right.upstreamGroup}/${right.upstreamName}`);
      if (upstreamComparison !== 0) {
        return upstreamComparison;
      }

      const orderComparison = left.sortOrder - right.sortOrder;
      if (orderComparison !== 0) {
        return orderComparison;
      }

      const leftLabel = (left.displayName ?? left.model).toLowerCase();
      const rightLabel = (right.displayName ?? right.model).toLowerCase();
      const labelComparison = leftLabel.localeCompare(rightLabel);
      if (labelComparison !== 0) {
        return labelComparison;
      }

      return left.model.localeCompare(right.model);
    });

  const upstreamSummaries = upstreams.map((upstream) => {
    const subset = modelSummaries.filter((model) => model.upstreamId === upstream.id);
    const availableModels = subset.filter((model) => model.latestStatus === "up").length;
    const degradedModels = subset.filter((model) => model.latestStatus === "degraded").length;
    const errorModels = subset.filter((model) => model.latestStatus === "down").length;

    return {
      upstreamId: upstream.id,
      upstreamName: upstream.name,
      upstreamGroup: upstream.group,
      totalModels: subset.length,
      availableModels,
      degradedModels,
      errorModels,
      availabilityPercentage: aggregateAvailability(subset),
    };
  });
  const availableModels = modelSummaries.filter((model) => model.latestStatus === "up").length;
  const degradedModels = modelSummaries.filter((model) => model.latestStatus === "degraded").length;
  const errorModels = modelSummaries.filter((model) => model.latestStatus === "down").length;
  const availabilityPercentage = aggregateAvailability(modelSummaries);

  return {
    range,
    from: fromIso,
    to: toDate.toISOString(),
    nextProbeAt: null,
    siteTitle: config.siteTitle,
    siteSubtitle: config.siteSubtitle,
    showSummaryCards: config.showSummaryCards,
    summary: {
      totalModels: models.length,
      availableModels,
      degradedModels,
      errorModels,
      availabilityPercentage,
    },
    models: modelSummaries,
    upstreams: upstreamSummaries,
    recentProbes: db.listRecentProbes(100).filter((probe) => probe.startedAt >= fromIso),
  };
}

export function toPublicDashboardResponse(dashboard: AdminDashboardResponse): DashboardResponse {
  const visibleModels = dashboard.models.filter((model) => model.isVisible);
  const availableModels = visibleModels.filter((model) => model.latestStatus === "up").length;
  const degradedModels = visibleModels.filter((model) => model.latestStatus === "degraded").length;
  const errorModels = visibleModels.filter((model) => model.latestStatus === "down").length;
  const availabilityPercentage = aggregateAvailability(visibleModels);

  return {
    range: dashboard.range,
    from: dashboard.from,
    to: dashboard.to,
    nextProbeAt: dashboard.nextProbeAt,
    siteTitle: dashboard.siteTitle,
    siteSubtitle: dashboard.siteSubtitle,
    showSummaryCards: dashboard.showSummaryCards,
    summary: {
      totalModels: visibleModels.length,
      availableModels,
      degradedModels,
      errorModels,
      availabilityPercentage,
    },
    models: visibleModels,
  };
}
