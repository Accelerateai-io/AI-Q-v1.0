type ObservabilityMiniChartProps = {
  values: number[];
  tone?: "blue" | "green" | "amber";
  /** "bars" for column sparkline, "area" for filled line sparkline */
  variant?: "bars" | "area";
};

function normalizeValues(values: number[]): number[] {
  const cleaned = values
    .map((v) => (Number.isFinite(v) && v > 0 ? v : 0))
    .slice(-8);
  if (cleaned.length === 0) return [0.18, 0.28, 0.22, 0.35, 0.3, 0.42, 0.38];
  while (cleaned.length < 4) cleaned.unshift(0);
  const max = Math.max(...cleaned, 1);
  return cleaned.map((v) => Math.max(0.12, v / max));
}

/** Compact sparkline used inside Observability summary cards. */
export function ObservabilityMiniChart({
  values,
  tone = "blue",
  variant = "bars",
}: ObservabilityMiniChartProps) {
  const normalized = normalizeValues(values);

  if (variant === "area") {
    const width = 112;
    const height = 56;
    const step = width / Math.max(normalized.length - 1, 1);
    const points = normalized
      .map((v, i) => {
        const x = i * step;
        const y = height - v * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(" ");
    const area = `0,${height} ${points} ${width},${height}`;
    const stroke =
      tone === "green" ? "#16a34a" : tone === "amber" ? "#d97706" : "#2563eb";
    const fill =
      tone === "green"
        ? "rgba(22, 163, 74, 0.16)"
        : tone === "amber"
          ? "rgba(217, 119, 6, 0.16)"
          : "rgba(37, 99, 235, 0.16)";

    return (
      <svg
        className={`observabilityMiniChart observabilityMiniChart--${tone}`}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        aria-hidden
      >
        <polygon points={area} fill={fill} />
        <polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <div
      className={`observabilityMiniChart observabilityMiniChart--bars observabilityMiniChart--${tone}`}
      aria-hidden
    >
      {normalized.map((v, i) => (
        <span
          key={`${tone}-${i}`}
          style={{ height: `${Math.round(v * 100)}%` }}
        />
      ))}
    </div>
  );
}
