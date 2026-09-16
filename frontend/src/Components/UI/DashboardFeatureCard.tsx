import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export type DashboardFeatureAccent =
  | "primary"
  | "violet"
  | "amber"
  | "rose"
  | "sky"
  | "teal"
  | "gold"
  | "orange";

export type DashboardFeatureCardProps = {
  /** When omitted, renders a non-clickable card (for informational grids). */
  to?: string;
  title: string;
  description: string;
  icon: ReactNode;
  /** Featured light-blue card (classic variant). */
  featured?: boolean;
  /** Decorative arc color for classic non-featured cards. */
  accent?: DashboardFeatureAccent;
  /** Optional count/status label in the footer (classic). */
  footerLabel?: string;
  /**
   * classic: corner icon + arcs + footer CTA
   * pa: Power Automate-style icon well + gradient icon + title/desc
   */
  variant?: "classic" | "pa";
  className?: string;
};

/**
 * Dashboard quick-action / metric feature card.
 */
function DashboardFeatureCard({
  to,
  title,
  description,
  icon,
  featured = false,
  accent = "violet",
  footerLabel,
  variant = "classic",
  className = "",
}: DashboardFeatureCardProps) {
  const isPa = variant === "pa";
  const classes = [
    "dash_feature_card",
    isPa ? "dash_feature_card--pa" : "",
    !to ? "dash_feature_card--static" : "",
    featured && !isPa ? "dash_feature_card--featured" : "",
    !isPa && !featured ? `dash_feature_card--${accent}` : "",
    isPa ? `dash_feature_card--pa_${accent}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  let body: ReactNode;
  if (isPa) {
    body = (
      <>
        <span className="dash_feature_card__well" aria-hidden>
          <span className="dash_feature_card__ripple dash_feature_card__ripple--outer" />
          <span className="dash_feature_card__ripple dash_feature_card__ripple--mid" />
          <span className="dash_feature_card__icon">{icon}</span>
        </span>
        <div className="dash_feature_card__content">
          <h3 className="dash_feature_card__title">{title}</h3>
          <p className="dash_feature_card__desc">{description}</p>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <span className="dash_feature_card__icon" aria-hidden>
          {icon}
        </span>
        <div className="dash_feature_card__content">
          <h3 className="dash_feature_card__title">{title}</h3>
          <p className="dash_feature_card__desc">{description}</p>
        </div>
        <div className="dash_feature_card__footer">
          {featured ? (
            <span className="dash_feature_card__cta" aria-hidden>
              <ArrowRight size={18} strokeWidth={2.25} />
            </span>
          ) : (
            <>
              {footerLabel ? (
                <span className="dash_feature_card__footer_label">
                  {footerLabel}
                </span>
              ) : null}
              <ArrowRight
                size={16}
                strokeWidth={2}
                className="dash_feature_card__arrow"
                aria-hidden
              />
            </>
          )}
        </div>
        {!featured ? (
          <span className="dash_feature_card__arcs" aria-hidden />
        ) : null}
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

  return (
    <div className={classes} role="group">
      {body}
    </div>
  );
}

export default DashboardFeatureCard;
