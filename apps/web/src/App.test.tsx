import { render, screen, within } from "@testing-library/react";
import { App } from "./App";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal(
  "fetch",
  vi.fn(async () => {
    const language = localStorage.getItem("lang");
    const siteTitle = language === "zh-CN" ? "模型状态" : "Model Status";
    const siteSubtitle = language === "zh-CN" ? "模型 API 监控面板" : "Model API Monitoring Panel";

    return new Response(
      JSON.stringify({
        range: "90m",
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        nextProbeAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        siteTitle,
        siteSubtitle,
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
      }),
      { status: 200 },
    );
  }),
);

describe("App", () => {
  it("renders the improved dashboard header and summary", async () => {
    render(<App />);
    expect(screen.getByText("Model Status")).toBeInTheDocument();
    expect(screen.getByText("Model API Monitoring Panel")).toBeInTheDocument();
    expect(await screen.findByText("Total Models")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getByText(/Next detection in/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Recent Status/i).length).toBeGreaterThan(0);
  });

  it("renders Chinese copy when persisted language is zh-CN", async () => {
    localStorage.setItem("lang", "zh-CN");

    render(<App />);

    expect(await screen.findByText("模型总数")).toBeInTheDocument();
    expect(screen.getAllByText("模型 API 监控面板").length).toBeGreaterThan(0);
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
});
