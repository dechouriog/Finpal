import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer amount in cents as USD. Amounts are never floats. */
export function formatCents(cents: number, opts: { signed?: boolean } = {}) {
  const abs = Math.abs(cents);
  const str = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(abs / 100);
  if (cents < 0) return `−${str}`;
  if (opts.signed && cents > 0) return `+${str}`;
  return str;
}
