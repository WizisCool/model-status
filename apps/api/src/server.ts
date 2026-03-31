import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

import type { AdminActionResponse, AdminDashboardResponse, AdminSessionResponse, UpdateAdminModelsRequest, UpdateAdminSettingsRequest } from "@model-status/shared";
import { isDashboardRange } from "@model-status/shared";

import { loadConfig } from "./config";
import { createDb } from "./db";
import { HttpError } from "./http-error";
import { isAllowedAdminOrigin } from "./origin";
import { clearSessionCookie, createSessionCookie, ensureAdminUser, getAdminSession, loginAdmin, logoutAdmin } from "./services/auth";
import { getRuntimeSettings, getAdminSettingsResponse, updateAdminSettings, ensureRuntimeSettings } from "./services/settings";
import { syncModelCatalog } from "./services/catalog";
import { getDashboardData, toPublicDashboardResponse } from "./services/dashboard";
import { updateAdminModels } from "./services/models";
import { probeAllModels } from "./services/probe";
import { createScheduler } from "./services/scheduler";

const bootstrapConfig = loadConfig();
const db = createDb(bootstrapConfig.databaseFile);
ensureRuntimeSettings(db, bootstrapConfig);
ensureAdminUser(db, bootstrapConfig);
const scheduler = createScheduler(bootstrapConfig, db);

function sendJson(response: import("node:http").ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Access-Control-Allow-Origin", bootstrapConfig.webOrigin);
  response.end(JSON.stringify(body));
}

function sendText(response: import("node:http").ServerResponse, statusCode: number, body: string) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.end(body);
}

