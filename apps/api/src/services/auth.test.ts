import { describe, expect, it } from "vitest";

import type { AppConfig } from "../config";
import { createDb } from "../db";
import { HttpError } from "../http-error";
import { createSessionCookie, ensureAdminUser, updateAdminAccount } from "./auth";

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
  adminBootstrapPassword: "password123",
  sessionSecret: "secret",
};

describe("auth service", () => {
  it("sets an explicit expiration on the admin session cookie", () => {
    const cookie = createSessionCookie("token", testConfig);

    expect(cookie).toContain("Max-Age=");
    expect(cookie).toContain("Expires=");
    expect(cookie).toContain("HttpOnly");
  });

  it("updates the current admin username and password after verifying the current password", () => {
    const db = createDb(":memory:");

    try {
      ensureAdminUser(db, testConfig);

      const session = updateAdminAccount(db, "admin", {
        currentPassword: "password123",
        newPassword: "new-password-123",
      });

      expect(session).toEqual({
        authenticated: true,
        username: "admin",
      });
      expect(db.getAdminUserByUsername("admin")?.username).toBe("admin");
    } finally {
      db.close();
    }
  });

  it("rejects account updates when the current password is wrong", () => {
    const db = createDb(":memory:");

    try {
      ensureAdminUser(db, testConfig);

      expect(() =>
        updateAdminAccount(db, "admin", {
          currentPassword: "wrong-password",
          newPassword: "new-password-123",
        }),
      ).toThrowError(HttpError);
      expect(() =>
        updateAdminAccount(db, "admin", {
          currentPassword: "wrong-password",
          newPassword: "new-password-123",
        }),
      ).toThrowError("Current password is incorrect");
    } finally {
      db.close();
    }
  });
});
