const DASHBOARD_REFRESH_EVENT = "model-status:dashboard-refresh";
const DASHBOARD_REFRESH_STORAGE_KEY = "model-status-dashboard-refresh";

export function announceDashboardRefresh(reason: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const detail = {
    reason,
    at: Date.now(),
  };

  window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT, { detail }));

  try {
    window.localStorage.setItem(DASHBOARD_REFRESH_STORAGE_KEY, JSON.stringify(detail));
  } catch {
    // Ignore storage failures in private browsing or restricted environments.
  }
}

export function listenForDashboardRefresh(onRefresh: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleCustomEvent = () => {
    onRefresh();
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === DASHBOARD_REFRESH_STORAGE_KEY && event.newValue) {
      onRefresh();
    }
  };

  window.addEventListener(DASHBOARD_REFRESH_EVENT, handleCustomEvent as EventListener);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(DASHBOARD_REFRESH_EVENT, handleCustomEvent as EventListener);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
