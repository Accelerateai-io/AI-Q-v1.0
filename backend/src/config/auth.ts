/**
 * Shared JWT config so login and auth middleware always use the same secret and behaviour.
 * Ensures tokens issued at login validate when verifying.
 *
 * No fallback secret: if JWT_SECRET_KEY is missing, getJwtSecret() throws (and the
 * boot check in server.ts refuses to start) rather than signing tokens with a
 * well-known default that an attacker could forge.
 */
import { requireEnv } from "./requireEnv.js";

const JWT_EXPIRY = "7d";

export function getJwtSecret(): string {
  return requireEnv("JWT_SECRET_KEY");
}
 
export function getJwtExpiry(): string {

  return JWT_EXPIRY;

}
 
