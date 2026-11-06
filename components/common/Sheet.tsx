"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { APP_OVERLAY_ID, AppPortal } from "@/components/shell/AppPortal";
import { cn } from "@/lib/utils";

/** True when the app container (not the window) is at least 48rem wide. */
export function useWideApp() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = document.getElementById(APP_OVERLAY_ID);
    if (!el) return;
    const update = () => setWide(el.clientWidth >= 768);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return wide;
}

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  /** Width of the desktop side panel. */
  panelWidth?: number;
  className?: string;
  /** Show a dimmed backdrop on desktop too. */
  backdropOnDesktop?: boolean;
  /** Extra button(s) in the header, left of Close. */
  headerAction?: ReactNode;
  /** Fixed height for the mobile bottom sheet (e.g. "88%"); default fits content. */
  mobileHeight?: string;
};

/** Bottom sheet in the Mobile layout, right-side panel in the Desktop layout. */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  panelWidth = 420,
  className,
  backdropOnDesktop = true,
  headerAction,
  mobileHeight,
}: SheetProps) {
  const wide = useWideApp();
  const panelRef = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running effects: callers often pass an
  // inline arrow, and re-running the focus effect on every render would steal
  // focus from inputs inside the sheet (e.g. typing in the chat).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Move focus into the panel once, when it opens.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AppPortal>
      <AnimatePresence>
        {open && (
          <div className="absolute inset-0">
            {(!wide || backdropOnDesktop) && (
              <motion.button
                type="button"
                aria-label="Close"
                tabIndex={-1}
                className="absolute inset-0 cursor-default bg-deep/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={onClose}
              />
            )}
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              initial={wide ? { x: "100%" } : { y: "100%" }}
              animate={wide ? { x: 0 } : { y: 0 }}
              exit={wide ? { x: "100%" } : { y: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "absolute flex flex-col bg-surface shadow-2xl focus:outline-none",
                wide ? "inset-y-0 right-0 rounded-l-3xl" : "inset-x-0 bottom-0 max-h-[88%] rounded-t-3xl",
                className,
              )}
              style={wide ? { width: panelWidth } : mobileHeight ? { height: mobileHeight } : undefined}
            >
              {!wide && <span aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line" />}
              <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-4">
                {icon}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-lg font-extrabold text-ink">{title}</h2>
                  {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
                </div>
                {headerAction}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="grid size-9 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppPortal>
  );
}
