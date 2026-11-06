"use client";

import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

/** On-screen numeric keypad (shown in the Mobile layout). */
export function AmountKeypad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Amount keypad">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key)}
          aria-label={key === "back" ? "Delete last digit" : key === "." ? "Decimal point" : key}
          className="grid h-12 place-items-center rounded-xl font-display text-xl font-bold text-ink transition-colors hover:bg-navy-soft active:bg-navy-soft"
        >
          {key === "back" ? <Delete className="size-5" aria-hidden /> : key}
        </button>
      ))}
    </div>
  );
}
