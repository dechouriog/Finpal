"use client";

import { motion } from "framer-motion";

export type DonutSegment = { label: string; color: string; value: number };

/** Animated allocation donut. Segments draw in sequence with a small gap between them. */
export function Donut({
  segments,
  size = 180,
  thickness = 22,
  centerTop,
  centerMain,
  ariaLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerTop?: string;
  centerMain?: string;
  ariaLabel: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const gap = segments.filter((s) => s.value > 0).length > 1 ? 0.012 : 0;
  let start = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#E2E8F0" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((seg, i) => {
            const frac = seg.value / total;
            const rotate = -90 + start * 360;
            start += frac;
            if (frac <= 0) return null;
            return (
              <motion.circle
                key={seg.label}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                transform={`rotate(${rotate} ${c} ${c})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: Math.max(frac - gap, 0.001) }}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
      </svg>
      {(centerTop || centerMain) && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            {centerTop && <p className="text-xs text-muted">{centerTop}</p>}
            {centerMain && <p className="font-display text-lg font-extrabold text-ink tabular">{centerMain}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
