/**
 * Shared outbound headers for Node -> Python scoring service calls.
 *
 * The Python service (FastAPI, port 5004) has no per-user auth; Node is its only
 * caller. When PY_SERVICE_KEY is configured on both sides, every Node request
 * carries it as X-Service-Key and Python rejects requests without it.
 */
const SERVICE_KEY_HEADER = "X-Service-Key";

/** Merge the shared service-key header into caller-provided headers (when configured). */
export function pythonServiceHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const key = (process.env.PY_SERVICE_KEY ?? "").trim();
  return key ? { ...extra, [SERVICE_KEY_HEADER]: key } : { ...extra };
}
