import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminPanel } from "./AdminPanel";

describe("AdminPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("renders login form when unauthenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/admin/session")) {
          return new Response(JSON.stringify({ authenticated: false, username: null }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: "unexpected" }), { status: 400 });
      }),
    );

    render(<AdminPanel />);

    expect(await screen.findByText("Login")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("shows upstream sync errors after saving settings", async () => {
    const user = userEvent.setup();
    localStorage.setItem("admin-section", "upstreams");
    const settingsResponse = {
      settings: {
        siteTitle: "Model Status",
        siteSubtitle: "Model API Monitoring Panel",
        showSummaryCards: true,
        probeIntervalMs: 300000,
        catalogSyncIntervalMs: 900000,
        probeTimeoutMs: 20000,
        probeConcurrency: 4,
        probeMaxTokens: 4,
        probeTemperature: 0,
        degradedRetryAttempts: 2,
        failedRetryAttempts: 1,
        modelStatusUpScoreThreshold: 60,
        modelStatusDegradedScoreThreshold: 30,
      },
      apiKeyConfigured: false,
      apiKeyMasked: null,
      upstreams: [
        {
          id: "main",
          name: "Main",
          group: "default",
          apiBaseUrl: "https://example.com/v1",
          modelsUrl: "https://example.com/v1/models",
          isActive: true,
          apiKeyConfigured: false,
          apiKeyMasked: null,
        },
      ],
    };

    const dashboardResponse = {
      range: "24h",
      from: new Date(Date.now() - 86_400_000).toISOString(),
      to: new Date().toISOString(),
      nextProbeAt: null,
      siteTitle: "Model Status",
      siteSubtitle: "Model API Monitoring Panel",
      showSummaryCards: true,
      summary: {
        totalModels: 0,
        availableModels: 0,
        degradedModels: 0,
        errorModels: 0,
        availabilityPercentage: 0,
      },
      models: [],
      upstreams: [],
      recentProbes: [],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.includes("/api/admin/session")) {
          return new Response(JSON.stringify({ authenticated: true, username: "admin" }), { status: 200 });
        }

        if (url.includes("/api/admin/settings") && method === "GET") {
          return new Response(JSON.stringify(settingsResponse), { status: 200 });
        }

        if (url.includes("/api/admin/dashboard")) {
          return new Response(JSON.stringify(dashboardResponse), { status: 200 });
        }

        if (url.includes("/api/admin/settings") && method === "PUT") {
          return new Response(JSON.stringify(settingsResponse), { status: 200 });
        }

        if (url.includes("/api/admin/actions/sync-models")) {
          return new Response(
            JSON.stringify({ error: "Models sync failed for upstream Main: HTTP 401 Unauthorized" }),
            { status: 502 },
          );
        }

        return new Response(JSON.stringify({ error: "unexpected" }), { status: 400 });
      }),
    );

    render(<AdminPanel />);

    await user.type(await screen.findByPlaceholderText("Replace API key"), "sk-test");
    await user.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(
      await screen.findByText("Models sync failed for upstream Main: HTTP 401 Unauthorized"),
    ).toBeInTheDocument();
  });

  it("groups runtime settings and hides repository customization", async () => {
    localStorage.setItem("admin-section", "runtime");
    const settingsResponse = {
      settings: {
        siteTitle: "Model Status",
        siteSubtitle: "Model API Monitoring Panel",
        showSummaryCards: false,
        probeIntervalMs: 300000,
        catalogSyncIntervalMs: 900000,
        probeTimeoutMs: 20000,
        probeConcurrency: 4,
        probeMaxTokens: 4,
        probeTemperature: 0,
        degradedRetryAttempts: 2,
        failedRetryAttempts: 1,
        modelStatusUpScoreThreshold: 60,
        modelStatusDegradedScoreThreshold: 30,
      },
      apiKeyConfigured: false,
      apiKeyMasked: null,
      upstreams: [],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/api/admin/session")) {
          return new Response(JSON.stringify({ authenticated: true, username: "admin" }), { status: 200 });
        }

        if (url.includes("/api/admin/settings")) {
          return new Response(JSON.stringify(settingsResponse), { status: 200 });
        }

        if (url.includes("/api/admin/dashboard")) {
          return new Response(JSON.stringify({
            range: "24h",
            from: new Date(Date.now() - 86_400_000).toISOString(),
            to: new Date().toISOString(),
            nextProbeAt: null,
            siteTitle: "Model Status",
            siteSubtitle: "Model API Monitoring Panel",
            showSummaryCards: false,
            summary: {
              totalModels: 0,
              availableModels: 0,
              degradedModels: 0,
              errorModels: 0,
              availabilityPercentage: 0,
            },
            models: [],
            upstreams: [],
            recentProbes: [],
          }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: "unexpected" }), { status: 400 });
      }),
    );

    render(<AdminPanel />);

    expect((await screen.findAllByText("Retry Policy")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Failed Retry Attempts").length).toBeGreaterThan(0);
    expect(screen.queryByText("Repository URL")).not.toBeInTheDocument();
  });

  it("updates the current admin account from runtime settings", async () => {
    const user = userEvent.setup();
    localStorage.setItem("admin-section", "runtime");

    const settingsResponse = {
      settings: {
        siteTitle: "Model Status",
        siteSubtitle: "Model API Monitoring Panel",
        showSummaryCards: false,
        probeIntervalMs: 300000,
        catalogSyncIntervalMs: 900000,
        probeTimeoutMs: 20000,
        probeConcurrency: 4,
        probeMaxTokens: 4,
        probeTemperature: 0,
        degradedRetryAttempts: 2,
        failedRetryAttempts: 1,
        modelStatusUpScoreThreshold: 60,
        modelStatusDegradedScoreThreshold: 30,
      },
      apiKeyConfigured: false,
      apiKeyMasked: null,
      upstreams: [],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/api/admin/session")) {
        return new Response(JSON.stringify({ authenticated: true, username: "admin" }), { status: 200 });
      }

      if (url.includes("/api/admin/settings")) {
        return new Response(JSON.stringify(settingsResponse), { status: 200 });
      }

      if (url.includes("/api/admin/dashboard")) {
        return new Response(JSON.stringify({
          range: "24h",
          from: new Date(Date.now() - 86_400_000).toISOString(),
          to: new Date().toISOString(),
          nextProbeAt: null,
          siteTitle: "Model Status",
          siteSubtitle: "Model API Monitoring Panel",
          showSummaryCards: false,
          summary: {
            totalModels: 0,
            availableModels: 0,
            degradedModels: 0,
            errorModels: 0,
            availabilityPercentage: 0,
          },
          models: [],
          upstreams: [],
          recentProbes: [],
        }), { status: 200 });
      }

      if (url.includes("/api/admin/account") && method === "PUT") {
        return new Response(JSON.stringify({ authenticated: true, username: "operator" }), { status: 200 });
      }

      return new Response(JSON.stringify({ error: "unexpected" }), { status: 400 });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPanel />);

    const accountHeading = await screen.findByText("Account Security");
    const accountCard = accountHeading.closest("section");
    expect(accountCard).not.toBeNull();

    const accountQueries = within(accountCard as HTMLElement);
    await user.type(accountQueries.getByLabelText("Current Password"), "password123");
    await user.type(accountQueries.getByLabelText("New Password"), "new-password-123");
    await user.click(accountQueries.getAllByRole("button", { name: "Save Account" })[0]);

    expect(await screen.findByText("Account updated")).toBeInTheDocument();
    const accountCall = fetchMock.mock.calls.find(([input, init]) => String(input).includes("/api/admin/account") && (init?.method ?? "GET") === "PUT");
    expect(accountCall).toBeDefined();
    expect(accountCall?.[1]?.body).toBe(JSON.stringify({
      currentPassword: "password123",
      newPassword: "new-password-123",
    }));
  });

  it("clears probe history for a single model from the models section", async () => {
    const user = userEvent.setup();
    localStorage.setItem("admin-section", "models");

    const settingsResponse = {
      settings: {
        siteTitle: "Model Status",
        siteSubtitle: "Model API Monitoring Panel",
        showSummaryCards: true,
        probeIntervalMs: 300000,
        catalogSyncIntervalMs: 900000,
        probeTimeoutMs: 20000,
        probeConcurrency: 4,
        probeMaxTokens: 4,
        probeTemperature: 0,
        degradedRetryAttempts: 2,
        failedRetryAttempts: 1,
        modelStatusUpScoreThreshold: 60,
        modelStatusDegradedScoreThreshold: 30,
      },
      apiKeyConfigured: false,
      apiKeyMasked: null,
      upstreams: [],
    };

    const baseModel = {
      upstreamId: "main",
      upstreamName: "Main",
      upstreamGroup: "default",
      model: "gpt-5",
      displayName: "GPT 5",
      icon: null,
      isVisible: true,
      sortOrder: 1,
      created: null,
      ownedBy: "openai",
      avgConnectivityLatencyMs: 120,
      avgFirstTokenLatencyMs: 240,
      avgTotalLatencyMs: 360,
      recentStatuses: [],
    };

    const initialDashboard = {
      range: "24h",
      from: new Date(Date.now() - 86_400_000).toISOString(),
      to: new Date().toISOString(),
      nextProbeAt: null,
      siteTitle: "Model Status",
      siteSubtitle: "Model API Monitoring Panel",
      showSummaryCards: true,
      summary: {
        totalModels: 1,
        availableModels: 1,
        degradedModels: 0,
        errorModels: 0,
        availabilityPercentage: 66.67,
      },
      models: [
        {
          ...baseModel,
          probes: 3,
          successes: 2,
          failures: 1,
          availabilityPercentage: 66.67,
          lastProbeAt: "2026-04-01T09:11:54.631Z",
          latestStatus: "up" as const,
        },
      ],
      upstreams: [
        {
          upstreamId: "main",
          upstreamName: "Main",
          upstreamGroup: "default",
          totalModels: 1,
          availableModels: 1,
          degradedModels: 0,
          errorModels: 0,
          availabilityPercentage: 66.67,
        },
      ],
      recentProbes: [
        {
          id: 1,
          upstreamId: "main",
          upstreamName: "Main",
          model: "gpt-5",
          startedAt: "2026-04-01T09:11:54.631Z",
          completedAt: "2026-04-01T09:11:55.200Z",
          success: true,
          statusCode: 200,
          error: null,
          connectivityLatencyMs: 120,
          firstTokenLatencyMs: 240,
          totalLatencyMs: 360,
          rawResponseText: "ok",
        },
      ],
    };

    const clearedDashboard = {
      ...initialDashboard,
      summary: {
        totalModels: 1,
        availableModels: 0,
        degradedModels: 0,
        errorModels: 0,
        availabilityPercentage: 0,
      },
      models: [
        {
          ...baseModel,
          probes: 0,
          successes: 0,
          failures: 0,
          availabilityPercentage: 0,
          avgConnectivityLatencyMs: null,
          avgFirstTokenLatencyMs: null,
          avgTotalLatencyMs: null,
          lastProbeAt: null,
          latestStatus: "empty" as const,
        },
      ],
      upstreams: [
        {
          upstreamId: "main",
          upstreamName: "Main",
          upstreamGroup: "default",
          totalModels: 1,
          availableModels: 0,
          degradedModels: 0,
          errorModels: 0,
          availabilityPercentage: 0,
        },
      ],
      recentProbes: [],
    };

    let historyCleared = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/api/admin/session")) {
        return new Response(JSON.stringify({ authenticated: true, username: "admin" }), { status: 200 });
      }

      if (url.includes("/api/admin/settings")) {
        return new Response(JSON.stringify(settingsResponse), { status: 200 });
      }

      if (url.includes("/api/admin/dashboard")) {
        return new Response(JSON.stringify(historyCleared ? clearedDashboard : initialDashboard), { status: 200 });
      }

      if (url.includes("/api/admin/models/clear-history") && method === "POST") {
        historyCleared = true;
        return new Response(
          JSON.stringify({ ok: true, message: "Cleared 3 probe records for main/gpt-5" }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ error: "unexpected" }), { status: 400 });
    });

    vi.stubGlobal("fetch", fetchMock);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminPanel />);

    expect(await screen.findByText("3 probe records")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear History" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Clear all stored probe history for this model? This cannot be undone.",
    );
    expect(await screen.findByText("Cleared 3 probe records for main/gpt-5")).toBeInTheDocument();
    expect(await screen.findByText("0 probe records")).toBeInTheDocument();

    const clearCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).includes("/api/admin/models/clear-history") && (init?.method ?? "GET") === "POST",
    );
    expect(clearCall).toBeDefined();
    expect(clearCall?.[1]?.body).toBe(JSON.stringify({ upstreamId: "main", model: "gpt-5" }));
  });
});
