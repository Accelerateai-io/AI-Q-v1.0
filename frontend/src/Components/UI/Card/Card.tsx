import type { ReactNode } from "react";
import "./Card.css";

type CardProps = {
  children: ReactNode;
  className?: string;
  compact?: boolean;
};

const Card = ({ children, className = "", compact = false }: CardProps) => {
  return (
    <div className={`cards ${compact ? "card--compact" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
};

export default Card;
