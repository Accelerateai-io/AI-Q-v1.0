import Card from "./Card";
import "./Card.css";

export type RiskVariant = "very_low" | "low" | "medium" | "high";

type RiskCardProps = {
  category: string;
  level: string;
  variant?: RiskVariant;
  className?: string;
};

const RiskCard = ({ category, level, variant = "low", className = "" }: RiskCardProps) => {
  const pillClass = variant ? `card__pill card__pill--${variant}` : "card__pill";
  const borderClass = variant === "low" || variant === "very_low" ? " card--risk--low-border" : "";
  return (
    <Card compact className={`card--risk${borderClass} ${className}`.trim()}>
      <span className="card__category">{category}</span>
      <span className={pillClass}>{level}</span>
    </Card>
  );
};

export default RiskCard;
