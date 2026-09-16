import {
  getOrganizationInitials,
  isAiEvalOrganization,
} from "../../utils/organizationTypeDisplay";
import aiQLogo from "../../assets/images/mainLogo/new_logo/ai_q_logo_blue.png";
import "./OrgNameWithLogo.css";

type OrgNameWithLogoProps = {
  name?: string | null;
  /** Organization id — used to detect AI Eval (system admin) org. */
  id?: number | string | null;
  /** When set, the name is clickable (Organizations table). */
  onClick?: () => void;
  className?: string;
  /** Slightly smaller avatar for dense table cells. */
  size?: "sm" | "md";
};

/**
 * Organization name with a logo/initials avatar before it.
 * AI Eval (system admin) org uses the AI-Q logo; others use initials.
 */
export default function OrgNameWithLogo({
  name,
  id,
  onClick,
  className = "",
  size = "md",
}: OrgNameWithLogoProps) {
  const displayName = (name ?? "").trim() || "—";
  const hasName = displayName !== "—";
  const showAiQLogo = isAiEvalOrganization({
    id: id ?? undefined,
    organizationName: hasName ? displayName : undefined,
  });
  const initials = hasName ? getOrganizationInitials(displayName) : "?";

  const nameEl =
    onClick && hasName ? (
      <button
        type="button"
        className="org_name_with_logo__name org_name_with_logo__name--link"
        onClick={onClick}
      >
        {displayName}
      </button>
    ) : (
      <span className="org_name_with_logo__name">{displayName}</span>
    );

  return (
    <div
      className={[
        "org_name_with_logo",
        size === "sm" ? "org_name_with_logo--sm" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showAiQLogo ? (
        <span className="org_name_with_logo__avatar org_name_with_logo__avatar--logo" aria-hidden>
          <img src={aiQLogo} alt="" className="org_name_with_logo__img" />
        </span>
      ) : (
        <span className="org_name_with_logo__avatar" aria-hidden>
          {initials}
        </span>
      )}
      {nameEl}
    </div>
  );
}
