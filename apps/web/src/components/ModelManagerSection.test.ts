import { describe, expect, it } from "vitest";

import { __modelManagerTestUtils } from "./ModelManagerSection";

describe("ModelManagerSection drag ids", () => {
  it("creates unique sortable ids for models with the same name in different upstreams", () => {
    const first = __modelManagerTestUtils.getSortableModelId({
      upstreamId: "primary",
      upstreamName: "Primary",
      upstreamGroup: "default",
      model: "gpt-5",
      displayName: "GPT 5",
      icon: "openai",
      isVisible: true,
      sortOrder: 1,
      created: null,
      ownedBy: "openai",
      probes: 0,
      successes: 0,
      failures: 0,
      availabilityPercentage: 0,
      avgConnectivityLatencyMs: null,
      avgFirstTokenLatencyMs: null,
      avgTotalLatencyMs: null,
      lastProbeAt: null,
      latestStatus: "empty",
      recentStatuses: [],
    });

    const second = __modelManagerTestUtils.getSortableModelId({
      upstreamId: "backup",
      upstreamName: "Backup",
      upstreamGroup: "default",
      model: "gpt-5",
      displayName: "GPT 5",
      icon: "openai",
      isVisible: true,
      sortOrder: 1,
      created: null,
      ownedBy: "openai",
      probes: 0,
      successes: 0,
      failures: 0,
      availabilityPercentage: 0,
      avgConnectivityLatencyMs: null,
      avgFirstTokenLatencyMs: null,
      avgTotalLatencyMs: null,
      lastProbeAt: null,
      latestStatus: "empty",
      recentStatuses: [],
    });

    expect(first).toBe("primary::gpt-5");
    expect(second).toBe("backup::gpt-5");
    expect(first).not.toBe(second);
  });
});
