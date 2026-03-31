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
      showSummaryCards: true,
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
    expect(result.showSummaryCards).toBe(true);
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

  it("keeps 90m samples contiguous instead of inserting empty gaps between recent probes", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const db: DbClient = {
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => [
        { id: "main", name: "Main", group: "default", apiBaseUrl: "https://example.com/v1", modelsUrl: "https://example.com/v1/models", apiKey: "key", isActive: true, updatedAt: now.toISOString() },
      ]),
      deactivateMissingUpstreams: vi.fn(),
      upsertModel: vi.fn(),
      listModels: vi.fn(() => [{ upstreamId: "main", id: "gpt-5-codex", created: 1, ownedBy: "openai", displayName: "GPT-5 Codex", icon: "codex", isVisible: true, sortOrder: 1, syncedAt: now.toISOString(), isActive: true }]),
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
          model: "gpt-5-codex",
          startedAt: "2026-01-01T10:35:00.000Z",
          completedAt: "2026-01-01T10:35:01.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 100,
          firstTokenLatencyMs: 200,
          totalLatencyMs: 900,
          rawResponseText: "ok",
        },
        {
          id: 2,
          upstreamId: "main",
          upstreamName: "Main",
          model: "gpt-5-codex",
          startedAt: "2026-01-01T10:40:00.000Z",
          completedAt: "2026-01-01T10:40:01.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 110,
          firstTokenLatencyMs: 210,
          totalLatencyMs: 910,
          rawResponseText: "ok",
        },
        {
          id: 3,
          upstreamId: "main",
          upstreamName: "Main",
          model: "gpt-5-codex",
          startedAt: "2026-01-01T10:50:00.000Z",
          completedAt: "2026-01-01T10:50:01.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 120,
          firstTokenLatencyMs: 220,
          totalLatencyMs: 920,
          rawResponseText: "ok",
        },
        {
          id: 4,
          upstreamId: "main",
          upstreamName: "Main",
          model: "gpt-5-codex",
          startedAt: "2026-01-01T10:55:00.000Z",
          completedAt: "2026-01-01T10:55:01.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 130,
          firstTokenLatencyMs: 230,
          totalLatencyMs: 930,
          rawResponseText: "ok",
        },
        {
          id: 5,
          upstreamId: "main",
          upstreamName: "Main",
          model: "gpt-5-codex",
          startedAt: "2026-01-01T11:00:00.000Z",
          completedAt: "2026-01-01T11:00:01.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 140,
          firstTokenLatencyMs: 240,
          totalLatencyMs: 940,
          rawResponseText: "ok",
        },
      ]),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    const config = {
      siteTitle: "Model Status",
      siteSubtitle: "subtitle",
      showSummaryCards: true,
      probeIntervalMs: 5 * 60 * 1000,
      modelStatusUpScoreThreshold: 60,
      modelStatusDegradedScoreThreshold: 30,
    };

    const recentStatuses = getDashboardData(db, "90m", config).models[0]?.recentStatuses ?? [];
    const firstRealIndex = recentStatuses.findIndex((status) => status.level !== "empty");

    expect(recentStatuses).toHaveLength(18);
    expect(firstRealIndex).toBeGreaterThanOrEqual(0);
    expect(recentStatuses.slice(firstRealIndex).every((status) => status.level !== "empty")).toBe(true);

    vi.useRealTimers();
  });

  it("uses weighted probe totals for summary availability across all ranges", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const db: DbClient = {
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => [
        { id: "main", name: "Main", group: "default", apiBaseUrl: "https://example.com/v1", modelsUrl: "https://example.com/v1/models", apiKey: "key", isActive: true, updatedAt: now.toISOString() },
      ]),
      deactivateMissingUpstreams: vi.fn(),
      upsertModel: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "model-a", created: 1, ownedBy: "openai", displayName: "Model A", icon: "openai", isVisible: true, sortOrder: 1, syncedAt: now.toISOString(), isActive: true },
        { upstreamId: "main", id: "model-b", created: 2, ownedBy: "openai", displayName: "Model B", icon: "openai", isVisible: true, sortOrder: 2, syncedAt: now.toISOString(), isActive: true },
        { upstreamId: "main", id: "model-hidden", created: 3, ownedBy: "openai", displayName: "Hidden", icon: "openai", isVisible: false, sortOrder: 3, syncedAt: now.toISOString(), isActive: true },
      ]),
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
          model: "model-a",
          startedAt: "2026-01-01T11:10:00.000Z",
          completedAt: "2026-01-01T11:10:01.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 100,
          firstTokenLatencyMs: 200,
          totalLatencyMs: 900,
          rawResponseText: "ok",
        },
        {
          id: 2,
          upstreamId: "main",
          upstreamName: "Main",
          model: "model-a",
          startedAt: "2026-01-01T11:20:00.000Z",
          completedAt: "2026-01-01T11:20:01.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 110,
          firstTokenLatencyMs: 210,
          totalLatencyMs: 910,
          rawResponseText: "ok",
        },
        {
          id: 3,
          upstreamId: "main",
          upstreamName: "Main",
          model: "model-a",
          startedAt: "2026-01-01T11:30:00.000Z",
          completedAt: "2026-01-01T11:30:01.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 120,
          firstTokenLatencyMs: 220,
          totalLatencyMs: 920,
          rawResponseText: "ok",
        },
        {
          id: 4,
          upstreamId: "main",
          upstreamName: "Main",
          model: "model-a",
          startedAt: "2026-01-01T11:40:00.000Z",
          completedAt: "2026-01-01T11:40:01.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 130,
          firstTokenLatencyMs: 230,
          totalLatencyMs: 930,
          rawResponseText: "ok",
        },
        {
          id: 5,
          upstreamId: "main",
          upstreamName: "Main",
          model: "model-b",
          startedAt: "2026-01-01T11:50:00.000Z",
          completedAt: "2026-01-01T11:50:01.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 140,
          firstTokenLatencyMs: 240,
          totalLatencyMs: 940,
          rawResponseText: "ok",
        },
        {
          id: 6,
          upstreamId: "main",
          upstreamName: "Main",
          model: "model-b",
          startedAt: "2026-01-01T11:55:00.000Z",
          completedAt: "2026-01-01T11:55:01.000Z",
          success: false,
          statusCode: 500,
          error: "upstream",
          connectivityLatencyMs: 150,
          firstTokenLatencyMs: null,
          totalLatencyMs: 950,
          rawResponseText: "error",
        },
        {
          id: 7,
          upstreamId: "main",
          upstreamName: "Main",
          model: "model-hidden",
          startedAt: "2026-01-01T11:45:00.000Z",
          completedAt: "2026-01-01T11:45:01.000Z",
          success: false,
          statusCode: 500,
          error: "upstream",
          connectivityLatencyMs: 160,
          firstTokenLatencyMs: null,
          totalLatencyMs: 960,
          rawResponseText: "error",
        },
        {
          id: 8,
          upstreamId: "main",
          upstreamName: "Main",
          model: "model-hidden",
          startedAt: "2026-01-01T11:46:00.000Z",
          completedAt: "2026-01-01T11:46:01.000Z",
          success: false,
          statusCode: 500,
          error: "upstream",
          connectivityLatencyMs: 170,
          firstTokenLatencyMs: null,
          totalLatencyMs: 970,
          rawResponseText: "error",
        },
      ]),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    const config = {
      siteTitle: "Model Status",
      siteSubtitle: "subtitle",
      showSummaryCards: true,
      probeIntervalMs: 300000,
      modelStatusUpScoreThreshold: 60,
      modelStatusDegradedScoreThreshold: 30,
    };

    const adminDashboard = getDashboardData(db, "90m", config);
    expect(adminDashboard.summary.availabilityPercentage).toBe(62.5);
    expect(adminDashboard.upstreams[0]?.availabilityPercentage).toBe(62.5);

    const publicDashboard = toPublicDashboardResponse(adminDashboard);
    expect(publicDashboard.summary.availabilityPercentage).toBe(83.33);

    vi.useRealTimers();
  });

  it("treats successful but down-scored probes as failed availability", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const db: DbClient = {
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => [
        { id: "main", name: "Main", group: "default", apiBaseUrl: "https://example.com/v1", modelsUrl: "https://example.com/v1/models", apiKey: "key", isActive: true, updatedAt: now.toISOString() },
      ]),
      deactivateMissingUpstreams: vi.fn(),
      upsertModel: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "slow-model", created: 1, ownedBy: "openai", displayName: "Slow Model", icon: "openai", isVisible: true, sortOrder: 1, syncedAt: now.toISOString(), isActive: true },
      ]),
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
          model: "slow-model",
          startedAt: "2026-01-01T11:30:00.000Z",
          completedAt: "2026-01-01T11:30:05.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 2100,
          firstTokenLatencyMs: 2600,
          totalLatencyMs: 5000,
          rawResponseText: "ok",
        },
      ]),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    const config = {
      siteTitle: "Model Status",
      siteSubtitle: "subtitle",
      showSummaryCards: true,
      probeIntervalMs: 300000,
      modelStatusUpScoreThreshold: 60,
      modelStatusDegradedScoreThreshold: 30,
    };

    const result = getDashboardData(db, "90m", config);

    expect(result.models[0]).toEqual(
      expect.objectContaining({
        successes: 0,
        failures: 1,
        availabilityPercentage: 0,
        latestStatus: "down",
      }),
    );
    expect(result.summary.availabilityPercentage).toBe(0);
    expect(result.models[0]?.recentStatuses.find((status) => status.probeCount === 1)?.successCount).toBe(0);

    vi.useRealTimers();
  });

  it("does not count degraded yellow probes as success rate wins", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const db: DbClient = {
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => [
        { id: "main", name: "Main", group: "default", apiBaseUrl: "https://example.com/v1", modelsUrl: "https://example.com/v1/models", apiKey: "key", isActive: true, updatedAt: now.toISOString() },
      ]),
      deactivateMissingUpstreams: vi.fn(),
      upsertModel: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "degraded-model", created: 1, ownedBy: "openai", displayName: "Degraded Model", icon: "openai", isVisible: true, sortOrder: 1, syncedAt: now.toISOString(), isActive: true },
      ]),
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
          model: "degraded-model",
          startedAt: "2026-01-01T11:30:00.000Z",
          completedAt: "2026-01-01T11:30:03.000Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 900,
          firstTokenLatencyMs: 1500,
          totalLatencyMs: 2500,
          rawResponseText: "ok",
        },
      ]),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    const config = {
      siteTitle: "Model Status",
      siteSubtitle: "subtitle",
      showSummaryCards: true,
      probeIntervalMs: 300000,
      modelStatusUpScoreThreshold: 60,
      modelStatusDegradedScoreThreshold: 30,
    };

    const result = getDashboardData(db, "90m", config);

    expect(result.models[0]).toEqual(
      expect.objectContaining({
        successes: 0,
        failures: 1,
        availabilityPercentage: 0,
        latestStatus: "degraded",
      }),
    );
    expect(result.summary.availabilityPercentage).toBe(0);
    expect(result.models[0]?.recentStatuses.find((status) => status.probeCount === 1)?.successCount).toBe(0);

    vi.useRealTimers();
  });
});
