import { describe, expect, it } from "vitest";

import type { AppConfig } from "../config";
import { createDb } from "../db";
import { ensureRuntimeSettings, getAdminSettingsResponse, getRuntimeSettings, updateAdminSettings } from "./settings";

const testConfig: AppConfig = {
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

describe("settings service", () => {
  it("keeps the project repository fixed and exposes failed retry attempts", () => {
    const db = createDb(":memory:");

    try {
      ensureRuntimeSettings(db, testConfig);

      const initialResponse = getAdminSettingsResponse(db, testConfig);
      expect(initialResponse.settings.showSummaryCards).toBe(true);
      expect(initialResponse.settings.failedRetryAttempts).toBe(0);
      expect(Object.hasOwn(initialResponse.settings, "githubRepoUrl")).toBe(false);

      updateAdminSettings(db, testConfig, {
        siteTitle: "Custom Model Status",
        showSummaryCards: false,
        failedRetryAttempts: 2,
      });

      const runtime = getRuntimeSettings(db, testConfig);
      expect(runtime.showSummaryCards).toBe(false);
      expect(runtime.failedRetryAttempts).toBe(2);
    } finally {
      db.close();
    }
  });
});
