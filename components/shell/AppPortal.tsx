"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const APP_OVERLAY_ID = "finpal-app-overlay";

/**
 * Renders overlays (bottom sheets, side panels) inside the app container rather
 * than the browser window, so they stay inside the phone frame in Mobile mode.
 */
export function AppPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.getElementById(APP_OVERLAY_ID)), []);
  return target ? createPortal(children, target) : null;
}