function getContentType(filePath: string): string {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function tryServeFrontend(response: import("node:http").ServerResponse, pathname: string): boolean {
  if (!existsSync(bootstrapConfig.webDistDir)) {
    return false;
  }

  const safePath = pathname === "/" || pathname === "/admin" ? "index.html" : pathname.replace(/^\/+/, "");
  const absolutePath = resolve(join(bootstrapConfig.webDistDir, normalize(safePath)));
  const distRoot = resolve(bootstrapConfig.webDistDir);

  if (!absolutePath.startsWith(distRoot)) {
    sendText(response, 400, "Invalid path");
    return true;
  }

  if (existsSync(absolutePath) && statSync(absolutePath).isFile()) {
    response.statusCode = 200;
    response.setHeader("Content-Type", getContentType(absolutePath));
    response.end(readFileSync(absolutePath));
    return true;
  }

  if (pathname.includes(".")) {
    return false;
  }

  const indexPath = join(bootstrapConfig.webDistDir, "index.html");
  if (!existsSync(indexPath)) {
    return false;
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(readFileSync(indexPath));
  return true;
}

async function parseJsonBody<T>(request: import("node:http").IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return (raw ? JSON.parse(raw) : {}) as T;
}

function getSession(request: import("node:http").IncomingMessage): AdminSessionResponse {
  return getAdminSession(db, bootstrapConfig, request.headers.cookie);
}

function requireAdmin(request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse): AdminSessionResponse | null {
  const session = getSession(request);
  if (!session.authenticated) {
    sendJson(response, 401, { error: "Unauthorized" });
    return null;
  }

  if (!isAllowedAdminOrigin(request.headers.origin, bootstrapConfig.webOrigin)) {
    sendJson(response, 403, { error: "Invalid origin" });
    return null;
  }

  return session;
}

const server = createServer(async (request, response) => {
  let url: URL | null = null;

  try {
    if (!request.url || !request.method) {
      sendJson(response, 400, { error: "Invalid request" });
      return;
    }

    url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.setHeader("Access-Control-Allow-Origin", bootstrapConfig.webOrigin);
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, now: new Date().toISOString() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      const rangeParam = url.searchParams.get("range") ?? "90m";
      if (!isDashboardRange(rangeParam)) {
        sendJson(response, 400, { error: "Invalid range. Use one of: 90m,24h,7d,30d" });
        return;
      }

      const payload = {
        ...getDashboardData(db, rangeParam, getRuntimeSettings(db, bootstrapConfig)),
        nextProbeAt: scheduler.getStatus().nextProbeAt,
      };
      sendJson(response, 200, toPublicDashboardResponse(payload));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/session") {
      sendJson(response, 200, getSession(request));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/login") {
      const body = await parseJsonBody<{ username?: string; password?: string }>(request);
      const result = loginAdmin(db, bootstrapConfig, body.username ?? "", body.password ?? "");
      if (!result) {
        sendJson(response, 401, { error: "Invalid credentials" });
        return;
      }

      response.setHeader("Set-Cookie", createSessionCookie(result.token, bootstrapConfig));
      sendJson(response, 200, result.session);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/logout") {
      logoutAdmin(db, bootstrapConfig, request.headers.cookie);
      response.setHeader("Set-Cookie", clearSessionCookie(bootstrapConfig));
      sendJson(response, 200, { authenticated: false, username: null } satisfies AdminSessionResponse);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/settings") {
      if (!requireAdmin(request, response)) {
        return;
      }

      sendJson(response, 200, getAdminSettingsResponse(db, bootstrapConfig));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/dashboard") {
      if (!requireAdmin(request, response)) {
        return;
      }

      const rangeParam = url.searchParams.get("range") ?? "90m";
      if (!isDashboardRange(rangeParam)) {
        sendJson(response, 400, { error: "Invalid range. Use one of: 90m,24h,7d,30d" });
        return;
      }

      const payload: AdminDashboardResponse = {
        ...getDashboardData(db, rangeParam, getRuntimeSettings(db, bootstrapConfig)),
        nextProbeAt: scheduler.getStatus().nextProbeAt,
      };
      sendJson(response, 200, payload);
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/admin/settings") {
      if (!requireAdmin(request, response)) {
        return;
      }

      const body = await parseJsonBody<UpdateAdminSettingsRequest>(request);
      sendJson(response, 200, updateAdminSettings(db, bootstrapConfig, body));
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/admin/models") {
      if (!requireAdmin(request, response)) {
        return;
      }

      const body = await parseJsonBody<UpdateAdminModelsRequest>(request);
      updateAdminModels(db, body);
      sendJson(response, 200, { ok: true, message: "Model settings saved" } satisfies AdminActionResponse);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/actions/sync-models") {
      if (!requireAdmin(request, response)) {
        return;
      }

      await syncModelCatalog(getRuntimeSettings(db, bootstrapConfig), db);
      sendJson(response, 200, { ok: true, message: "Models synced" } satisfies AdminActionResponse);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/actions/run-probes") {
      if (!requireAdmin(request, response)) {
        return;
      }

      const results = await probeAllModels(getRuntimeSettings(db, bootstrapConfig), db);
      const successCount = results.filter((result) => result.success).length;
      const failureCount = results.length - successCount;
      const message = results.length === 0
        ? "No models available to probe"
        : `Probes completed: ${results.length} models, ${successCount} successful, ${failureCount} failed`;
      sendJson(response, 200, { ok: true, message } satisfies AdminActionResponse);
      return;
    }

    if (request.method === "GET" && tryServeFrontend(response, url.pathname)) {
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    if (response.headersSent || response.writableEnded) {
      console.error("Unhandled request error after headers sent", error);
      return;
    }

    const pathname = url?.pathname ?? request.url ?? "";
    const isAdminRoute = pathname.startsWith("/api/admin");
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const errorMessage = error instanceof Error ? error.message : "Unexpected server error";

    console.error(`Request failed for ${request.method ?? "UNKNOWN"} ${pathname}`, error);
    sendJson(response, statusCode, {
      error: isAdminRoute ? errorMessage : "Internal server error",
    });
  }
});

void scheduler.start();

server.listen(bootstrapConfig.port, bootstrapConfig.host, () => {
  console.log(`Model status API listening on http://${bootstrapConfig.host}:${bootstrapConfig.port}`);
});

const shutdown = () => {
  scheduler.stop();
  db.close();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
