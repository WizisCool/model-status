import { render, screen } from "@testing-library/react";
import { App } from "./App";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal(
  "fetch",
  vi.fn(async () =>
    new Response(
      JSON.stringify({
        range: "90m",
        from: new Date().toISOString(),
        to: new Date().toISOString(),
        nextProbeAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        summary: { totalModels: 2, availableModels: 1, degradedModels: 1, errorModels: 0, availabilityPercentage: 57.5 },
        models: [
          {
            model: "gpt-5",
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
            model: "gpt-5.1",
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
        recentProbes: [
          {
            id: 1,
            model: "gpt-5",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            success: true,
            statusCode: 200,
            error: null,
            connectivityLatencyMs: 321,
            firstTokenLatencyMs: 654,
            totalLatencyMs: 987,
            rawResponseText: "ok",
          },
          {
            id: 2,
            model: "gpt-5",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            success: false,
            statusCode: 500,
            error: "bad",
            connectivityLatencyMs: 100,
            firstTokenLatencyMs: null,
            totalLatencyMs: 200,
            rawResponseText: "error",
          },
        ],
      }),
      { status: 200 },
    ),
  ),
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

    expect(await screen.findByText("总模型数")).toBeInTheDocument();
    expect(screen.getAllByText("Model API Monitoring Panel").length).toBeGreaterThan(0);
  });
});
