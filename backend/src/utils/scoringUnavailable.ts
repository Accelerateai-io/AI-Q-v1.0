/**
 * Details for the `insufficient_data` case: what the formula could tell us about
 * which areas are unmeasured, so the UI can ask the user to complete them.
 */
export type InsufficientDataDetails = {
  classification?: string;
  pillarsMeasured?: number;
  pillarsTotal?: number;
  /** Human-readable labels for the pillars/areas that were not measured. */
  unmeasuredAreas?: string[];
};

/**
 * Raised when the authoritative (Python) scoring formula cannot produce a real
 * score. Two distinct reasons, handled differently by callers:
 *
 * - `scorer_failed` — the service errored/timed out. Store `report_status="failed"`
 *   and offer a **Retry** (regenerate) — retrying may succeed.
 * - `insufficient_data` — the user left a whole scoring area unanswered, so the
 *   score is withheld. Store `report_status="insufficient_data"`, keep the
 *   classification + unmeasured areas, and offer **Complete missing answers**
 *   (reopen the assessment) — a retry alone cannot help.
 *
 * Either way, callers must NEVER substitute a Node backup formula, a fixed neutral
 * score (e.g. 50 / grade B), or the LLM's own number.
 */
export class ScoringUnavailableError extends Error {
  readonly reason: "scorer_failed" | "insufficient_data";
  readonly cause?: unknown;
  readonly details?: InsufficientDataDetails;

  constructor(
    message: string,
    reason: "scorer_failed" | "insufficient_data" = "scorer_failed",
    cause?: unknown,
    details?: InsufficientDataDetails,
  ) {
    super(message);
    this.name = "ScoringUnavailableError";
    this.reason = reason;
    this.cause = cause;
    this.details = details;
  }
}

export function isScoringUnavailableError(
  err: unknown,
): err is ScoringUnavailableError {
  return err instanceof ScoringUnavailableError;
}
