export type AppTheme = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "aiq-theme";

export function getStoredTheme(): AppTheme {
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

function resolveTheme(theme: AppTheme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

/** Applies the resolved light/dark theme to <html data-theme="..."> */
export function applyTheme(theme: AppTheme) {
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-preference", theme);
}

export function setTheme(theme: AppTheme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

/** Call once at app boot; also listens for OS theme changes when preference is "system". */
export function initTheme() {
  applyTheme(getStoredTheme());

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (getStoredTheme() === "system") applyTheme("system");
  };
  media.addEventListener("change", onChange);
}
