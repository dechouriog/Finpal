"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { BatteryFull, Monitor, SignalHigh, Smartphone, Wifi } from "lucide-react";
import { FinpalLogo } from "@/components/brand/FinpalLogo";
import { AppShell } from "@/components/shell/AppShell";
import { cn } from "@/lib/utils";

type DeviceMode = "desktop" | "mobile";
const STORAGE_KEY = "finpal:device-mode";

function readMode(): DeviceMode | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "desktop" || v === "mobile" ? v : null;
  } catch {
    return null;
  }
}

function writeMode(mode: DeviceMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* storage unavailable (private mode, quota): the preference just won't persist */
  }
}

/**
 * Presentation chrome that lives OUTSIDE the app: a top bar with a
 * Desktop | Mobile toggle, and (in Mobile) a generic phone frame.
 * The frame is a real DOM container (not an iframe) so the PayPal popup
 * works. The app inside decides its layout with container queries, and the
 * tree below <AppShell> is identical in both modes, so it keeps its state.
 */
export function DeviceViewer({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DeviceMode>("desktop");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readMode();
    if (stored) setMode(stored);
    setReady(true);
  }, []);

  const change = (next: DeviceMode) => {
    setMode(next);
    writeMode(next);
  };

  const isMobile = mode === "mobile";

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Viewer bar (not part of the app) */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <FinpalLogo size={28} />
          <span className="hidden rounded-full bg-navy-soft px-2.5 py-1 text-xs font-medium text-navy sm:inline">
            Hackathon demo
          </span>
        </div>
        <DeviceToggle mode={mode} onChange={change} />
      </header>

      {/* Stage */}
      <div
        className={cn(
          "relative min-h-0 flex-1 transition-opacity duration-300",
          ready ? "opacity-100" : "opacity-0",
          isMobile && "flex items-center justify-center overflow-hidden p-6",
        )}
      >
        {isMobile && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-soft"
          />
        )}

        {/* Phone bezel (generic, no real-device likeness) */}
        <div
          className={cn(
            "relative",
            isMobile
              ? "rounded-[56px] bg-ink p-3 shadow-[0_30px_80px_-20px_rgba(6,26,63,0.45)]"
              : "h-full w-full",
          )}
          style={isMobile ? { height: "min(900px, 100%)", aspectRatio: "420 / 900" } : undefined}
        >
          {/* Screen */}
          <div
            className={cn(
              "relative flex h-full w-full flex-col overflow-hidden bg-bg",
              isMobile && "rounded-[44px]",
            )}
          >
            {isMobile && <StatusBar />}
            <div className="min-h-0 flex-1">
              <AppShell>{children}</AppShell>
            </div>
            {isMobile && (
              <div aria-hidden className="flex h-5 shrink-0 items-start justify-center bg-surface">
                <span className="h-1 w-28 rounded-full bg-ink/80" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div
      aria-hidden
      className="relative flex h-11 shrink-0 items-center justify-between bg-bg px-7 text-[13px] font-semibold text-ink"
    >
      <span className="tabular">9:41</span>
      {/* Generic notch */}
      <span className="absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
      <span className="flex items-center gap-1">
        <SignalHigh className="size-4" strokeWidth={2.5} />
        <Wifi className="size-4" strokeWidth={2.5} />
        <BatteryFull className="size-5" strokeWidth={2} />
      </span>
    </div>
  );
}

function DeviceToggle({ mode, onChange }: { mode: DeviceMode; onChange: (m: DeviceMode) => void }) {
  const options: { value: DeviceMode; label: string; icon: typeof Monitor }[] = [
    { value: "desktop", label: "Desktop", icon: Monitor },
    { value: "mobile", label: "Mobile", icon: Smartphone },
  ];
  return (
    <div role="radiogroup" aria-label="Device preview" className="flex rounded-full bg-bg p-1 ring-1 ring-line">
      {options.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(value)}
            className={cn(
              "relative flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
              active ? "text-white" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="device-toggle-pill"
                className="absolute inset-0 rounded-full bg-navy"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <Icon className="relative size-4" aria-hidden />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
