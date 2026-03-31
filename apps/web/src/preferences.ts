import type { DashboardRange } from "@model-status/shared";

export type ViewMode = "grid" | "list";

export type ThemeMode = "dark" | "light";

export function getInitialRange(): DashboardRange {
  const params = new URLSearchParams(window.location.search);
  const range = params.get("range");

  if (range === "90m" || range === "24h" || range === "7d" || range === "30d") {
    return range;
  }

  return "90m";
}

export function getInitialViewMode(): ViewMode {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  if (view === "grid" || view === "list") {
    return view;
  }

  return "grid";
}

export function syncUrlState(range: DashboardRange, view: ViewMode): void {
  const params = new URLSearchParams(window.location.search);
  params.set("range", range);
  params.set("view", view);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}

export function getInitialTheme(): ThemeMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: ThemeMode): void {
  localStorage.setItem("theme", theme);

  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }
}

export function getAdminRoute(): boolean {
  return window.location.pathname === "/admin";
}
