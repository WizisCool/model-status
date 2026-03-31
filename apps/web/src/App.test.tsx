import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

afterEach(() => {
  cleanup();
});

const buildDashboardResponse = (language: string | null, overrides: Record<string, unknown> = {}) => ({
  range: "90m",
  from: new Date().toISOString(),
  to: new Date().toISOString(),
  nextProbeAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  siteTitle: language === "zh-CN" ? "\u6a21\u578b\u72b6\u6001" : "Model Status",
  siteSubtitle: language === "zh-CN" ? "\u6a21\u578b API \u76d1\u63a7\u9762\u677f" : "Model API Monitoring Panel",
  showSummaryCards: true,
  summary: { totalModels: 2, availableModels: 1, degradedModels: 1, errorModels: 0, availabilityPercentage: 57.5 },
  models: [
    {
      upstreamId: "main",
      upstreamName: "Main",
      upstreamGroup: "default",
      model: "gpt-5",
      displayName: "GPT 5",
      icon: "openai",
      isVisible: true,
      sortOrder: 1,
      created: null,
      ownedBy: "openai",
      probes: 2,
      successes: 1,
      failures: 1,
      availabilityPercentage: 50,
      avgConnectivityLatencyMs: 321,
      avgFirstTokenLatencyMs: 654,
      avgTotalLatencyMs: 987,
      lastProbeAt: new Date().toISOString(),
      latestStatus: "degraded",
      recentStatuses: [
        {
          id: "90m-1",
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          score: 85,
          level: "up",
          probeCount: 1,
          successCount: 1,
          avgConnectivityLatencyMs: 321,
          avgTotalLatencyMs: 987,
        },
        {
          id: "90m-2",
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          score: 30,
          level: "down",
          probeCount: 1,
          successCount: 0,
          avgConnectivityLatencyMs: 100,
          avgTotalLatencyMs: 200,
        },
      ],
    },
    {
      upstreamId: "main",
      upstreamName: "Main",
      upstreamGroup: "default",
      model: "gpt-5.1",
      displayName: "GPT 5.1",
      icon: "openai",
      isVisible: true,
      sortOrder: 2,
      created: null,
      ownedBy: "openai",
      probes: 2,
      successes: 2,
      failures: 0,
      availabilityPercentage: 100,
      avgConnectivityLatencyMs: 222,
      avgFirstTokenLatencyMs: 333,
      avgTotalLatencyMs: 444,
      lastProbeAt: new Date().toISOString(),
      latestStatus: "up",
      recentStatuses: [
        {
          id: "90m-empty",
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          score: null,
          level: "empty",
          probeCount: 0,
          successCount: 0,
          avgConnectivityLatencyMs: null,
          avgTotalLatencyMs: null,
        },
      ],
    },
  ],
  ...overrides,
});

const defaultFetchImpl = async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("/api/admin/session")) {
    return new Response(JSON.stringify({ authenticated: false, username: null }), { status: 200 });
  }

  return new Response(
    JSON.stringify(buildDashboardResponse(localStorage.getItem("lang"))),
    { status: 200 },
  );
};

vi.stubGlobal("fetch", vi.fn(defaultFetchImpl));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  delete window.__MODEL_STATUS_BASE_PATH__;
  vi.mocked(fetch).mockImplementation(defaultFetchImpl);
});

