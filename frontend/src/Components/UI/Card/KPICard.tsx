import Card from "./Card";
import "./Card.css";

export type KPIVariant = "trust" | "inherent" | "mitigation" | "residual";

type KPICardProps = {
  value: string | number;
  label: string;
  variant?: KPIVariant;
  className?: string;
};

const KPICard = ({ value, label, variant = "trust", className = "" }: KPICardProps) => {
  const valueClass = variant ? `card__value card__value--${variant}` : "card__value";
  return (
    <Card className={`card--kpi ${className}`.trim()}>
      <span className={valueClass}>{value}</span>
      <span className="card__label">{label}</span>
    </Card>
  );
};

export default KPICard;
