import { useEffect, useMemo, useState } from "react";
import {
  getDashboardGreetingHighlights,
  getDashboardGreetingLoop,
} from "../../utils/dashboardGreeting";

type Props = {
  role: "buyer" | "vendor";
  className?: string;
};

type TextPart = { text: string; highlight: boolean };

/** Split typed characters so highlight phrases (partial or full) can be styled. */
function splitHighlights(
  display: string,
  full: string,
  highlights: string[],
): TextPart[] {
  if (!display) return [];

  const ranges: { start: number; end: number }[] = [];
  for (const phrase of highlights) {
    if (!phrase) continue;
    let from = 0;
    while (from < full.length) {
      const idx = full.indexOf(phrase, from);
      if (idx < 0) break;
      ranges.push({ start: idx, end: idx + phrase.length });
      from = idx + phrase.length;
    }
  }

  if (ranges.length === 0) return [{ text: display, highlight: false }];

  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  const parts: TextPart[] = [];
  const limit = display.length;
  let cursor = 0;

  for (const range of merged) {
    if (cursor >= limit) break;
    if (range.end <= cursor) continue;

    if (range.start > cursor) {
      const end = Math.min(range.start, limit);
      if (end > cursor) {
        parts.push({ text: display.slice(cursor, end), highlight: false });
      }
      cursor = end;
    }

    if (cursor >= limit) break;

    if (range.start <= cursor && range.end > cursor) {
      const end = Math.min(range.end, limit);
      parts.push({ text: display.slice(cursor, end), highlight: true });
      cursor = end;
    }
  }

  if (cursor < limit) {
    parts.push({ text: display.slice(cursor), highlight: false });
  }

  return parts.filter((p) => p.text.length > 0);
}

/**
 * Centered typewriter headline that loops dashboard greetings.
 */
export default function DashboardTypewriterGreeting({ role, className }: Props) {
  const texts = useMemo(() => getDashboardGreetingLoop(role), [role]);
  const highlights = useMemo(() => getDashboardGreetingHighlights(role), [role]);
  const [textIndex, setTextIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [phase, setPhase] = useState<"typing" | "deleting">("typing");

  const full = texts[textIndex % texts.length] ?? "";
  const parts = splitHighlights(display, full, highlights);

  useEffect(() => {
    let id: number;

    if (phase === "typing") {
      if (display.length < full.length) {
        id = window.setTimeout(
          () => setDisplay(full.slice(0, display.length + 1)),
          42,
        );
      } else {
        id = window.setTimeout(() => setPhase("deleting"), 2200);
      }
    } else if (display.length > 0) {
      id = window.setTimeout(() => setDisplay((d) => d.slice(0, -1)), 26);
    } else {
      id = window.setTimeout(() => {
        setTextIndex((i) => (i + 1) % texts.length);
        setPhase("typing");
      }, 280);
    }

    return () => window.clearTimeout(id);
  }, [display, phase, full, texts.length]);

  return (
    <h1
      className={className ?? "dash_greeting_title"}
      aria-live="polite"
      aria-label={full}
    >
      <span className="dash_typewriter_text">
        {parts.map((part, i) =>
          part.highlight ? (
            <span key={i} className="dash_typewriter_name">
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
      </span>
      <span className="dash_typewriter_caret" aria-hidden />
    </h1>
  );
}
