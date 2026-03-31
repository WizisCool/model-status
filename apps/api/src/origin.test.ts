import { describe, expect, it } from "vitest";

import { isAllowedAdminOrigin } from "./origin";

describe("isAllowedAdminOrigin", () => {
  it("allows missing origin headers", () => {
    expect(isAllowedAdminOrigin(undefined, "http://127.0.0.1:5173")).toBe(true);
  });

  it("allows exact origin matches", () => {
    expect(isAllowedAdminOrigin("http://127.0.0.1:5173", "http://127.0.0.1:5173")).toBe(true);
  });

  it("treats localhost and loopback IPs as equivalent in dev", () => {
    expect(isAllowedAdminOrigin("http://localhost:5173", "http://127.0.0.1:5173")).toBe(true);
    expect(isAllowedAdminOrigin("http://[::1]:5173", "http://localhost:5173")).toBe(true);
  });

  it("rejects different ports even for loopback hosts", () => {
    expect(isAllowedAdminOrigin("http://localhost:4173", "http://127.0.0.1:5173")).toBe(false);
  });

  it("rejects unrelated origins", () => {
    expect(isAllowedAdminOrigin("http://example.com", "http://127.0.0.1:5173")).toBe(false);
  });
});
