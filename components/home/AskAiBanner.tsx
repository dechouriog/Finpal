"use client";

import { ChevronRight } from "lucide-react";
import { SparkleIcon } from "@/components/brand/SparkleIcon";

/** Fired on window; the Finpal AI assistant (step 7) listens for it. */
export const OPEN_ASSISTANT_EVENT = "finpal:open-assistant";

export function AskAiBanner() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT))}
      className="flex w-full items-center gap-4 rounded-2xl bg-teal-soft p-4 text-left ring-1 ring-teal/20 transition-colors hover:bg-[#d8f6f1]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-teal shadow-sm">
        <SparkleIcon size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-bold text-deep">Ask Finpal AI</span>
        <span className="block text-sm text-muted">Ready to make your savings work?</span>
      </span>
      <ChevronRight className="size-5 text-teal-ink" aria-hidden />
    </button>
  );
}