describe("App", () => {
  it("renders the improved dashboard header and summary", async () => {
    render(<App />);

    expect(await screen.findByText("Total Models")).toBeInTheDocument();
    expect(screen.getAllByText("Model Status").length).toBeGreaterThan(0);
    expect(screen.getByText("Model API Monitoring Panel")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getByText(/Next detection in/i)).toBeInTheDocument();
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders Chinese copy when persisted language is zh-CN", async () => {
    localStorage.setItem("lang", "zh-CN");

    render(<App />);

    expect(await screen.findByText(/\u4e0b\u6b21\u63a2\u6d4b\u5012\u8ba1\u65f6/)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("zh-CN");
  });

  it("stretches sparse recent status bars across the full row", async () => {
    render(<App />);

    const recentStatusBars = await screen.findAllByRole("img", { name: /Recent Status/i });
    const sparseBars = within(recentStatusBars[0] as HTMLElement).getAllByTitle(/score|No probe data/i);

    expect(recentStatusBars[0]).toHaveClass("w-full");
    expect(recentStatusBars[0]).not.toHaveClass("justify-end");
    expect(sparseBars[0]).toHaveClass("flex-1");
    expect(sparseBars[0]).not.toHaveClass("w-[6px]");
  });

  it("hides summary cards when disabled by admin settings", async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/session")) {
        return new Response(JSON.stringify({ authenticated: false, username: null }), { status: 200 });
      }

      return new Response(
        JSON.stringify(
          buildDashboardResponse("en", {
            showSummaryCards: false,
            summary: { totalModels: 1, availableModels: 1, degradedModels: 0, errorModels: 0, availabilityPercentage: 100 },
            models: [
              {
                upstreamId: "main",
                upstreamName: "Main",
                upstreamGroup: "default",
                model: "gpt-5",
                displayName: "GPT 5",
                icon: "openai",
                isVisible: true,
                sortOrder: 1,
                created: null,
                ownedBy: "openai",
                probes: 1,
                successes: 1,
                failures: 0,
                availabilityPercentage: 100,
                avgConnectivityLatencyMs: 100,
                avgFirstTokenLatencyMs: 200,
                avgTotalLatencyMs: 300,
                lastProbeAt: new Date().toISOString(),
                latestStatus: "up",
                recentStatuses: [],
              },
            ],
          }),
        ),
        { status: 200 },
      );
    });

    render(<App />);

    expect(await screen.findByText("Model")).toBeInTheDocument();
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Models")).not.toBeInTheDocument();
  });

  it("defaults to list view when no preference is stored", async () => {
    render(<App />);

    expect(await screen.findByText("Model")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("falls back to browser language when no language preference is stored", async () => {
    const languageGetter = vi.spyOn(window.navigator, "language", "get").mockReturnValue("zh-CN");

    render(<App />);

    expect(await screen.findByText(/\u4e0b\u6b21\u63a2\u6d4b\u5012\u8ba1\u65f6/)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("zh-CN");
    languageGetter.mockRestore();
  });

  it("does not enter the loading screen when clicking the active range again", async () => {
    render(<App />);

    expect(await screen.findByText("Model")).toBeInTheDocument();
    const dashboardFetchCallsBefore = vi.mocked(fetch).mock.calls.filter(([input]) => String(input).includes("/api/dashboard")).length;

    fireEvent.click(screen.getByRole("button", { name: "90m" }));

    expect(screen.queryByText("Establishing connection...")).not.toBeInTheDocument();
    const dashboardFetchCallsAfter = vi.mocked(fetch).mock.calls.filter(([input]) => String(input).includes("/api/dashboard")).length;
    expect(dashboardFetchCallsAfter).toBe(dashboardFetchCallsBefore);
    expect(screen.getByText("Model")).toBeInTheDocument();
  });

  it("prefixes dashboard requests and admin links with the configured base path", async () => {
    window.__MODEL_STATUS_BASE_PATH__ = "/status";
    window.history.replaceState({}, "", "/status");

    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/session")) {
        return new Response(JSON.stringify({ authenticated: true, username: "admin" }), { status: 200 });
      }

      return new Response(
        JSON.stringify(buildDashboardResponse("en")),
        { status: 200 },
      );
    });

    render(<App />);

    expect(await screen.findByText("Model")).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes("/status/api/dashboard?range=90m"))).toBe(true);

    const adminLink = screen.getByRole("link", { name: "Admin Dashboard" });
    expect(adminLink).toHaveAttribute("href", "/status/admin");
  });
});
