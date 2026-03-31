import { describe, expect, it, vi } from "vitest";

import type { DbClient } from "../db";
import { getDashboardData, toPublicDashboardResponse } from "./dashboard";

describe("dashboard service", () => {
  it("aggregates probes for selected range", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const db: DbClient = {
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => [
        { id: "main", name: "Main", group: "default", apiBaseUrl: "https://ai.dooo.ng/v1", modelsUrl: "https://ai.dooo.ng/v1/models", apiKey: "key", isActive: true, updatedAt: now.toISOString() },
      ]),
      deactivateMissingUpstreams: vi.fn(),
      upsertModel: vi.fn(),
      listModels: vi.fn(() => [{ upstreamId: "main", id: "gpt-4.1", created: 1, ownedBy: "openai", displayName: "GPT 4.1", icon: "openai", isVisible: true, sortOrder: 5, syncedAt: now.toISOString(), isActive: true }]),
      updateModelMetadata: vi.fn(),
      deactivateMissingModels: vi.fn(),
      getSetting: vi.fn(() => null),
      setSetting: vi.fn(),
      listSettings: vi.fn(() => ({})),
      getAdminUserByUsername: vi.fn(() => null),
      getAdminUserById: vi.fn(() => null),
      createAdminUser: vi.fn(),
      updateAdminLogin: vi.fn(),
      createAdminSession: vi.fn(),
      getAdminSessionByTokenHash: vi.fn(() => null),
      touchAdminSession: vi.fn(),
      deleteAdminSession: vi.fn(),
      deleteExpiredAdminSessions: vi.fn(),
      insertProbe: vi.fn(() => 1),
      listProbesSince: vi.fn(() => [
        {
          id: 1,
          upstreamId: "main",
          upstreamName: "Main",
          model: "gpt-4.1",
          startedAt: "2026-01-01T11:30:00.000Z",
          completedAt: "2026-01-01T11:30:01.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 120,
          firstTokenLatencyMs: 260,
          totalLatencyMs: 1100,
          rawResponseText: "ok",
        },
        {
          id: 2,
          upstreamId: "main",
          upstreamName: "Main",
          model: "gpt-4.1",
          startedAt: "2026-01-01T11:35:00.000Z",
          completedAt: "2026-01-01T11:35:01.000Z",
          success: false,
          statusCode: 500,
          error: "upstream",
          connectivityLatencyMs: 150,
          firstTokenLatencyMs: null,
          totalLatencyMs: 900,
          rawResponseText: "error",
        },
      ]),
      listRecentProbes: vi.fn((limit: number) => {
        expect(limit).toBe(100);
        return [
          {
            id: 2,
            upstreamId: "main",
            upstreamName: "Main",
            model: "gpt-4.1",
            startedAt: "2026-01-01T11:35:00.000Z",
            completedAt: "2026-01-01T11:35:01.000Z",
            success: false,
            statusCode: 500,
            error: "upstream",
            connectivityLatencyMs: 150,
            firstTokenLatencyMs: null,
            totalLatencyMs: 900,
            rawResponseText: "error",
          },
        ];
      }),
      close: vi.fn(),
    };

    const config = {
      siteTitle: "Model Status",
      siteSubtitle: "subtitle",
      githubRepoUrl: "",
      probeIntervalMs: 120000,
      modelStatusUpScoreThreshold: 60,
      modelStatusDegradedScoreThreshold: 30,
    };

    const result = getDashboardData(db, "90m", config);

    expect(result.range).toBe("90m");
    expect(result.summary.totalModels).toBe(1);
    expect(result.summary.availableModels).toBe(0);
    expect(result.summary.degradedModels).toBe(0);
    expect(result.summary.errorModels).toBe(1);
    expect(result.summary.availabilityPercentage).toBe(50);
    expect(result.upstreams).toHaveLength(1);
    expect(result.nextProbeAt).toBeNull();
    expect(result.models).toHaveLength(1);
    expect(result.models[0]).toEqual(
      expect.objectContaining({
        model: "gpt-4.1",
        displayName: "GPT 4.1",
        icon: "openai",
        isVisible: true,
        sortOrder: 5,
        created: 1,
        ownedBy: "openai",
        probes: 2,
        successes: 1,
        failures: 1,
        availabilityPercentage: 50,
        avgConnectivityLatencyMs: 135,
        avgFirstTokenLatencyMs: 260,
        avgTotalLatencyMs: 1000,
        latestStatus: "down",
      }),
    );
    const recentStatuses = result.models[0]?.recentStatuses ?? [];
    expect(recentStatuses).toHaveLength(45);
    const successBucket = recentStatuses.find((status) => status.probeCount === 1 && status.successCount === 1);
    const failureBucket = recentStatuses.find((status) => status.probeCount === 1 && status.successCount === 0);
    expect(successBucket).toEqual(
      expect.objectContaining({
        probeCount: 1,
        successCount: 1,
        level: "up",
      }),
    );
    expect(failureBucket).toEqual(
      expect.objectContaining({
        probeCount: 1,
        successCount: 0,
        level: "down",
      }),
    );
    expect(getDashboardData(db, "24h", config).models[0]?.recentStatuses).toHaveLength(24);
    expect(getDashboardData(db, "7d", config).models[0]?.recentStatuses).toHaveLength(7);
    expect(getDashboardData(db, "30d", config).models[0]?.recentStatuses).toHaveLength(30);

    const hiddenDashboard = toPublicDashboardResponse({
      ...result,
      models: [
        { ...result.models[0]!, isVisible: true },
        { ...result.models[0]!, model: "hidden-model", displayName: "Hidden", isVisible: false },
      ],
    });
    expect(hiddenDashboard.models).toHaveLength(1);
    expect(hiddenDashboard.summary.totalModels).toBe(1);

    vi.useRealTimers();
  });
});
