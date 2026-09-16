/**
 * Single source for API base URL.
 * Uses VITE_BASE_URL when set; falls back only when the env var is missing/empty.
 */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_BASE_URL ?? "").toString().trim()
  if (!raw) return "http://localhost:5003/api/v1"
  return raw.replace(/\/+$/, "")
}
