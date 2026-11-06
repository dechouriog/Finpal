"use client";

import { createContext, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { AppPortal } from "@/components/shell/AppPortal";
import { STAGE_MESSAGE, stageRank, type PalStage } from "@/lib/pal";
import { Pal } from "./Pal";

const StageContext = createContext<PalStage>("seed");

/** The signed-in user's Pal stage (from the server), shared by every Pal in the app. */
export function usePalStage() {
  return useContext(StageContext);
}

/** Pal with the current user's growth stage. Use this everywhere in the app UI. */
export function UserPal(props: Omit<ComponentProps<typeof Pal>, "stage">) {
  return <Pal {...props} stage={usePalStage()} />;
}

/**
 * Provides the user's stage. When it grows (after a refresh triggered by an
 * investment or Auto-invest), Pal celebrates with a one-line message.
 */
export function PalStageProvider({ stage, children }: { stage: PalStage; children: ReactNode }) {
  const previous = useRef(stage);
  const [celebrate, setCelebrate] = useState<PalStage | null>(null);

  useEffect(() => {
    if (stageRank(stage) > stageRank(previous.current)) setCelebrate(stage);
    previous.current = stage;
  }, [stage]);

  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(null), 6000);
    return () => clearTimeout(t);
  }, [celebrate]);

  return (
    <StageContext.Provider value={stage}>
      {children}
      <AppPortal>
        <AnimatePresence>
          {celebrate && (
            <motion.div
              key={celebrate}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-3 top-3 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-surface p-3 shadow-pop ring-1 ring-teal/40"
            >
              <Pal stage={celebrate} mood="excited" size={52} decorative />
              <p className="flex-1 text-sm font-semibold text-ink">{STAGE_MESSAGE[celebrate]}</p>
              <button
                type="button"
                onClick={() => setCelebrate(null)}
                aria-label="Dismiss"
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </AppPortal>
    </StageContext.Provider>
  );
}
