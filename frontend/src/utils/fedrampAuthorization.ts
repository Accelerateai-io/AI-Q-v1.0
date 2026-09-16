import {
  FEDRAMP_LEVEL_OPTIONS,
  FEDRAMP_STATUS_OPTIONS,
} from "../constants/vendorAttestationOptions"
import type { FedrampAuthorization } from "../types/vendorSelfAttestation"

export const EMPTY_FEDRAMP_AUTHORIZATION: FedrampAuthorization = {
  status: "",
  level: "",
  boundary: "",
  marketplace_id: "",
  authorized_at: "",
}

export const FEDRAMP_DETAILS_STATUSES = ["authorized", "in_process"] as const

export function needsFedrampDetails(status?: string | null): boolean {
  return FEDRAMP_DETAILS_STATUSES.includes(
    (status ?? "") as (typeof FEDRAMP_DETAILS_STATUSES)[number],
  )
}

export function normalizeFedrampAuthorization(raw: unknown): FedrampAuthorization {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw))
    return { ...EMPTY_FEDRAMP_AUTHORIZATION }
  const value = raw as Record<string, unknown>
  return {
    status: value.status != null ? String(value.status) : "",
    level: value.level != null ? String(value.level) : "",
    boundary: value.boundary != null ? String(value.boundary) : "",
    marketplace_id:
      value.marketplace_id != null
        ? String(value.marketplace_id)
        : value.marketplaceId != null
          ? String(value.marketplaceId)
          : "",
    authorized_at:
      value.authorized_at != null
        ? String(value.authorized_at)
        : value.authorizedAt != null
          ? String(value.authorizedAt)
          : "",
  }
}

export function formatFedrampAuthorization(raw: unknown): string {
  const fedramp = normalizeFedrampAuthorization(raw)
  if (!fedramp.status.trim()) return "N/A"
  const statusLabel =
    FEDRAMP_STATUS_OPTIONS.find((option) => option.value === fedramp.status)?.label ??
    fedramp.status
  const parts = [statusLabel]
  if (needsFedrampDetails(fedramp.status)) {
    if (fedramp.level) {
      const levelLabel =
        FEDRAMP_LEVEL_OPTIONS.find((option) => option.value === fedramp.level)?.label ??
        fedramp.level
      parts.push(`Level: ${levelLabel}`)
    }
    if (fedramp.boundary) parts.push(`Boundary: ${fedramp.boundary}`)
    if (fedramp.marketplace_id) parts.push(`Marketplace ID: ${fedramp.marketplace_id}`)
    if (fedramp.authorized_at) parts.push(`Authorized: ${fedramp.authorized_at}`)
  }
  return parts.join(" · ")
}
