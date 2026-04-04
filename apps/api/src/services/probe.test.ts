import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "../db";
import type { RuntimeSettings } from "./settings";

import { __probeTestUtils, probeAllModels } from "./probe";

const baseConfig: RuntimeSettings = {
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

describe("probe helpers", () => {
  it("marks OpenAI-compatible chunk payloads as parseable", () => {
    expect(
      __probeTestUtils.isParseableCompletionPayload({
        choices: [{ delta: { content: "ok" } }],
      }),
    ).toBe(true);
  });

  it("extracts content from delta payloads", () => {
    expect(
      __probeTestUtils.extractContent({
        choices: [{ delta: { content: "ok" } }],
      }),
    ).toBe("ok");
  });

  it("extracts content from reasoning-first delta payloads", () => {
    expect(
      __probeTestUtils.extractContent({
        choices: [{ delta: { reasoning: "thinking" } }],
      }),
    ).toBe("thinking");
  });

  it("keeps incomplete SSE fragments in the remainder buffer", () => {
    const result = __probeTestUtils.parseSsePayloads(
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"par',
    );

    expect(result.payloads).toEqual(['{"choices":[{"delta":{"content":"ok"}}]}']);
    expect(result.remainder).toBe('data: {"choices":[{"delta":{"content":"par');
  });

  it("marks an empty 200 stream as a failed probe", async () => {
    const db: DbClient = {
      upsertModel: vi.fn(),
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => []),
      deactivateMissingUpstreams: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "gpt-empty", created: null, ownedBy: null, displayName: null, icon: null, isVisible: true, sortOrder: 0, syncedAt: new Date().toISOString(), isActive: true },
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
      listProbesSince: vi.fn(() => []),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(new ReadableStream({ start(controller) { controller.close(); } }), { status: 200 }),
      ),
    );

    const [result] = await probeAllModels(baseConfig, db);

    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Expected a probe result for the empty-stream test");
    }

    expect(result.success).toBe(false);
    expect(result.error).toContain("parseable completion payload");
  });

  it("keeps a valid content-bearing stream as a successful probe", async () => {
    const db: DbClient = {
      upsertModel: vi.fn(),
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => []),
      deactivateMissingUpstreams: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "gpt-ok", created: null, ownedBy: null, displayName: null, icon: null, isVisible: true, sortOrder: 0, syncedAt: new Date().toISOString(), isActive: true },
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
      listProbesSince: vi.fn(() => []),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n' + 'data: [DONE]\n\n',
                ),
              );
              controller.close();
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const [result] = await probeAllModels(baseConfig, db);

    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Expected a probe result for the valid-stream test");
    }

    expect(result.success).toBe(true);
    expect(result.firstTokenLatencyMs).toBeTypeOf("number");
  });

  it("keeps a reasoning-only stream as a successful probe", async () => {
    const db: DbClient = {
      upsertModel: vi.fn(),
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => []),
      deactivateMissingUpstreams: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "gpt-reasoning", created: null, ownedBy: null, displayName: null, icon: null, isVisible: true, sortOrder: 0, syncedAt: new Date().toISOString(), isActive: true },
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
      listProbesSince: vi.fn(() => []),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  'data: {"choices":[{"delta":{"reasoning":"thinking"}}]}\n\n' + 'data: [DONE]\n\n',
                ),
              );
              controller.close();
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const [result] = await probeAllModels(baseConfig, db);

    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Expected a probe result for the reasoning-only stream test");
    }

    expect(result.success).toBe(true);
    expect(result.firstTokenLatencyMs).toBeTypeOf("number");
  });

  it("accepts a non-SSE json completion payload from upstream", async () => {
    const db: DbClient = {
      upsertModel: vi.fn(),
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => []),
      deactivateMissingUpstreams: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "gpt-json", created: null, ownedBy: null, displayName: null, icon: null, isVisible: true, sortOrder: 0, syncedAt: new Date().toISOString(), isActive: true },
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
      listProbesSince: vi.fn(() => []),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          '{"choices":[{"message":{"role":"assistant","content":"ok"},"finish_reason":"stop"}]}',
          { status: 200, headers: { "content-type": "text/event-stream" } },
        ),
      ),
    );

    const [result] = await probeAllModels(baseConfig, db);

    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Expected a probe result for the non-SSE json test");
    }

    expect(result.success).toBe(true);
  });

  it("turns stream read errors into failed probe results instead of throwing", async () => {
    const db: DbClient = {
      upsertModel: vi.fn(),
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => []),
      deactivateMissingUpstreams: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "gpt-stream-error", created: null, ownedBy: null, displayName: null, icon: null, isVisible: true, sortOrder: 0, syncedAt: new Date().toISOString(), isActive: true },
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
      listProbesSince: vi.fn(() => []),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error("stream read timeout"));
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const [result] = await probeAllModels(baseConfig, db);

    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Expected a probe result for the stream-error test");
    }

    expect(result.success).toBe(false);
    expect(result.error).toContain("stream read timeout");
    expect(db.insertProbe).toHaveBeenCalledTimes(1);
  });

  it("retries degraded probes within one cycle and stores best result", async () => {
    const db: DbClient = {
      upsertModel: vi.fn(),
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => []),
      deactivateMissingUpstreams: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "gpt-retry", created: null, ownedBy: null, displayName: null, icon: null, isVisible: true, sortOrder: 0, syncedAt: new Date().toISOString(), isActive: true },
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
      listProbesSince: vi.fn(() => []),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    const first = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"o"}}]}\n\n' + 'data: [DONE]\n\n'));
          controller.close();
        },
      }),
      { status: 200 },
    );
    const second = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n' + 'data: [DONE]\n\n'));
          controller.close();
        },
      }),
      { status: 200 },
    );

    vi.stubGlobal(
      "fetch",
      vi
        .fn(async () => first)
        .mockImplementationOnce(async () => first)
        .mockImplementationOnce(async () => second),
    );

    const [result] = await probeAllModels({ ...baseConfig, degradedRetryAttempts: 2 }, db);

    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Expected a probe result for degraded retry test");
    }

    expect(result.success).toBe(true);
    expect(db.insertProbe).toHaveBeenCalledTimes(1);
  });

  it("does not retry failed probes when failed retries are disabled", async () => {
    const db: DbClient = {
      upsertModel: vi.fn(),
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => []),
      deactivateMissingUpstreams: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "gpt-fail-fast", created: null, ownedBy: null, displayName: null, icon: null, isVisible: true, sortOrder: 0, syncedAt: new Date().toISOString(), isActive: true },
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
      listProbesSince: vi.fn(() => []),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    const fetchMock = vi.fn(async () => {
      throw new Error("timeout");
    });
    vi.stubGlobal("fetch", fetchMock);

    const [result] = await probeAllModels({ ...baseConfig, degradedRetryAttempts: 3, failedRetryAttempts: 0 }, db);

    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Expected a probe result for failed retry test");
    }

    expect(result.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(db.insertProbe).toHaveBeenCalledTimes(1);
  });

  it("retries failed probes when failed retries are enabled", async () => {
    const db: DbClient = {
      upsertModel: vi.fn(),
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => []),
      deactivateMissingUpstreams: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "gpt-fail-retry", created: null, ownedBy: null, displayName: null, icon: null, isVisible: true, sortOrder: 0, syncedAt: new Date().toISOString(), isActive: true },
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
      listProbesSince: vi.fn(() => []),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    const successResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n' + "data: [DONE]\n\n"));
          controller.close();
        },
      }),
      { status: 200 },
    );

    const fetchMock = vi
      .fn(async (): Promise<Response> => {
        throw new Error("timeout");
      })
      .mockImplementationOnce(async (): Promise<Response> => {
        throw new Error("timeout");
      })
      .mockImplementationOnce(async (): Promise<Response> => successResponse);
    vi.stubGlobal("fetch", fetchMock);

    const [result] = await probeAllModels({ ...baseConfig, failedRetryAttempts: 1 }, db);

    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Expected a probe result for failed retry success test");
    }

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(db.insertProbe).toHaveBeenCalledTimes(1);
  });

  it("retries red down-scored probes when failed retries are enabled", async () => {
    const db: DbClient = {
      upsertModel: vi.fn(),
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => []),
      deactivateMissingUpstreams: vi.fn(),
      listModels: vi.fn(() => [
        { upstreamId: "main", id: "gpt-down-retry", created: null, ownedBy: null, displayName: null, icon: null, isVisible: true, sortOrder: 0, syncedAt: new Date().toISOString(), isActive: true },
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
      listProbesSince: vi.fn(() => []),
      listRecentProbes: vi.fn(() => []),
      close: vi.fn(),
    };

    const slowResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n' + "data: [DONE]\n\n"));
          controller.close();
        },
      }),
      { status: 200 },
    );
    const fastResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n' + "data: [DONE]\n\n"));
          controller.close();
        },
      }),
      { status: 200 },
    );

    const nowValues = [0, 2500, 2600, 5000, 6000, 6020, 6050, 6120];
    const perfSpy = vi.spyOn(performance, "now").mockImplementation(() => nowValues.shift() ?? 120);

    const fetchMock = vi
      .fn(async () => slowResponse)
      .mockImplementationOnce(async () => slowResponse)
      .mockImplementationOnce(async () => fastResponse);
    vi.stubGlobal("fetch", fetchMock);

    const [result] = await probeAllModels({ ...baseConfig, failedRetryAttempts: 1 }, db);

    perfSpy.mockRestore();

    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Expected a probe result for red retry success test");
    }

    expect(result.success).toBe(true);
    expect(result.totalLatencyMs).toBe(120);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(db.insertProbe).toHaveBeenCalledTimes(1);
  });
});
