import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ensureSpaceAfterColon } from "../../utils/summarizeRiskPoints";
import "./show_more_text.css";

type ShowMoreTextProps = {
  children: ReactNode;
  lines?: number;
  className?: string;
};

export function ShowMoreText({ children, lines = 4, className = "" }: ShowMoreTextProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      if (expanded) return;
      const el = ref.current;
      if (!el) return;
      setCanExpand(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const id = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", measure);
    };
  }, [expanded, children, lines]);

  return (
    <div className={`report_show_more ${className}`.trim()}>
      <div
        ref={ref}
        className={`report_show_more_body${expanded ? " report_show_more_body_expanded" : ""}`}
        style={{ ["--show-more-lines" as string]: String(lines) }}
      >
        {children}
      </div>
      {canExpand || expanded ? (
        <button
          type="button"
          className="report_show_more_btn"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Show less" : "Show more"}
          {expanded ? (
            <ChevronUp size={12} strokeWidth={2.25} aria-hidden />
          ) : (
            <ChevronDown size={12} strokeWidth={2.25} aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}

type ShowMoreListProps = {
  items: string[];
  previewCount?: number;
  empty?: string;
  className?: string;
};

export function ShowMoreList({
  items,
  previewCount = 3,
  empty = "Not specified",
  className = "ira_gap_list",
}: ShowMoreListProps) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) {
    return <p className="report_show_more_empty">{empty}</p>;
  }
  const canExpand = items.length > previewCount;
  return (
    <div className="report_show_more">
      <ul className={className}>
        {items.map((item, i) => (
          <li
            key={i}
            className={
              !expanded && canExpand && i >= previewCount ? "report_show_more_item_hidden" : undefined
            }
          >
            {ensureSpaceAfterColon(item)}
          </li>
        ))}
      </ul>
      {canExpand ? (
        <button
          type="button"
          className="report_show_more_btn"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Show less" : `Show more (${items.length - previewCount})`}
          {expanded ? (
            <ChevronUp size={12} strokeWidth={2.25} aria-hidden />
          ) : (
            <ChevronDown size={12} strokeWidth={2.25} aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}
