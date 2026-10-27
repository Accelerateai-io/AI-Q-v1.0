/**
 * Required-environment helpers. The server must refuse to start (or to sign/verify
 * tokens) rather than silently fall back to a well-known default secret or password.
 */

/** Return a trimmed required env var, or throw a clear, actionable error. */
export function requireEnv(name: string): string {
  const raw = process.env[name];
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `The server will not start without it. Set ${name} in backend/.env.local ` +
        `(or the real process environment) before deploying.`,
    );
  }
  return raw.trim();
}

/** Env vars that must exist for the server to boot. */
export const REQUIRED_SERVER_ENV = [
  "JWT_SECRET_KEY",
  "DATABASE_HOST",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
  "DATABASE_NAME",
] as const;

/** Names of required env vars that are missing or blank. */
export function missingServerEnv(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return REQUIRED_SERVER_ENV.filter((name) => {
    const v = env[name];
    return typeof v !== "string" || v.trim() === "";
  });
}

/** Throw a single clear error listing every missing required env var. */
export function assertServerEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = missingServerEnv(env);
  if (missing.length > 0) {
    throw new Error(
      `Server cannot start: missing required environment variable(s): ${missing.join(", ")}. ` +
        `Set them in backend/.env.local or the process environment and restart.`,
    );
  }
}
