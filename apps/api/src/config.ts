import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type EnvSource = Record<string, string | undefined>;

function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/gu, "");

    if (key) {
      values[key] = value;
    }
  }

  return values;
}

function isWorkspaceRoot(directory: string): boolean {
  const packageJsonPath = resolve(directory, "package.json");
  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { workspaces?: unknown };
    return Array.isArray(packageJson.workspaces);
  } catch {
    return false;
  }
}

function findWorkspaceRoot(startDirectory: string): string {
  let currentDirectory = resolve(startDirectory);
  let lastPackageDirectory = resolve(startDirectory);

  while (true) {
    const packageJsonPath = resolve(currentDirectory, "package.json");
    if (existsSync(packageJsonPath)) {
      lastPackageDirectory = currentDirectory;
    }

    if (isWorkspaceRoot(currentDirectory)) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return lastPackageDirectory;
    }

    currentDirectory = parentDirectory;
  }
}

function loadFileEnv(startDirectory: string): Record<string, string> {
  const workspaceRoot = findWorkspaceRoot(startDirectory);
  const values: Record<string, string> = {};

  for (const fileName of [".env", ".env.local"]) {
    const filePath = resolve(workspaceRoot, fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    Object.assign(values, parseEnvFile(readFileSync(filePath, "utf8")));
  }

  return values;
}

function readNumber(env: EnvSource, key: string, fallback: number): number {
  const raw = env[key];
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function readString(env: EnvSource, key: string, fallback: string): string {
  const raw = env[key];
  return raw && raw.trim().length > 0 ? raw.trim() : fallback;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function deriveOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return "";
  }
}

export type AppConfig = {
  workspaceRoot: string;
  webDistDir: string;
  host: string;
  port: number;
  webOrigin: string;
  accessUrl: string;
  basePath: string;
  databaseFile: string;
  adminBootstrapUsername: string;
  adminBootstrapPassword: string;
  sessionSecret: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  let pathname = trimmed;

  try {
    pathname = new URL(trimmed).pathname;
  } catch {
    pathname = trimmed;
  }

  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalized = trimTrailingSlash(withLeadingSlash);
  return normalized === "/" ? "" : normalized;
}

export function loadConfig(envSource: EnvSource = process.env): AppConfig {
  const workspaceRoot = findWorkspaceRoot(__dirname);
  const env = { ...loadFileEnv(__dirname), ...envSource };
  const rawWebOrigin = env.WEB_ORIGIN?.trim() ?? "";
  const rawAccessUrl = env.ACCESS_URL?.trim() ?? "";
  const fallbackOrigin = rawAccessUrl ? deriveOrigin(rawAccessUrl) || "http://localhost:5173" : "http://localhost:5173";
  const webOrigin = rawWebOrigin || fallbackOrigin;
  const accessUrl = readString(env, "ACCESS_URL", webOrigin);

  return {
    workspaceRoot,
    webDistDir: resolve(workspaceRoot, "apps/web/dist"),
    host: readString(env, "HOST", "0.0.0.0"),
    port: readNumber(env, "PORT", 3000),
    webOrigin,
    accessUrl,
    basePath: normalizeBasePath(accessUrl),
    databaseFile: resolve(workspaceRoot, readString(env, "DATABASE_FILE", "./data/model-status.db")),
    adminBootstrapUsername: readString(env, "ADMIN_BOOTSTRAP_USERNAME", "admin"),
    adminBootstrapPassword: readString(env, "ADMIN_BOOTSTRAP_PASSWORD", ""),
    sessionSecret: readString(env, "SESSION_SECRET", ""),
  };
}
