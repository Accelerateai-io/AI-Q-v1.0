import "../../styles/card.css";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

const CardOnBoarding = ({ children, className = "" }: CardProps) => {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
};

export default CardOnBoarding;
