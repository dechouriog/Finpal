"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { AppPortal } from "@/components/shell/AppPortal";
import { cn } from "@/lib/utils";

type Tone = "success" | "error";
type Toast = { id: number; message: string; tone: Tone };
type ToastApi = { show: (message: string, tone?: Tone) => void };

const ToastContext = createContext<ToastApi>({ show: () => {} });

/** Subtle confirmations rendered inside the app container (so they stay in the phone frame). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (message: string, tone: Tone = "success") => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <AppPortal>
        <div
          aria-live="polite"
          role="status"
          className="pointer-events-none! absolute inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4"
        >
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl bg-surface px-4 py-3 text-sm font-medium text-ink shadow-pop ring-1",
                  t.tone === "success" ? "ring-teal/40" : "ring-danger/40",
                )}
              >
                {t.tone === "success" ? (
                  <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
                ) : (
                  <AlertCircle className="size-5 shrink-0 text-danger" aria-hidden />
                )}
                <span className="flex-1">{t.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="grid size-7 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </AppPortal>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
