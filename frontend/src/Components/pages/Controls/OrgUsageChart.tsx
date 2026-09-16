import { useId } from "react";

type ChartSeries = {
  name: string;
  values: number[];
  color: string;
};

type OrgUsageChartProps = {
  title: string;
  hint?: string;
  labels: string[];
  series: ChartSeries[];
  variant?: "area" | "bars";
  yFormat?: (value: number) => string;
};

function formatLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * exp;
}

export function OrgUsageChart({
  title,
  hint,
  labels,
  series,
  variant = "area",
  yFormat,
}: OrgUsageChartProps) {
  const uid = useId().replace(/:/g, "");
  const width = 640;
  const height = 236;
  const pad = { top: 18, right: 18, bottom: 38, left: 58 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxValue = niceMax(
    Math.max(0, ...series.flatMap((s) => s.values.map((v) => Number(v) || 0))),
  );
  const count = Math.max(labels.length, 1);
  const xAt = (i: number) =>
    pad.left + (count === 1 ? innerW / 2 : (i / (count - 1)) * innerW);
  const yAt = (v: number) => pad.top + innerH - (v / maxValue) * innerH;
  const ticks = [0, 0.5, 1].map((p) => p * maxValue);
  const labelStep = Math.max(1, Math.ceil(labels.length / 6));
  const formatY = yFormat ?? ((v: number) => String(Math.round(v)));
  const hasData =
    labels.length > 0 &&
    series.some((s) => s.values.some((v) => Number(v) > 0));

  return (
    <figure className="orgControlChart">
      <div className="orgControlChart__head">
        <figcaption className="orgControlChart__title">{title}</figcaption>
        {hint ? <p className="orgControlChart__hint">{hint}</p> : null}
      </div>
      {hasData ? (
        <svg
          className="orgControlChart__svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
        >
          <defs>
            {series.map((s, idx) => (
              <linearGradient
                key={`${s.name}-grad`}
                id={`orgChartFill-${uid}-${idx}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={yAt(tick)}
                y2={yAt(tick)}
                className="orgControlChart__grid"
              />
              <text
                x={pad.left - 8}
                y={yAt(tick) + 4}
                className="orgControlChart__axis"
                textAnchor="end"
              >
                {formatY(tick)}
              </text>
            </g>
          ))}
          {variant === "bars"
            ? series.map((s, sIdx) =>
                s.values.map((raw, i) => {
                  const groupW = innerW / count;
                  const barW = Math.max(5, (groupW * 0.62) / series.length);
                  const x =
                    pad.left +
                    i * groupW +
                    (groupW - barW * series.length) / 2 +
                    sIdx * barW;
                  const value = Math.max(0, Number(raw) || 0);
                  const barH = (value / maxValue) * innerH;
                  return (
                    <rect
                      key={`${s.name}-${i}`}
                      x={x}
                      y={pad.top + innerH - barH}
                      width={barW}
                      height={barH}
                      fill={s.color}
                    />
                  );
                }),
              )
            : series.map((s, idx) => {
                const points = s.values.map((raw, i) => {
                  const x = xAt(i);
                  const y = yAt(Math.max(0, Number(raw) || 0));
                  return `${x},${y}`;
                });
                const area = `${pad.left},${pad.top + innerH} ${points.join(" ")} ${
                  width - pad.right
                },${pad.top + innerH}`;
                return (
                  <g key={s.name}>
                    <polygon
                      points={area}
                      fill={`url(#orgChartFill-${uid}-${idx})`}
                    />
                    <polyline
                      points={points.join(" ")}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2.25}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
          {labels.map((label, i) =>
            i % labelStep === 0 || i === labels.length - 1 ? (
              <text
                key={label + i}
                x={xAt(i)}
                y={height - 10}
                className="orgControlChart__axis"
                textAnchor="middle"
              >
                {formatLabel(label)}
              </text>
            ) : null,
          )}
        </svg>
      ) : (
        <p className="orgControlChart__empty">No usage in this date range.</p>
      )}
      {hasData && series.length > 1 ? (
        <ul className="orgControlChart__legend">
          {series.map((s) => (
            <li key={s.name}>
              <span style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
