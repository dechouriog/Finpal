"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotionConfig } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Pal — Finpal's investing buddy. An original character: a round, chunky coin
 * (teal face, warm gold rim) with a friendly face and a little sprout on top that
 * grows with the user's progress. No currency symbols, no logos, no up-arrows:
 * Pal is about habits and patience, never guaranteed gains.
 */

export type PalMood = "idle" | "wave" | "listening" | "thinking" | "excited" | "serious" | "proud" | "oops";
export const PAL_MOODS: PalMood[] = ["idle", "wave", "listening", "thinking", "excited", "serious", "proud", "oops"];

export { PAL_STAGES, type PalStage } from "@/lib/pal";
import type { PalStage } from "@/lib/pal";

export const PAL_LABEL = "Pal, your Finpal investing buddy";

// ---- palette ----
const TEAL = "#00C2A8";
const TEAL_DEEP = "#00A38E";
const GOLD = "#F5B83D";
const GOLD_DEEP = "#D99A1E"; // coin edge for depth
const NAVY = "#0B3D91";
const BLUSH = "#FF8A80";
const GREEN = "#16A34A";
const LEAF = "#4ADE80";

// ---- geometry (viewBox 0 0 128 128) ----
const VB = 128;
const COIN = { cx: 64, cy: 78, r: 42 }; // gold rim
const FACE_R = 36; // teal face
const SPROUT_BASE = { x: 64, y: COIN.cy - COIN.r + 1 }; // top of the coin
const EYE_L = { x: 51, y: 76 };
const EYE_R = { x: 77, y: 76 };
const EASE = [0.22, 1, 0.36, 1] as const;

type Look = { x: number; y: number };
const MOOD_LOOK: Record<PalMood, Look> = {
  idle: { x: 0, y: 0 },
  wave: { x: 0, y: 0 },
  listening: { x: 1, y: 2.6 }, // toward the input below
  thinking: { x: -1.6, y: -3 }, // up and away
  excited: { x: 0, y: 0 },
  serious: { x: 0, y: 0.6 },
  proud: { x: 0, y: 0 },
  oops: { x: 2.8, y: 0.8 },
};

type Brow = { y: number; rotate: number };
const MOOD_BROWS: Record<PalMood, [Brow, Brow]> = {
  idle: [{ y: 0, rotate: 0 }, { y: 0, rotate: 0 }],
  wave: [{ y: -1.5, rotate: -4 }, { y: -1.5, rotate: 4 }],
  listening: [{ y: -0.5, rotate: 0 }, { y: -0.5, rotate: 0 }],
  thinking: [{ y: -2.5, rotate: -10 }, { y: -0.5, rotate: 4 }],
  excited: [{ y: -4.5, rotate: -6 }, { y: -4.5, rotate: 6 }],
  serious: [{ y: 1.2, rotate: 0 }, { y: 1.2, rotate: 0 }],
  proud: [{ y: -2.5, rotate: -4 }, { y: -2.5, rotate: 4 }],
  oops: [{ y: -4.5, rotate: -12 }, { y: 1, rotate: 0 }],
};

/** Mouth shapes, centered under the eyes (x 64, y ~92). */
function Mouth({ mood }: { mood: PalMood }) {
  const stroke = { fill: "none", stroke: NAVY, strokeWidth: 3.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (mood) {
    case "wave":
      return <path d="M54 89 Q64 100 74 89" {...stroke} />;
    case "listening":
      return <path d="M58 91 Q64 95.5 70 91" {...stroke} />;
    case "thinking":
      return <path d="M59 93.5 Q62 91.5 65 93.5 T71 93" {...stroke} />;
    case "excited":
      return (
        <g>
          <path d="M53 88 Q64 106 75 88 Z" fill={NAVY} stroke={NAVY} strokeWidth={2} strokeLinejoin="round" />
          <ellipse cx={64} cy={96.5} rx={5} ry={2.6} fill={BLUSH} />
        </g>
      );
    case "serious":
      return <path d="M57.5 93 L70.5 93" {...stroke} />;
    case "proud":
      return <path d="M55 89 Q64 102 73 89 Z" fill={NAVY} stroke={NAVY} strokeWidth={2} strokeLinejoin="round" />;
    case "oops":
      return <path d="M56.5 94 Q60 90.5 64 93.5 T72 91.5" {...stroke} />;
    default:
      return <path d="M56 90 Q64 97 72 90" {...stroke} />;
  }
}

/** A leaf as a rounded teardrop, pointing right; rotate/scale to place it. */
const LEAF_PATH = "M0 0 C4 -6 12 -7 16 -2 C11 3 4 4 0 0 Z";

function Leaf({ x, y, rotate, scale = 1, light = false }: { x: number; y: number; rotate: number; scale?: number; light?: boolean }) {
  return (
    <path
      d={LEAF_PATH}
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}
      fill={light ? LEAF : GREEN}
      stroke={GREEN}
      strokeWidth={light ? 1 : 0}
    />
  );
}

