import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type DashboardStatAccent =
  | "green"
  | "orange"
  | "rose"
  | "teal"
  | "blue"
  | "violet";

export type DashboardStatCardProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: DashboardStatAccent;
  /** Short supporting line under the value. */
  description?: string;
  /** Optional 0–100 progress bar under the value. */
  progress?: number;
  /** Optional destination — makes the whole card clickable. */
  to?: string;
  /**
   * default: compact metric
   * hero: large centered option card
   * learning: horizontal Power Automate learning-style glance card
   */
  layout?: "default" | "hero" | "learning";
  className?: string;
};

/**
 * Metric / glance card used on vendor and buyer dashboards.
 */
function DashboardStatCard({
  label,
  value,
  icon,
  accent = "blue",
  description,
  progress,
  to,
  layout = "default",
  className = "",
}: DashboardStatCardProps) {
  const progressPct =
    typeof progress === "number" && Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : null;

  const classes = [
    "dash_stat_card",
    "dash_stat_card--lined",
    `dash_stat_card--${accent}`,
    layout === "hero" ? "dash_stat_card--hero" : "",
    layout === "learning" ? "dash_stat_card--learning" : "",
    description ? "dash_stat_card--rich" : "",
    progressPct !== null ? "dash_stat_card--progress" : "",
    to ? "dash_stat_card--link" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const progressBar =
    progressPct !== null ? (
      <div
        className="dash_stat_card__bar_track"
        role="progressbar"
        aria-valuenow={Math.round(progressPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} progress`}
      >
        <div
          className="dash_stat_card__bar_fill"
          style={{
            width: `${Math.min(
              100,
              Math.max(progressPct > 0 ? 8 : 0, progressPct),
            )}%`,
          }}
        />
      </div>
    ) : null;

  let body: ReactNode;
  if (layout === "learning") {
    body = (
      <>
        <span className="dash_stat_card__thumb" aria-hidden>
          {icon}
        </span>
        <div className="dash_stat_card__text">
          <p className="dash_stat_card__label">{label}</p>
          <div className="dash_stat_card__meta">
            <span className="dash_stat_card__badge">{value}</span>
            {description ? (
              <span className="dash_stat_card__meta_desc">{description}</span>
            ) : null}
          </div>
          {progressBar}
        </div>
      </>
    );
  } else if (layout === "hero") {
    body = (
      <>
        <span className="dash_stat_card__arcs" aria-hidden />
        <span className="dash_stat_card__icon" aria-hidden>
          {icon}
        </span>
        <div className="dash_stat_card__text">
          <p className="dash_stat_card__value">{value}</p>
          <p className="dash_stat_card__label">{label}</p>
          {progressBar}
          {description ? (
            <p className="dash_stat_card__desc">{description}</p>
          ) : null}
        </div>
      </>
    );
  } else {
    body = (
      <>
        <span className="dash_stat_card__arcs" aria-hidden />
        <div className="dash_stat_card__text">
          <p className="dash_stat_card__label">{label}</p>
          <p className="dash_stat_card__value">{value}</p>
          {progressBar}
          {description ? (
            <p className="dash_stat_card__desc">{description}</p>
          ) : null}
        </div>
        <span className="dash_stat_card__icon" aria-hidden>
          {icon}
        </span>
      </>
    );
  }

  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    );
  }

  return <div className={classes}>{body}</div>;
}

export default DashboardStatCard;
