"use client";

import { motion } from "framer-motion";

/** Animated success check: the circle pops in, then the tick draws itself. */
export function SuccessCheck({ size = 88 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 88 88"
      aria-hidden
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <circle cx="44" cy="44" r="44" fill="#E6FAF7" />
      <circle cx="44" cy="44" r="32" fill="#00C2A8" />
      <motion.path
        d="M30 45.5 40 55l19-21"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, delay: 0.25, ease: "easeOut" }}
      />
    </motion.svg>
  );
}
