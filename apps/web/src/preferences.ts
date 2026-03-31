import type { DashboardRange } from "@model-status/shared";
import { stripBasePath } from "./basePath";

export type ViewMode = "grid" | "list";

export type ThemeMode = "dark" | "light";

const STORAGE_KEYS = {
  range: "dashboard-range",
  view: "dashboard-view",
  theme: "theme",
} as const;

export function getInitialRange(): DashboardRange {
  const params = new URLSearchParams(window.location.search);
  const range = params.get("range");

  if (range === "90m" || range === "24h" || range === "7d" || range === "30d") {
    return range;
  }

  const storedRange = localStorage.getItem(STORAGE_KEYS.range);
  if (storedRange === "90m" || storedRange === "24h" || storedRange === "7d" || storedRange === "30d") {
    return storedRange;
  }

  return "90m";
}

export function getInitialViewMode(): ViewMode {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  if (view === "grid" || view === "list") {
    return view;
  }

  const storedView = localStorage.getItem(STORAGE_KEYS.view);
  if (storedView === "grid" || storedView === "list") {
    return storedView;
  }

  return "list";
}

export function syncUrlState(range: DashboardRange, view: ViewMode): void {
  const params = new URLSearchParams(window.location.search);
  params.set("range", range);
  params.set("view", view);
  localStorage.setItem(STORAGE_KEYS.range, range);
  localStorage.setItem(STORAGE_KEYS.view, view);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}

export function getInitialTheme(): ThemeMode {
  const storedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: ThemeMode): void {
  localStorage.setItem(STORAGE_KEYS.theme, theme);

  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }
}

export function getAdminRoute(): boolean {
  return stripBasePath(window.location.pathname) === "/admin";
}
