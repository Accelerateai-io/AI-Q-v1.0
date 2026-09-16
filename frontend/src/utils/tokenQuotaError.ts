export const TOKEN_QUOTA_EXCEEDED_CODE = "TOKEN_QUOTA_EXCEEDED";

export const TOKEN_QUOTA_FALLBACK_MESSAGE =
  "Your token allocation for this feature is exhausted. Ask your platform admin to allocate more tokens.";

type ApiErrorPayload = {
  code?: unknown;
  message?: unknown;
} | null | undefined;

export function isTokenQuotaExceeded(payload: ApiErrorPayload): boolean {
  return payload?.code === TOKEN_QUOTA_EXCEEDED_CODE;
}

export function isTokenQuotaExceededMessage(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  return /token quota is exhausted|token allocation is exhausted|no tokens have been allocated|contact platform admin|ask your platform admin/i.test(
    message,
  );
}

/** User-facing copy when an LLM call is blocked because tokens were consumed. */
export function apiErrorMessage(
  payload: ApiErrorPayload,
  fallback: string,
): string {
  const message =
    typeof payload?.message === "string" ? payload.message.trim() : "";
  if (isTokenQuotaExceeded(payload) || isTokenQuotaExceededMessage(message)) {
    return message || TOKEN_QUOTA_FALLBACK_MESSAGE;
  }
  return message || fallback;
}

export function errorToUserMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (isTokenQuotaExceededMessage(message)) {
    return message.trim() || TOKEN_QUOTA_FALLBACK_MESSAGE;
  }
  // Gateway 504/502 HTML bodies are not JSON; Firefox/Chrome then throw JSON.parse.
  if (
    /JSON\.parse|unexpected character|unexpected token|is not valid JSON/i.test(
      message,
    )
  ) {
    return "Submit timed out. Check Assessments — it may already be saved. Refresh Reports in a minute if the report is not listed yet.";
  }
  return message.trim() || fallback;
}
