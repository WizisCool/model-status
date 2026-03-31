function tryParseOrigin(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function getEffectivePort(url: URL): string {
  if (url.port) {
    return url.port;
  }

  return url.protocol === "https:" ? "443" : "80";
}

export function isAllowedAdminOrigin(origin: string | undefined, allowedOrigin: string): boolean {
  if (!origin) {
    return true;
  }

  if (origin === allowedOrigin) {
    return true;
  }

  const requestOrigin = tryParseOrigin(origin);
  const configuredOrigin = tryParseOrigin(allowedOrigin);

  if (!requestOrigin || !configuredOrigin) {
    return false;
  }

  if (
    requestOrigin.protocol === configuredOrigin.protocol
    && requestOrigin.hostname === configuredOrigin.hostname
    && getEffectivePort(requestOrigin) === getEffectivePort(configuredOrigin)
  ) {
    return true;
  }

  return (
    requestOrigin.protocol === configuredOrigin.protocol
    && getEffectivePort(requestOrigin) === getEffectivePort(configuredOrigin)
    && isLoopbackHostname(requestOrigin.hostname)
    && isLoopbackHostname(configuredOrigin.hostname)
  );
}
