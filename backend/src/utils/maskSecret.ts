/**
 * Mask a secret for display, revealing at most the last 4 characters.
 *   ""            -> ""            (nothing configured)
 *   "ab"          -> "****"        (too short to reveal safely)
 *   "sk-abcd1234" -> "****1234"
 */
export function maskSecret(value: string | null | undefined): string {
  const s = String(value ?? "");
  if (s.length === 0) return "";
  if (s.length <= 4) return "****";
  return `****${s.slice(-4)}`;
}
