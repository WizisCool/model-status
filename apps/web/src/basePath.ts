declare global {
  interface Window {
    __MODEL_STATUS_BASE_PATH__?: string;
  }
}

function normalizeBasePath(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/u, "");
}

export function getBasePath(): string {
  return normalizeBasePath(window.__MODEL_STATUS_BASE_PATH__);
}

export function stripBasePath(pathname: string): string {
  const basePath = getBasePath();
  const normalizePathname = (value: string) => (value.length > 1 ? value.replace(/\/+$/u, "") : value);

  if (!basePath) {
    return normalizePathname(pathname);
  }

  if (pathname === basePath || pathname === `${basePath}/`) {
    return "/";
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return normalizePathname(pathname.slice(basePath.length) || "/");
  }

  return normalizePathname(pathname);
}

export function buildAppPath(path: string): string {
  const basePath = getBasePath();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!basePath) {
    return normalizedPath;
  }

  return normalizedPath === "/" ? basePath : `${basePath}${normalizedPath}`;
}

export function buildApiPath(path: string): string {
  return buildAppPath(path);
}
