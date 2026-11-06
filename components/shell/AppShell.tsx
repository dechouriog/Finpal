"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { FinpalLogo } from "@/components/brand/FinpalLogo";
import { PalStageProvider, UserPal } from "@/components/pal/PalStageContext";
import type { PalStage } from "@/lib/pal";
import { OPEN_ASSISTANT_EVENT } from "@/components/home/AskAiBanner";
import { Assistant } from "@/components/assistant/Assistant";
import { ToastProvider } from "@/components/common/Toast";
import { APP_OVERLAY_ID } from "@/components/shell/AppPortal";
import { DISCLAIMER } from "@/lib/brand";
import { NAV_ITEMS, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * The Finpal app itself. Layout is chosen by the width of THIS container
 * (Tailwind container queries), not by the window:
 *  - narrow (< 48rem): bottom tab bar  -> Mobile
 *  - wide  (>= 48rem): left sidebar    -> Desktop
 */
export function AppShell({ children, palStage }: { children: ReactNode; palStage: PalStage }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);
  // The welcome screen is public: no navigation and no assistant until a demo starts.
  const isPublic = pathname === "/welcome" || pathname.startsWith("/dev/");

  return (
    <PalStageProvider stage={palStage}>
      <ToastProvider>
        <div className="@container/app relative h-full overflow-hidden">
          {/* Overlays (sheets, panels, assistant) render here via <AppPortal>. */}
          <div id={APP_OVERLAY_ID} className="pointer-events-none absolute inset-0 z-40 *:pointer-events-auto" />
          <div className="flex h-full">
            {!isPublic && <Sidebar pathname={pathname} />}

            <div className="flex min-w-0 flex-1 flex-col">
              <main id="main" ref={mainRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                  className="mx-auto w-full max-w-6xl px-5 pb-8 pt-4 @3xl/app:px-10 @3xl/app:pt-8"
                >
                  {children}
                </motion.div>
              </main>

              <footer className="hidden shrink-0 border-t border-line bg-surface px-10 py-3 text-xs text-muted @3xl/app:block">
                {DISCLAIMER}
              </footer>

              {!isPublic && <TabBar pathname={pathname} />}
            </div>
          </div>
          {!isPublic && <Assistant />}
        </div>
      </ToastProvider>
    </PalStageProvider>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface @3xl/app:flex">
      <div className="px-6 pb-6 pt-7">
        <Link href="/" aria-label="Finpal home" className="inline-flex rounded-lg">
          <FinpalLogo size={34} title="" />
        </Link>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active ? "text-teal-ink" : "text-muted hover:bg-bg hover:text-ink",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-teal-soft"
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                />
              )}
              <Icon className={cn("relative size-5", active && "text-teal")} aria-hidden />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT))}
          className="w-full rounded-2xl bg-teal-soft p-4 text-left transition-colors hover:bg-teal-tint"
        >
          <span className="flex items-center gap-2 font-display text-sm font-bold text-deep">
            <UserPal size={26} decorative />
            Ask Pal
          </span>
          <span className="mt-1 block text-xs text-muted">Ready to make your savings work?</span>
        </button>
      </div>
    </aside>
  );
}

function TabBar({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main" className="shrink-0 border-t border-line bg-surface px-2 pb-1 pt-1.5 @3xl/app:hidden">
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors",
                  active ? "text-teal-ink" : "text-muted hover:text-ink",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-active"
                    className="absolute top-0 h-1 w-8 rounded-full bg-teal"
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                  />
                )}
                <Icon className={cn("size-[22px]", active && "text-teal")} strokeWidth={active ? 2.4 : 2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
