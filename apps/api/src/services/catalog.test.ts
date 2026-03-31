import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DbClient } from "../db";
import { syncModelCatalog } from "./catalog";
import type { RuntimeSettings } from "./settings";

describe("catalog service", () => {
  const db: DbClient = {
    upsertModel: vi.fn(),
    upsertUpstream: vi.fn(),
    listUpstreams: vi.fn(() => []),
    deactivateMissingUpstreams: vi.fn(),
    listModels: vi.fn(() => []),
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
    listProbesSince: vi.fn(() => []),
    listRecentProbes: vi.fn(() => []),
    close: vi.fn(),
  };

  const settings: RuntimeSettings = {
    siteTitle: "Model Status",
    siteSubtitle: "subtitle",
    showSummaryCards: true,
    probeIntervalMs: 1000,
    catalogSyncIntervalMs: 1000,
    probeTimeoutMs: 1000,
    probeConcurrency: 1,
    probeMaxTokens: 4,
    probeTemperature: 0,
    degradedRetryAttempts: 1,
    failedRetryAttempts: 0,
    modelStatusUpScoreThreshold: 60,
    modelStatusDegradedScoreThreshold: 30,
    upstreams: [
      {
        id: "main",
        name: "Main",
        group: "default",
        apiBaseUrl: "https://ai.dooo.ng/v1",
        modelsUrl: "https://ai.dooo.ng/v1/models",
        apiKey: "test-key",
        isActive: true,
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(db.upsertModel).mockClear();
  });

  it("fetches models and upserts each entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: [
              { id: "gpt-4.1", created: 1, owned_by: "openai" },
              { id: "gpt-4.1-mini", created: 2, owned_by: "openai" },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await syncModelCatalog(settings, db);

    expect(result.totalFetched).toBe(2);
    expect(result.upserted).toBe(2);
    expect(db.upsertModel).toHaveBeenCalledTimes(2);
    expect(db.deactivateMissingModels).toHaveBeenCalledWith("main", ["gpt-4.1", "gpt-4.1-mini"], result.syncedAt);
    expect(db.upsertModel).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ upstreamId: "main", id: "gpt-4.1", created: 1, ownedBy: "openai", isActive: true }),
    );
  });

  it("throws when upstream returns an error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad", { status: 500 })));

    await expect(syncModelCatalog(settings, db)).rejects.toThrow("Models sync failed for upstream Main: HTTP 500");
  });

  it("includes fetch failures in the upstream error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("connect ECONNREFUSED");
    }));

    await expect(syncModelCatalog(settings, db)).rejects.toThrow(
      "Models sync failed for upstream Main: connect ECONNREFUSED",
    );
  });

  it("deduplicates model ids before upserting and deactivating", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: [
              { id: "gpt-4.1", created: 1, owned_by: "openai" },
              { id: "gpt-4.1", created: 1, owned_by: "openai" },
              { id: "gpt-4.1-mini", created: 2, owned_by: "openai" },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await syncModelCatalog(settings, db);

    expect(result.totalFetched).toBe(2);
    expect(db.upsertModel).toHaveBeenCalledTimes(2);
    expect(db.deactivateMissingModels).toHaveBeenCalledWith("main", ["gpt-4.1", "gpt-4.1-mini"], result.syncedAt);
  });

  it("syncs across multiple upstreams", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn(async () => new Response(JSON.stringify({ data: [{ id: "gpt-4.1", created: 1, owned_by: "openai" }] }), { status: 200 }))
        .mockImplementationOnce(async () => new Response(JSON.stringify({ data: [{ id: "gpt-4.1", created: 1, owned_by: "openai" }] }), { status: 200 }))
        .mockImplementationOnce(async () => new Response(JSON.stringify({ data: [{ id: "claude-3.5", created: 1, owned_by: "anthropic" }] }), { status: 200 })),
    );

    const result = await syncModelCatalog(
      {
        ...settings,
        upstreams: [
          settings.upstreams[0]!,
          {
            id: "secondary",
            name: "Secondary",
            group: "backup",
            apiBaseUrl: "https://example.com/v1",
            modelsUrl: "https://example.com/v1/models",
            apiKey: "another-key",
            isActive: true,
          },
        ],
      },
      db,
    );

    expect(result.totalFetched).toBe(2);
    expect(db.deactivateMissingModels).toHaveBeenCalledWith("main", ["gpt-4.1"], result.syncedAt);
    expect(db.deactivateMissingModels).toHaveBeenCalledWith("secondary", ["claude-3.5"], result.syncedAt);
  });
});
