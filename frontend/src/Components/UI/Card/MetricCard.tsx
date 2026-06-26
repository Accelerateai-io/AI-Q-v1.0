import type { ReactNode } from "react";
import Card from "./Card";
import "./Card.css";

type MetricCardProps = {
  icon?: ReactNode;
  title: string;
  value: string | number;
  description: string;
  className?: string;
};

const MetricCard = ({ icon, title, value, description, className = "" }: MetricCardProps) => {
  return (
    <Card className={`card--metric ${className}`.trim()}>
      {icon && <span className="card__icon" aria-hidden>{icon}</span>}
      <p className="card__metric-title">{title}</p>
      <p className="card__metric-value">{value}</p>
      <p className="card__metric-desc">{description}</p>
    </Card>
  );
};

export default MetricCard;
