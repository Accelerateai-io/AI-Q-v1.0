import { useEffect, useState } from "react"
import "./SubmitProgressOverlay.css"

export type SubmitProgressVariant = "attestation" | "assessment"

interface SubmitProgressOverlayProps {
  variant?: SubmitProgressVariant
  /** Override the uppercase status line above the headline */
  tagline?: string
  /** Override the main serif headline (period is styled separately) */
  headline?: string
  /** Override the supporting description */
  description?: string
  /** Override footer trailing note after elapsed time */
  footerNote?: string
  /** Accessible name for the status region */
  ariaLabel?: string
}

const COPY: Record<
  SubmitProgressVariant,
  { tagline: string; headline: string; description: string; ariaLabel: string }
> = {
  attestation: {
    tagline: "Evaluating attestation evidence",
    headline: "Building a profile that can explain itself",
    description:
      "Normalizing shared responses, validating controls and evidence, scoring maturity, and composing your product profile.",
    ariaLabel: "Submitting attestation and generating product profile",
  },
  assessment: {
    tagline: "Evaluating assessment responses",
    headline: "Building a plan that can explain itself",
    description:
      "Scoring fit, mapping risks, reconciling evidence, proving coverage, and composing your assessment report.",
    ariaLabel: "Submitting assessment",
  },
}

/**
 * Full-screen cinematic progress UI shown while attestation/assessment submit runs.
 */
function SubmitProgressOverlay({
  variant = "assessment",
  tagline,
  headline,
  description,
  footerNote = "no partial result will be saved",
  ariaLabel,
}: SubmitProgressOverlayProps) {
  const copy = COPY[variant]
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const resolvedTagline = tagline ?? copy.tagline
  const resolvedHeadline = headline ?? copy.headline
  const resolvedDescription = description ?? copy.description
  const resolvedAriaLabel = ariaLabel ?? copy.ariaLabel
  const elapsedLabel =
    elapsedSeconds === 1 ? "Elapsed 1 second" : `Elapsed ${elapsedSeconds} seconds`

  return (
    <div
      className="submit_progress_overlay"
      role="status"
      aria-live="polite"
      aria-label={resolvedAriaLabel}
    >
      <div className="submit_progress_overlay_inner">
        <div className="submit_progress_spinner" aria-hidden />
        <p className="submit_progress_tagline">{resolvedTagline}</p>
        <h1 className="submit_progress_headline">
          {resolvedHeadline}
          <span className="submit_progress_headline_dot" aria-hidden>
            .
          </span>
        </h1>
        <p className="submit_progress_description">{resolvedDescription}</p>
        <p className="submit_progress_footer">
          {elapsedLabel}
          <span className="submit_progress_footer_sep" aria-hidden>
            ·
          </span>
          {footerNote}
        </p>
      </div>
    </div>
  )
}

export default SubmitProgressOverlay
