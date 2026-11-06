/**
 * Minimal iCal RRULE support for Auto-invest: "FREQ=MONTHLY;BYMONTHDAY=15,30".
 * The same rule string is understood by Bryntum Calendar.
 */

export function monthlyRule(days: number[]) {
  const sorted = [...new Set(days)].filter((d) => d >= 1 && d <= 31).sort((a, b) => a - b);
  return `FREQ=MONTHLY;BYMONTHDAY=${sorted.join(",")}`;
}

export function parseMonthDays(rule: string | null | undefined): number[] {
  const m = rule?.match(/BYMONTHDAY=([\d,]+)/);
  if (!m?.[1]) return [];
  return m[1]
    .split(",")
    .map(Number)
    .filter((d) => d >= 1 && d <= 31)
    .sort((a, b) => a - b);
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/**
 * Next run dates on or after `from` (UTC dates). Days past the end of a month
 * (e.g. the 30th in February) run on the month's last day.
 */
export function nextRunDates(rule: string | null | undefined, from: Date, count: number, until?: Date): Date[] {
  const days = parseMonthDays(rule);
  if (days.length === 0) return [];
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const out: Date[] = [];
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth();
  for (let guard = 0; out.length < count && guard < 120; guard++) {
    const dim = daysInMonth(y, m);
    const seen = new Set<number>();
    for (const d of days) {
      const day = Math.min(d, dim);
      if (seen.has(day)) continue;
      seen.add(day);
      const t = Date.UTC(y, m, day, 12);
      if (t >= start && (!until || t <= until.getTime())) out.push(new Date(t));
      if (out.length >= count) break;
    }
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

export function describeRule(rule: string | null | undefined) {
  const days = parseMonthDays(rule);
  if (days.length === 0) return "Not scheduled";
  return `Every month on the ${days.map(ordinal).join(" and ")}`;
}

export const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
