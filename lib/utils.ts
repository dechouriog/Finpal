import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const USD_WHOLE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * THE currency formatter for the whole app: integer cents -> "$1,234.56".
 * Negative amounts use a real minus sign (U+2212). `signed` adds "+" to positives;
 * `compact` drops ".00" on whole-dollar amounts (chips, calendar cells).
 */
export function formatCents(cents: number, opts: { signed?: boolean; compact?: boolean } = {}) {
  const abs = Math.abs(cents);
  const str = (opts.compact && abs % 100 === 0 ? USD_WHOLE : USD).format(abs / 100);
  if (cents < 0) return `−${str}`;
  if (opts.signed && cents > 0) return `+${str}`;
  return str;
}
