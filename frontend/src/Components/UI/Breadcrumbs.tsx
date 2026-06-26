import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import "./breadcrumbs.css";

export interface BreadcrumbItem {
  label: string;
  path?: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  /** List of items: string (label only) or { label, path?, onClick? } for link or action */
  items: (string | BreadcrumbItem)[];
}

function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const label = typeof item === "string" ? item : item.label;
        const path = typeof item === "string" ? undefined : item.path;
        const onClick = typeof item === "string" ? undefined : item.onClick;
        const isLast = index === items.length - 1;

        return (
          <span key={index} className="breadcrumb-segment">
            {onClick && !isLast ? (
              <button
                type="button"
                onClick={onClick}
                className="breadcrumb-link breadcrumb-button"
              >
                {label}
              </button>
            ) : path && !isLast ? (
              <Link to={path} className="breadcrumb-link">
                {label}
              </Link>
            ) : (
              <span className="breadcrumb-item">
                {label}
              </span>
            )}
            {!isLast && (
              <span className="breadcrumb-separator" aria-hidden>
                <ChevronRight size={14} />
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
