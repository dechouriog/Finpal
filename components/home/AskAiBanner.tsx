"use client";

import { ChevronRight } from "lucide-react";
import { UserPal } from "@/components/pal/PalStageContext";

/** Fired on window; Pal (the assistant) listens for it. Optional detail: { prompt }. */
export const OPEN_ASSISTANT_EVENT = "finpal:open-assistant";

export function AskAiBanner() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT))}
      className="flex w-full items-center gap-4 rounded-2xl bg-teal-soft p-4 text-left ring-1 ring-teal/20 transition-colors hover:bg-teal-tint"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface shadow-sm">
        <UserPal mood="idle" size={40} decorative />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-bold text-deep">Ask Pal</span>
        <span className="block text-sm text-muted">Ready to make your savings work?</span>
      </span>
      <ChevronRight className="size-5 text-teal-ink" aria-hidden />
    </button>
  );
}
