import type { DbClient } from "../db";
import type { AppConfig } from "../config";
import { syncModelCatalog } from "./catalog";
import { probeAllModels } from "./probe";
import { getRuntimeSettings } from "./settings";

type TimeoutHandle = ReturnType<typeof setTimeout>;

export type Scheduler = {
  start(): Promise<void>;
  stop(): void;
  getStatus(): {
    nextProbeAt: string | null;
  };
};

export function createScheduler(config: AppConfig, db: DbClient): Scheduler {
  let syncTimer: TimeoutHandle | undefined;
  let probeTimer: TimeoutHandle | undefined;
  let syncRunning = false;
  let probeRunning = false;
  let stopped = false;
  let nextProbeAt: string | null = null;

  function clearSyncTimer(): void {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = undefined;
    }
  }

  function clearProbeTimer(): void {
    if (probeTimer) {
      clearTimeout(probeTimer);
      probeTimer = undefined;
    }
  }

  function scheduleSync(delayMs?: number): void {
    if (stopped) {
      return;
    }

    clearSyncTimer();
    const runtime = getRuntimeSettings(db, config);
    const scheduleDelayMs = delayMs ?? runtime.catalogSyncIntervalMs;
    syncTimer = setTimeout(() => {
      void safeSync();
    }, scheduleDelayMs);
  }

  function scheduleProbe(delayMs?: number): void {
    if (stopped) {
      return;
    }

    clearProbeTimer();
    const runtime = getRuntimeSettings(db, config);
    const scheduleDelayMs = delayMs ?? runtime.probeIntervalMs;
    nextProbeAt = new Date(Date.now() + scheduleDelayMs).toISOString();
    probeTimer = setTimeout(() => {
      void safeProbe();
    }, scheduleDelayMs);
  }

  async function safeSync(scheduleNext = true): Promise<void> {
    if (syncRunning) {
      if (scheduleNext) {
        scheduleSync();
      }
      return;
    }

    syncRunning = true;
    const cycleStartedAtMs = Date.now();
    try {
      await syncModelCatalog(getRuntimeSettings(db, config), db);
    } catch (error) {
      console.error("[model-status] catalog sync failed", error);
    } finally {
      syncRunning = false;
      if (scheduleNext) {
        const runtime = getRuntimeSettings(db, config);
        scheduleSync(Math.max(0, cycleStartedAtMs + runtime.catalogSyncIntervalMs - Date.now()));
      }
    }
  }

  async function safeProbe(scheduleNext = true): Promise<void> {
    if (probeRunning) {
      if (scheduleNext) {
        scheduleProbe();
      }
      return;
    }

    probeRunning = true;
    const cycleStartedAtMs = Date.now();
    try {
      await probeAllModels(getRuntimeSettings(db, config), db);
    } catch (error) {
      console.error("[model-status] probe cycle failed", error);
    } finally {
      probeRunning = false;
      if (scheduleNext) {
        const runtime = getRuntimeSettings(db, config);
        scheduleProbe(Math.max(0, cycleStartedAtMs + runtime.probeIntervalMs - Date.now()));
      }
    }
  }

  return {
    async start() {
      stopped = false;
      const runtime = getRuntimeSettings(db, config);
      const initialProbeDueAtMs = Date.now() + runtime.probeIntervalMs;
      nextProbeAt = new Date(initialProbeDueAtMs).toISOString();
      await safeSync(false);
      await safeProbe(false);
      scheduleSync();
      scheduleProbe(Math.max(0, initialProbeDueAtMs - Date.now()));
    },
    stop() {
      stopped = true;
      clearSyncTimer();
      clearProbeTimer();
      nextProbeAt = null;
    },
    getStatus() {
      return { nextProbeAt };
    },
  };
}