/** The growth on top of the coin, by stage. */
function Growth({ stage }: { stage: PalStage }) {
  const { x, y } = SPROUT_BASE;
  const stem = { stroke: GREEN, strokeWidth: 3.2, strokeLinecap: "round" as const, fill: "none" };
  switch (stage) {
    case "seed":
      // A tiny seed peeking out of the coin.
      return (
        <g>
          <ellipse cx={x} cy={y - 3.5} rx={4.6} ry={5.6} fill={LEAF} stroke={GREEN} strokeWidth={1.4} />
          <path d={`M${x - 1.5} ${y - 6} Q${x} ${y - 9} ${x + 1.8} ${y - 6.5}`} fill="none" stroke={GREEN} strokeWidth={1.3} strokeLinecap="round" />
        </g>
      );
    case "sprout":
      return (
        <g>
          <path d={`M${x} ${y} Q${x - 1} ${y - 8} ${x} ${y - 14}`} {...stem} />
          <Leaf x={x} y={y - 13} rotate={-150} scale={0.95} />
          <Leaf x={x} y={y - 13} rotate={-30} scale={0.95} light />
        </g>
      );
    case "plant":
      return (
        <g>
          <path d={`M${x} ${y} Q${x + 1.5} ${y - 12} ${x} ${y - 24}`} {...stem} />
          <Leaf x={x + 0.5} y={y - 9} rotate={-160} scale={0.85} light />
          <Leaf x={x + 0.8} y={y - 12} rotate={-20} scale={0.85} />
          <Leaf x={x} y={y - 23} rotate={-145} scale={0.9} />
          <Leaf x={x} y={y - 23} rotate={-35} scale={0.9} light />
        </g>
      );
    case "tree":
      return (
        <g>
          <path d={`M${x} ${y} L${x} ${y - 14}`} stroke="#15803D" strokeWidth={4.5} strokeLinecap="round" />
          <circle cx={x} cy={y - 23} r={13} fill={GREEN} />
          <circle cx={x - 8} cy={y - 18} r={7.5} fill={GREEN} />
          <circle cx={x + 8.5} cy={y - 18.5} r={7.5} fill={GREEN} />
          <circle cx={x - 4} cy={y - 27} r={5} fill={LEAF} opacity={0.85} />
          <circle cx={x + 5} cy={y - 21} r={3} fill={LEAF} opacity={0.7} />
        </g>
      );
  }
}

