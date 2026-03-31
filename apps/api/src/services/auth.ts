import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import type { AdminSessionResponse, UpdateAdminAccountRequest } from "@model-status/shared";

import type { AppConfig } from "../config";
import type { AdminSessionRecord, DbClient } from "../db";
import { HttpError } from "../http-error";

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function hashSessionToken(token: string, sessionSecret: string): string {
  return createHash("sha256").update(`${sessionSecret}:${token}`).digest("hex");
}

function parseSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${SESSION_COOKIE}=`)) {
      return trimmed.slice(`${SESSION_COOKIE}=`.length);
    }
  }

  return null;
}

export function ensureAdminUser(db: DbClient, config: AppConfig): void {
  if (!config.adminBootstrapPassword || db.getAdminUserByUsername(config.adminBootstrapUsername)) {
    return;
  }

  db.createAdminUser(config.adminBootstrapUsername, hashPassword(config.adminBootstrapPassword), new Date().toISOString());
}

export function createSessionCookie(token: string, config: AppConfig): string {
  const secureSuffix = config.webOrigin.startsWith("https://") ? "; Secure" : "";
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toUTCString();
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; Expires=${expiresAt}${secureSuffix}`;
}

export function clearSessionCookie(config: AppConfig): string {
  const secureSuffix = config.webOrigin.startsWith("https://") ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureSuffix}`;
}

export function loginAdmin(db: DbClient, config: AppConfig, username: string, password: string): { token: string; session: AdminSessionResponse } | null {
  const user = db.getAdminUserByUsername(username);
  if (!user || !config.sessionSecret || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  db.deleteExpiredAdminSessions(new Date().toISOString());

  const token = randomBytes(32).toString("hex");
  const nowIso = new Date().toISOString();
  const session: AdminSessionRecord = {
    id: randomBytes(16).toString("hex"),
    userId: user.id,
    tokenHash: hashSessionToken(token, config.sessionSecret),
    createdAt: nowIso,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    lastSeenAt: nowIso,
  };

  db.createAdminSession(session);
  db.updateAdminLogin(user.id, nowIso);

  return {
    token,
    session: {
      authenticated: true,
      username: user.username,
    },
  };
}

export function getAdminSession(db: DbClient, config: AppConfig, cookieHeader: string | undefined): AdminSessionResponse {
  const token = parseSessionToken(cookieHeader);
  if (!token || !config.sessionSecret) {
    return { authenticated: false, username: null };
  }

  const nowIso = new Date().toISOString();
  db.deleteExpiredAdminSessions(nowIso);
  const session = db.getAdminSessionByTokenHash(hashSessionToken(token, config.sessionSecret));
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return { authenticated: false, username: null };
  }

  db.touchAdminSession(session.id, nowIso);
  const user = db.getAdminUserById(session.userId);

  return {
    authenticated: Boolean(user),
    username: user?.username ?? null,
  };
}

export function logoutAdmin(db: DbClient, config: AppConfig, cookieHeader: string | undefined): void {
  const token = parseSessionToken(cookieHeader);
  if (!token || !config.sessionSecret) {
    return;
  }

  const session = db.getAdminSessionByTokenHash(hashSessionToken(token, config.sessionSecret));
  if (session) {
    db.deleteAdminSession(session.id);
  }
}

export function updateAdminAccount(
  db: DbClient,
  currentUsername: string,
  payload: UpdateAdminAccountRequest,
): AdminSessionResponse {
  const currentPassword = payload.currentPassword;
  const nextPassword = payload.newPassword.trim();

  if (!currentPassword) {
    throw new HttpError(400, "Current password is required");
  }

  if (!nextPassword) {
    throw new HttpError(400, "New password is required");
  }

  if (nextPassword.length < 8) {
    throw new HttpError(400, "New password must be at least 8 characters");
  }

  const user = db.getAdminUserByUsername(currentUsername);
  if (!user) {
    throw new HttpError(404, "Admin user not found");
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new HttpError(401, "Current password is incorrect");
  }

  const passwordHash = hashPassword(nextPassword);
  if (!db.updateAdminCredentials) {
    throw new HttpError(500, "Admin credential updates are unavailable");
  }

  db.updateAdminCredentials(user.id, user.username, passwordHash, new Date().toISOString());

  return {
    authenticated: true,
    username: user.username,
  };
}
