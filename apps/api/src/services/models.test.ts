import { describe, expect, it, vi } from "vitest";

import type { DbClient } from "../db";
import { updateAdminModels } from "./models";

function createDbStub(): DbClient {
  return {
    upsertUpstream: vi.fn(),
    listUpstreams: vi.fn(() => []),
    deactivateMissingUpstreams: vi.fn(),
    upsertModel: vi.fn(),
    listModels: vi.fn(() => [
      {
        upstreamId: "main",
        id: "gpt-5",
        created: null,
        ownedBy: "openai",
        displayName: null,
        icon: null,
        isVisible: true,
        sortOrder: 0,
        syncedAt: new Date().toISOString(),
        isActive: true,
      },
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
}

describe("model service", () => {
  it("updates display metadata for existing models", () => {
    const db = createDbStub();

    updateAdminModels(db, {
      models: [
        {
          upstreamId: "main",
          model: "gpt-5",
          displayName: "GPT 5 Primary",
          icon: "openai",
          sortOrder: 9,
        },
      ],
    });

    expect(db.updateModelMetadata).toHaveBeenCalledWith({
      upstreamId: "main",
      id: "gpt-5",
      displayName: "GPT 5 Primary",
      icon: "openai",
      isVisible: true,
      sortOrder: 9,
    });
  });

  it("rejects unknown models", () => {
    const db = createDbStub();

    expect(() =>
      updateAdminModels(db, {
        models: [
          {
            upstreamId: "main",
            model: "missing-model",
            displayName: "Missing",
            icon: null,
            sortOrder: 1,
          },
        ],
      }),
    ).toThrow("not found");
  });
});
