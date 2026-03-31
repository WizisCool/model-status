import { describe, expect, it } from "vitest";

import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("derives webOrigin from accessUrl when WEB_ORIGIN is not set", () => {
    const config = loadConfig({
      ACCESS_URL: "https://ai.dooo.ng/status",
      WEB_ORIGIN: "",
      DATABASE_FILE: "./data/test.db",
    });

    expect(config.accessUrl).toBe("https://ai.dooo.ng/status");
    expect(config.webOrigin).toBe("https://ai.dooo.ng");
    expect(config.basePath).toBe("/status");
  });

  it("keeps explicit WEB_ORIGIN when both values are provided", () => {
    const config = loadConfig({
      ACCESS_URL: "https://ai.dooo.ng/status",
      WEB_ORIGIN: "https://admin-origin.example.com",
      DATABASE_FILE: "./data/test.db",
    });

    expect(config.webOrigin).toBe("https://admin-origin.example.com");
    expect(config.basePath).toBe("/status");
  });
});
