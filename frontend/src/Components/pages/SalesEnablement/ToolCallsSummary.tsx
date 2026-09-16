import { useEffect, useId, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, Wrench } from "lucide-react";

export interface ToolCallStep {
  id?: string;
  /** Short tool name shown in bold (e.g. retrieve, analyze, compose) */
  name: string;
  /** Action detail — file path, query, or command */
  detail?: string;
  status?: "success" | "error" | "running";
  durationMs?: number;
  additions?: number;
  deletions?: number;
}

export interface ToolCallsSummaryProps {
  calls: ToolCallStep[];
  /** Start expanded. Default false — collapses once the answer is ready. */
  defaultOpen?: boolean;
  /**
   * When true, starts open then collapses after the answer has landed
   * (used for the live generating panel / completed messages that should auto-close).
   */
  autoCollapse?: boolean;
  /** Delay before auto-collapse when autoCollapse is set. */
  autoCollapseMs?: number;
  className?: string;
}

function formatDuration(ms?: number): string | null {
  if (ms == null || Number.isNaN(ms)) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ToolCallsSummary({
  calls,
  defaultOpen = false,
  autoCollapse = false,
  autoCollapseMs = 600,
  className = "",
}: ToolCallsSummaryProps) {
  const [open, setOpen] = useState(autoCollapse ? true : defaultOpen);
  const panelId = useId();

  useEffect(() => {
    if (!autoCollapse) return;
    setOpen(true);
    const id = window.setTimeout(() => setOpen(false), autoCollapseMs);
    return () => window.clearTimeout(id);
  }, [autoCollapse, autoCollapseMs, calls]);

  if (!calls?.length) return null;

  const label = `${calls.length} tool call${calls.length === 1 ? "" : "s"}`;

  return (
    <div className={`tool_calls_summary ${className}`.trim()}>
      <button
        type="button"
        className="tool_calls_summary__header"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Wrench size={14} className="tool_calls_summary__wrench" aria-hidden />
        <span className="tool_calls_summary__count">{label}</span>
        {open ? (
          <ChevronUp size={14} className="tool_calls_summary__chevron" aria-hidden />
        ) : (
          <ChevronDown size={14} className="tool_calls_summary__chevron" aria-hidden />
        )}
      </button>

      {open && (
        <ul id={panelId} className="tool_calls_summary__list">
          {calls.map((call, index) => {
            const duration = formatDuration(call.durationMs);
            const status = call.status ?? "success";
            return (
              <li
                key={call.id ?? `${call.name}-${index}`}
                className={`tool_calls_summary__row tool_calls_summary__row--${status}`}
              >
                <span
                  className={`tool_calls_summary__status tool_calls_summary__status--${status}`}
                  aria-label={status}
                >
                  {status === "success" && <Check size={11} strokeWidth={3} aria-hidden />}
                  {status === "running" && (
                    <Loader2
                      size={11}
                      strokeWidth={2.5}
                      className="tool_calls_summary__status_spin"
                      aria-hidden
                    />
                  )}
                </span>
                <span className="tool_calls_summary__name">{call.name}</span>
                {call.detail && (
                  <span className="tool_calls_summary__detail" title={call.detail}>
                    {call.detail}
                  </span>
                )}
                {(call.additions != null || call.deletions != null) && status !== "running" && (
                  <span className="tool_calls_summary__diff">
                    {call.additions != null && call.additions > 0 && (
                      <span className="tool_calls_summary__diff--add">
                        +{call.additions}
                      </span>
                    )}
                    {call.deletions != null && call.deletions > 0 && (
                      <span className="tool_calls_summary__diff--del">
                        -{call.deletions}
                      </span>
                    )}
                  </span>
                )}
                {duration && status !== "running" && (
                  <span className="tool_calls_summary__time">{duration}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ToolCallsSummary;
