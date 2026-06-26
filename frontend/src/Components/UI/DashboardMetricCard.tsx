import type { ReactNode } from "react"

export interface DashboardMetricCardProps {
  /** Card title (e.g. "Profile Completeness") */
  title: string
  /** Icon in top-right (default), or in front of title when iconPosition="left" (e.g. Shield for Trust Score) */
  icon?: ReactNode
  /** Main value (e.g. "100%", "2", "A+") */
  value: string | number
  /** Sub-text below value */
  description: string
  /** Optional progress 0–100; when set, shows a progress bar below value */
  progress?: number
  /** "grade" = green value (e.g. Trust Score A+) */
  valueVariant?: "default" | "grade"
  /** "left" = icon in front of title (same as Product Profile); default = icon top-right */
  iconPosition?: "left" | "right"
  /** When true, show loading state (spinner in value area, "Loading…" as description) */
  loading?: boolean
  className?: string
}

function DashboardMetricCard({
  title,
  icon,
  value,
  description,
  progress,
  valueVariant = "default",
  iconPosition = "right",
  loading = false,
  className = "",
}: DashboardMetricCardProps) {
  const iconLeft = iconPosition === "left" && icon != null;
  return (
    <div
      className={`vendor_overview_metric_card ${className}`.trim()}
      data-value-variant={valueVariant}
      data-icon-position={iconPosition}
      data-loading={loading ? "true" : undefined}
    >
      {icon != null && !iconLeft && (
        <span className="vendor_overview_metric_card_icon" aria-hidden>
          {icon}
        </span>
      )}
      {iconLeft ? (
        <div className="vendor_overview_metric_card_title_row">
          <span className="vendor_overview_metric_card_icon vendor_overview_metric_card_icon_left" aria-hidden>
            {icon}
          </span>
          <p className="vendor_overview_metric_title">{title}</p>
        </div>
      ) : (
        <p className="vendor_overview_metric_title">{title}</p>
      )}
      <p
        className={`vendor_overview_metric_value ${valueVariant === "grade" ? "vendor_overview_metric_value_grade" : ""} ${loading ? "vendor_overview_metric_value_loading" : ""}`.trim()}
      >
        {loading ? (
          <span className="vendor_overview_metric_loader" aria-live="polite" aria-busy="true">
            Loading…
          </span>
        ) : (
          value
        )}
      </p>
      {progress != null && (
        <div className="vendor_overview_progress_bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="vendor_overview_progress_fill"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
      <p className="vendor_overview_metric_desc">{loading ? "Loading…" : description}</p>
    </div>
  )
}

export default DashboardMetricCard
