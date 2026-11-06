"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PalMood } from "./Pal";
import { UserPal } from "./PalStageContext";
import { THINKING_LINES } from "./mood";

/** Pal in a soft circle, for chat bubbles and headers. */
export function PalAvatar({
  mood = "idle",
  size = 28,
  animated = true,
  className,
}: {
  mood?: PalMood;
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full bg-teal-soft", className)}
      style={{ width: size + 8, height: size + 8 }}
    >
      <UserPal mood={mood} size={size} animated={animated} decorative />
    </span>
  );
}

/** Pal thinking, with short rotating lines (replaces generic typing dots). */
export function PalThinking({ label, compact = false }: { label?: string; compact?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (label) return;
    const t = setInterval(() => setI((n) => (n + 1) % THINKING_LINES.length), 1600);
    return () => clearInterval(t);
  }, [label]);
  const line = label ?? THINKING_LINES[i]!;
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite" aria-label="Pal is thinking">
      {!compact && <PalAvatar mood="thinking" size={26} />}
      <div className="relative h-8 min-w-0 flex-1 overflow-hidden rounded-2xl rounded-bl-md bg-navy-soft px-3.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={line}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="truncate text-xs font-medium leading-8 text-navy"
          >
            {line}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

const HELLO_KEY = "finpal:pal-hello-seen";
const readSeen = () => {
  try {
    return window.localStorage.getItem(HELLO_KEY) === "1";
  } catch {
    return true; // storage blocked: don't nag
  }
};
const markSeen = () => {
  try {
    window.localStorage.setItem(HELLO_KEY, "1");
  } catch {
    /* storage unavailable: the bubble just shows again next time */
  }
};

/**
 * Floating Pal (56 px) peeking from the bottom-right corner of the app.
 * On the first visit he waves once with a small, dismissible speech bubble.
 */
export function PalLauncher({ onOpen }: { onOpen: () => void }) {
  const [hello, setHello] = useState(false);
  useEffect(() => {
    if (readSeen()) return;
    // Pal already greets on the onboarding card; only speak up when it is not on screen.
    const t = setInterval(() => {
      if (document.querySelector("[data-pal-welcome]")) return;
      setHello(true);
      clearInterval(t);
    }, 900);
    return () => clearInterval(t);
  }, []);
  const dismiss = () => {
    setHello(false);
    markSeen();
  };
  const open = () => {
    dismiss();
    onOpen();
  };

  return (
    <div className="absolute bottom-[84px] right-4 flex flex-col items-end gap-2 @3xl/app:bottom-16 @3xl/app:right-8">
      <AnimatePresence>
        {hello && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative mr-2 flex max-w-[220px] items-start gap-1 rounded-2xl rounded-br-md bg-surface py-2.5 pl-3.5 pr-1.5 text-sm font-medium text-ink shadow-pop ring-1 ring-line"
          >
            <button type="button" onClick={open} className="text-left">
              Got a minute? Let&apos;s make your savings work.
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss Pal's message"
              className="grid size-6 shrink-0 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        onClick={open}
        aria-label="Ask Pal"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative grid size-16 place-items-end justify-center overflow-hidden rounded-full bg-surface shadow-pop ring-4 ring-teal-soft"
      >
        {/* Peeking: Pal's body is tucked below the edge of the button. */}
        <span className="translate-y-3">
          <UserPal mood={hello ? "wave" : "idle"} size={56} decorative />
        </span>
      </motion.button>
    </div>
  );
}
