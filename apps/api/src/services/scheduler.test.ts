import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppConfig } from "../config";
import type { DbClient } from "../db";
import { createScheduler } from "./scheduler";

describe("scheduler service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })));
  });

  it("exposes nextProbeAt before startup probe completes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));

    const config: AppConfig = {
      workspaceRoot: "D:/project/model-status",
      webDistDir: "D:/project/model-status/apps/web/dist",
      host: "127.0.0.1",
      port: 3000,
      webOrigin: "http://127.0.0.1:3000",
      accessUrl: "http://127.0.0.1:3000",
      basePath: "",
      databaseFile: ":memory:",
      adminBootstrapUsername: "admin",
      adminBootstrapPassword: "password",
      sessionSecret: "secret",
    };

    const db: DbClient = {
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => [
        {
          id: "main",
          name: "Main",
          group: "default",
          apiBaseUrl: "https://ai.dooo.ng/v1",
          modelsUrl: "https://ai.dooo.ng/v1/models",
          apiKey: "test-key",
          isActive: true,
          updatedAt: "2026-01-01T12:00:00.000Z",
        },
      ]),
      deactivateMissingUpstreams: vi.fn(),
      upsertModel: vi.fn(),
      listModels: vi.fn(() => []),
      updateModelMetadata: vi.fn(),
      deactivateMissingModels: vi.fn(),
      getSetting: vi.fn((key: string) => {
        if (key === "PROBE_INTERVAL_MS") {
          return "300000";
        }
        if (key === "CATALOG_SYNC_INTERVAL_MS") {
          return "900000";
        }
        if (key === "PROBE_TIMEOUT_MS") {
          return "1000";
        }
        if (key === "PROBE_CONCURRENCY") {
          return "1";
        }
        if (key === "PROBE_MAX_TOKENS") {
          return "4";
        }
        if (key === "PROBE_TEMPERATURE") {
          return "0";
        }
        if (key === "DEGRADED_RETRY_ATTEMPTS") {
          return "1";
        }
        if (key === "FAILED_RETRY_ATTEMPTS") {
          return "0";
        }
        if (key === "MODEL_STATUS_UP_SCORE_THRESHOLD") {
          return "60";
        }
        if (key === "MODEL_STATUS_DEGRADED_SCORE_THRESHOLD") {
          return "30";
        }
        if (key === "SITE_TITLE") {
          return "Model Status";
        }
        if (key === "SITE_SUBTITLE") {
          return "subtitle";
        }
        return null;
      }),
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

    const scheduler = createScheduler(config, db);
    const startPromise = scheduler.start();

    expect(scheduler.getStatus().nextProbeAt).toBe("2026-01-01T12:05:00.000Z");

    await startPromise;
    scheduler.stop();
    vi.useRealTimers();
  });

  it("keeps probe cadence anchored to cycle start time when a probe run is slow", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));

    const encoder = new TextEncoder();
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/models")) {
        return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "gpt-5-codex", created: 1, owned_by: "openai" }] }), { status: 200 }));
      }

      return new Promise<Response>((resolve) => {
        setTimeout(() => {
          resolve(new Response(new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            },
          }), { status: 200 }));
        }, 120_000);
      });
    }));

    const config: AppConfig = {
      workspaceRoot: "D:/project/model-status",
      webDistDir: "D:/project/model-status/apps/web/dist",
      host: "127.0.0.1",
      port: 3000,
      webOrigin: "http://127.0.0.1:3000",
      accessUrl: "http://127.0.0.1:3000",
      basePath: "",
      databaseFile: ":memory:",
      adminBootstrapUsername: "admin",
      adminBootstrapPassword: "password",
      sessionSecret: "secret",
    };

    const db: DbClient = {
      upsertUpstream: vi.fn(),
      listUpstreams: vi.fn(() => [
        {
          id: "main",
          name: "Main",
          group: "default",
          apiBaseUrl: "https://ai.dooo.ng/v1",
          modelsUrl: "https://ai.dooo.ng/v1/models",
          apiKey: "test-key",
          isActive: true,
          updatedAt: "2026-01-01T12:00:00.000Z",
        },
      ]),
      deactivateMissingUpstreams: vi.fn(),
      upsertModel: vi.fn(),
      listModels: vi.fn(() => [
        {
          upstreamId: "main",
          id: "gpt-5-codex",
          created: 1,
          ownedBy: "openai",
          displayName: "GPT-5 Codex",
          icon: "codex",
          isVisible: true,
          sortOrder: 1,
          syncedAt: "2026-01-01T12:00:00.000Z",
          isActive: true,
        },
      ]),
      updateModelMetadata: vi.fn(),
      deactivateMissingModels: vi.fn(),
      getSetting: vi.fn((key: string) => {
        if (key === "PROBE_INTERVAL_MS") {
          return "300000";
        }
        if (key === "CATALOG_SYNC_INTERVAL_MS") {
          return "900000";
        }
        if (key === "PROBE_TIMEOUT_MS") {
          return "20000";
        }
        if (key === "PROBE_CONCURRENCY") {
          return "1";
        }
        if (key === "PROBE_MAX_TOKENS") {
          return "4";
        }
        if (key === "PROBE_TEMPERATURE") {
          return "0";
        }
        if (key === "DEGRADED_RETRY_ATTEMPTS") {
          return "1";
        }
        if (key === "FAILED_RETRY_ATTEMPTS") {
          return "0";
        }
        if (key === "MODEL_STATUS_UP_SCORE_THRESHOLD") {
          return "60";
        }
        if (key === "MODEL_STATUS_DEGRADED_SCORE_THRESHOLD") {
          return "30";
        }
        if (key === "SITE_TITLE") {
          return "Model Status";
        }
        if (key === "SITE_SUBTITLE") {
          return "subtitle";
        }
        return null;
      }),
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

    const scheduler = createScheduler(config, db);
    const startPromise = scheduler.start();

    expect(scheduler.getStatus().nextProbeAt).toBe("2026-01-01T12:05:00.000Z");

    await vi.advanceTimersByTimeAsync(120_000);
    await startPromise;

    expect(scheduler.getStatus().nextProbeAt).toBe("2026-01-01T12:05:00.000Z");

    scheduler.stop();
    vi.useRealTimers();
  });
});
