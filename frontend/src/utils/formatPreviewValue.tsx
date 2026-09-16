import React from "react"

/**
 * User-friendly preview formatting: never show raw arrays or JSON.
 * Use for multi-select, checkbox, and industry/dependent-dropdown values.
 * - Arrays → comma-separated list
 * - Objects (e.g. industry sector by category) → "Category: item1, item2" per line
 * - JSON strings → parsed then formatted as above
 */
export function formatPreviewValue(
  value: unknown,
  label?: string,
): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="vendor_preview_na">—</span>
  }

  const str = typeof value === "string" ? value.trim() : ""
  if (typeof value === "string" && (str.startsWith("[") || str.startsWith("{"))) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) {
        if (!parsed.length) return <span className="vendor_preview_na">—</span>
        if (typeof parsed[0] === "object" && parsed[0] !== null) {
          return (
            <ul className="vendor_preview_nested_list">
              {parsed.map((item, index) => (
                <li key={index}>
                  {formatObjectArrayItem(item as Record<string, unknown>)}
                </li>
              ))}
            </ul>
          )
        }
        return parsed.map((item) => String(item)).join(", ")
      }
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return formatPreviewObject(parsed as Record<string, unknown>)
      }
    } catch {
      // fall through to string display
    }
  }

  if (Array.isArray(value)) {
    if (!value.length) return <span className="vendor_preview_na">—</span>
    if (typeof value[0] === "object" && value[0] !== null)
      return (
        <ul className="vendor_preview_nested_list">
          {value.map((item, index) => (
            <li key={index}>{formatObjectArrayItem(item as Record<string, unknown>)}</li>
          ))}
        </ul>
      )
    return value.map((item) => String(item)).join(", ")
  }

  if (typeof value === "object") {
    return formatPreviewObject(value as Record<string, unknown>)
  }

  const displayStr = String(value)
  if (label?.toLowerCase().includes("email")) {
    return (
      <a href={`mailto:${displayStr}`} className="vendor_preview_link">
        {displayStr}
      </a>
    )
  }
  if (
    label?.toLowerCase().includes("website") ||
    label?.toLowerCase().includes("url") ||
    label?.toLowerCase().includes("trust centre")
  ) {
    const href = displayStr.startsWith("http") ? displayStr : `https://${displayStr}`
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="vendor_preview_link">
        {displayStr}
      </a>
    )
  }
  return displayStr
}

/**
 * Format object (e.g. industry sector: { "Public Sector": [...], "Private Sector": [...] })
 * as readable list: category name followed by comma-separated values.
 */
function formatPreviewObject(obj: Record<string, unknown>): React.ReactNode {
  const entries = Object.entries(obj).filter(([, v]) => {
    if (v == null || v === "") return false
    if (Array.isArray(v)) return v.length > 0
    return true
  })
  if (entries.length === 0) return <span className="vendor_preview_na">—</span>
  return (
    <ul className="vendor_preview_nested_list">
      {entries.map(([k, v]) => (
        <li key={k}>
          <span className="vendor_preview_nested_label">{formatLabel(k)}:</span>{" "}
          {Array.isArray(v) ? v.map((item) => String(item)).join(", ") : String(v)}
        </li>
      ))}
    </ul>
  )
}

function isIncidentLikeItem(item: Record<string, unknown>): boolean {
  return (
    ("date" in item || "summary" in item || "severity" in item) &&
    ("resolved" in item || "severity" in item)
  )
}

function formatIncidentItem(item: Record<string, unknown>): string {
  const date = item.date != null && String(item.date).trim() !== "" ? String(item.date) : "Date not provided"
  const summary = item.summary != null ? String(item.summary) : "No summary"
  const severity = item.severity != null && String(item.severity).trim() !== "" ? String(item.severity) : "unspecified"
  const resolved = item.resolved ? "resolved" : "open"
  return `${date} — ${severity} — ${resolved}: ${summary}`
}

function formatObjectArrayItem(item: Record<string, unknown>): string {
  if (isIncidentLikeItem(item)) return formatIncidentItem(item)
  return formatPreviewObjectAsString(item)
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/^./, (s) => s.toUpperCase())
}

/**
 * String-only formatter for places that need plain string (e.g. table cells).
 * Use when you don't need link/NA span (e.g. PreviewTable uses "N/A").
 */
export function formatPreviewValueAsString(value: unknown): string {
  if (value === null || value === undefined || value === "") return "N/A"
  const str = typeof value === "string" ? value.trim() : ""
  if (typeof value === "string" && (str.startsWith("[") || str.startsWith("{"))) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) {
        if (!parsed.length) return "N/A"
        if (typeof parsed[0] === "object" && parsed[0] !== null) {
          return parsed
            .map((item) => formatPreviewObjectAsString(item as Record<string, unknown>))
            .join("; ")
        }
        return parsed.map((item) => String(item)).join(", ")
      }
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return formatPreviewObjectAsString(parsed as Record<string, unknown>)
      }
    } catch {
      // fall through
    }
  }
  if (Array.isArray(value)) {
    if (!value.length) return "N/A"
    if (typeof value[0] === "object" && value[0] !== null) {
      return value
        .map((item) => formatObjectArrayItem(item as Record<string, unknown>))
        .join("; ")
    }
    return value.map((item) => String(item)).join(", ")
  }
  if (typeof value === "object") {
    return formatPreviewObjectAsString(value as Record<string, unknown>)
  }
  return String(value)
}

function formatPreviewObjectAsString(obj: Record<string, unknown>): string {
  const parts = Object.entries(obj)
    .filter(([, v]) => {
      if (v == null || v === "") return false
      if (Array.isArray(v)) return v.length > 0
      return true
    })
    .map(([k, v]) => {
      const label = formatLabel(k)
      const val = Array.isArray(v) ? v.map((item) => String(item)).join(", ") : String(v)
      return `${label}: ${val}`
    })
  return parts.length ? parts.join("; ") : "N/A"
}