/** Tiny rounded arms; only shown for gestures. */
function Arms({ mood, animate }: { mood: PalMood; animate: boolean }) {
  const arm = { fill: "none", stroke: GOLD_DEEP, strokeWidth: 7, strokeLinecap: "round" as const };
  if (mood === "wave") {
    return (
      <motion.g
        key="wave"
        style={{ originX: 0, originY: 1 }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={animate ? { opacity: 1, scale: 1, rotate: [0, -18, 10, -18, 10, 0] } : { opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.4 }}
        transition={animate ? { duration: 1.2, ease: "easeOut" } : { duration: 0 }}
      >
        <path d="M104 84 L117 68" {...arm} />
        <circle cx={118} cy={66} r={4.8} fill={GOLD_DEEP} />
      </motion.g>
    );
  }
  if (mood === "excited") {
    return (
      <motion.g key="excited" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
        <path d="M24 86 L10 74" {...arm} />
        <path d="M104 86 L118 74" {...arm} />
      </motion.g>
    );
  }
  if (mood === "proud") {
    // Thumbs-up beside the coin.
    return (
      <motion.g key="proud" initial={{ opacity: 0, y: 6, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
        <path d="M104 92 L114 88" {...arm} />
        <rect x={110} y={81} width={12} height={11} rx={4.5} fill={GOLD_DEEP} />
        <path d="M114 82 L114 74.5" {...arm} strokeWidth={5.5} />
      </motion.g>
    );
  }
  return null;
}

/** Four-point sparkles (proud burst, and when the plant grows). */
function Sparkles({ animate, spots }: { animate: boolean; spots: { x: number; y: number; s: number }[] }) {
  return (
    <g aria-hidden>
      {spots.map((p, i) => (
        <motion.path
          key={i}
          d="M0 -6 C0.8 -1.6 1.6 -0.8 6 0 C1.6 0.8 0.8 1.6 0 6 C-0.8 1.6 -1.6 0.8 -6 0 C-1.6 -0.8 -0.8 -1.6 0 -6 Z"
          fill={i % 2 ? TEAL : GOLD}
          initial={animate ? { opacity: 0, scale: 0 } : false}
          animate={{ opacity: 1, scale: p.s }}
          transition={{ duration: 0.45, delay: animate ? 0.1 + i * 0.07 : 0, ease: EASE }}
          style={{ x: p.x, y: p.y }}
        />
      ))}
    </g>
  );
}
const PROUD_SPARKLES = [
  { x: 12, y: 50, s: 1 },
  { x: 120, y: 44, s: 0.8 },
  { x: 8, y: 100, s: 0.7 },
  { x: 118, y: 108, s: 0.9 },
  { x: 28, y: 26, s: 0.65 },
];
const GROW_SPARKLES = [
  { x: 44, y: 22, s: 0.7 },
  { x: 84, y: 18, s: 0.8 },
  { x: 76, y: 4, s: 0.55 },
];

type PalProps = {
  mood?: PalMood;
  /** Growth on top of the coin, driven by the user's progress. */
  stage?: PalStage;
  /** Rendered width and height in px. Reads clearly from 24 px up. */
  size?: number;
  /** Set false for static renders (exports, decorative copies, reduced motion). */
  animated?: boolean;
  /** Decorative copies are hidden from assistive tech. */
  decorative?: boolean;
  className?: string;
};

export function Pal({ mood = "idle", stage = "sprout", size = 56, animated = true, decorative = false, className }: PalProps) {
  // Follows the app's <MotionConfig reducedMotion="user"> (the OS setting); testable via MotionConfig.
  const reduced = useReducedMotionConfig();
  const animate = animated && !reduced;
  const svgRef = useRef<SVGSVGElement>(null);
  const [blink, setBlink] = useState(false);
  const [cursor, setCursor] = useState<Look>({ x: 0, y: 0 });

  // A stage change plays a short grow animation with a sparkle (not on first render).
  const firstStage = useRef(stage);
  const [grew, setGrew] = useState(false);
  useEffect(() => {
    if (stage === firstStage.current) return;
    firstStage.current = stage;
    if (!animate) return;
    setGrew(true);
    const t = setTimeout(() => setGrew(false), 1400);
    return () => clearTimeout(t);
  }, [stage, animate]);

  // Blink every 3–6 s at random (not while eyes are closed for "proud").
  useEffect(() => {
    if (!animate || mood === "proud") return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          schedule();
        }, 140);
      }, 3000 + Math.random() * 3000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [animate, mood]);

  // Desktop: when idle, the eyes follow the cursor subtly (max 3 px on screen).
  useEffect(() => {
    if (!animate || mood !== "idle") {
      setCursor({ x: 0, y: 0 });
      return;
    }
    if (typeof window === "undefined" || !window.matchMedia?.("(pointer: fine)").matches) return;
    const maxVb = Math.min(3.2, (3 * VB) / size);
    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = svgRef.current?.getBoundingClientRect();
        if (!box) return;
        const dx = e.clientX - (box.left + box.width / 2);
        const dy = e.clientY - (box.top + box.height * 0.6);
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / 240) * maxVb;
        setCursor({ x: (dx / len) * k, y: (dy / len) * k });
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
    };
  }, [animate, mood, size]);

  const look = mood === "idle" ? cursor : MOOD_LOOK[mood];
  const [browL, browR] = MOOD_BROWS[mood];
  const closedEyes = mood === "proud";
  const t = (d: number) => (animate ? { duration: d, ease: EASE } : { duration: 0 });

  // Whole-body motion per mood.
  const body = !animate
    ? { y: 0, rotate: 0, scale: 1 }
    : mood === "idle"
      ? { y: 0, rotate: 0, scale: [1, 1.025, 1] }
      : mood === "excited"
        ? { y: [0, -9, 0, -4, 0], rotate: 0, scale: 1 }
        : mood === "listening"
          ? { y: 0, rotate: 4, scale: 1 }
          : mood === "oops"
            ? { y: 0, rotate: -3, scale: 1 }
            : { y: 0, rotate: 0, scale: 1 };
  const bodyTransition = !animate
    ? { duration: 0 }
    : mood === "idle"
      ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const }
      : mood === "excited"
        ? { duration: 0.6, ease: "easeOut" as const }
        : { duration: 0.35, ease: EASE };

  // The sprout sways while thinking, bounces when excited, stays still when serious.
  const sprout = !animate
    ? { rotate: 0, scaleY: 1 }
    : mood === "thinking"
      ? { rotate: [0, -9, 7, -5, 0], scaleY: 1 }
      : mood === "excited"
        ? { rotate: 0, scaleY: [1, 1.18, 0.92, 1.06, 1] }
        : mood === "idle"
          ? { rotate: [0, 2.5, 0, -2.5, 0], scaleY: 1 }
          : { rotate: 0, scaleY: 1 };
  const sproutTransition = !animate
    ? { duration: 0 }
    : mood === "thinking"
      ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const }
      : mood === "idle"
        ? { duration: 4, repeat: Infinity, ease: "easeInOut" as const }
        : { duration: 0.6, ease: "easeOut" as const };

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      className={cn("shrink-0 overflow-visible", className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : PAL_LABEL}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
      data-mood={mood}
      data-stage={stage}
      data-animated={animate ? "true" : "false"}
    >
      {mood === "proud" && <Sparkles animate={animate} spots={PROUD_SPARKLES} />}
      {grew && <Sparkles animate spots={GROW_SPARKLES} />}

      <motion.g style={{ originX: 0.5, originY: 1 }} animate={body} transition={bodyTransition}>
        {/* Growth on top (behind the coin's rim so it sprouts from it) */}
        <motion.g style={{ originX: 0.5, originY: 1 }} animate={sprout} transition={sproutTransition}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.g
              key={stage}
              style={{ originX: 0.5, originY: 1 }}
              initial={animate ? { scale: 0, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={animate ? { duration: 0.55, ease: EASE } : { duration: 0 }}
            >
              <Growth stage={stage} />
            </motion.g>
          </AnimatePresence>
        </motion.g>

        {/* Coin: edge, gold rim, teal face, inner ring, highlight */}
        <circle cx={COIN.cx} cy={COIN.cy + 3} r={COIN.r} fill={GOLD_DEEP} />
        <circle cx={COIN.cx} cy={COIN.cy} r={COIN.r} fill={GOLD} />
        <circle cx={COIN.cx} cy={COIN.cy} r={FACE_R} fill={TEAL} />
        <circle cx={COIN.cx} cy={COIN.cy} r={FACE_R - 3.5} fill="none" stroke={TEAL_DEEP} strokeWidth={1.6} opacity={0.6} />
        <ellipse cx={46} cy={56} rx={12} ry={5.5} fill="#FFFFFF" opacity={0.32} transform="rotate(-35 46 56)" />

        {/* Cheeks */}
        <ellipse cx={41} cy={89} rx={5.5} ry={3.2} fill={BLUSH} opacity={0.9} />
        <ellipse cx={87} cy={89} rx={5.5} ry={3.2} fill={BLUSH} opacity={0.9} />

        {/* Eyes */}
        {closedEyes ? (
          <g fill="none" stroke={NAVY} strokeWidth={3.4} strokeLinecap="round">
            <path d={`M${EYE_L.x - 6} ${EYE_L.y + 2} Q${EYE_L.x} ${EYE_L.y - 6} ${EYE_L.x + 6} ${EYE_L.y + 2}`} />
            <path d={`M${EYE_R.x - 6} ${EYE_R.y + 2} Q${EYE_R.x} ${EYE_R.y - 6} ${EYE_R.x + 6} ${EYE_R.y + 2}`} />
          </g>
        ) : (
          <motion.g style={{ originX: 0.5, originY: 0.5 }} animate={{ scaleY: blink ? 0.12 : 1 }} transition={{ duration: 0.08 }}>
            {[EYE_L, EYE_R].map((e, i) => (
              <g key={i}>
                <ellipse cx={e.x} cy={e.y} rx={mood === "excited" ? 8.4 : 7.6} ry={mood === "excited" ? 9.4 : 8.6} fill="#FFFFFF" />
                <motion.g initial={false} animate={{ x: look.x, y: look.y }} transition={t(0.3)}>
                  <circle cx={e.x} cy={e.y + 0.5} r={3.9} fill={NAVY} />
                  <circle cx={e.x - 1.3} cy={e.y - 1.1} r={1.35} fill="#FFFFFF" />
                </motion.g>
              </g>
            ))}
          </motion.g>
        )}

        {/* Eyebrows */}
        <g fill="none" stroke={NAVY} strokeWidth={3.2} strokeLinecap="round">
          <motion.path
            d={`M${EYE_L.x - 6} 62.5 Q${EYE_L.x} 60 ${EYE_L.x + 6} 62`}
            style={{ originX: 0.5, originY: 0.5 }}
            initial={false}
            animate={browL}
            transition={t(0.3)}
          />
          <motion.path
            d={`M${EYE_R.x - 6} 62 Q${EYE_R.x} 60 ${EYE_R.x + 6} 62.5`}
            style={{ originX: 0.5, originY: 0.5 }}
            initial={false}
            animate={browR}
            transition={t(0.3)}
          />
        </g>

        {/* Arms (in front) */}
        <AnimatePresence initial={false}>
          <Arms key={mood} mood={mood} animate={animate} />
        </AnimatePresence>

        {/* Mouth */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.g key={mood} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t(0.2)}>
            <Mouth mood={mood} />
          </motion.g>
        </AnimatePresence>
      </motion.g>
    </svg>
  );
}
