/**
 * Number guardrail for Pal's streamed text: every dollar amount or percentage the
 * user sees must come from a tool result, the user's own words, or Pal's fixed script.
 * Anything else is replaced before it reaches the screen. Emoji are stripped too
 * (Pal shows emotion with his face, not emoji).
 */

const NUM_RE = /\$?\d[\d,]*(?:\.\d+)?%?/g;
const EMOJI_RE = /\p{Extended_Pictographic}️?/gu;

/** Figures Pal's own script uses (the $50 payday habit, the 10% drop question, "$0 ready"). */
export const SCRIPT_FIGURES = "$50 $0 10% 3 months 12 months";

/** Numeric value of a token like "$2,760.00", "15%", "440" -> "2760", "15", "440". */
export function numericValue(token: string): string | null {
  const n = Number(token.replace(/[$,%]/g, ""));
  return Number.isFinite(n) ? String(n) : null;
}

/** Numbers that are allowed on screen, split by kind: amounts and percentages. */
export type AllowedNumbers = { amounts: Set<string>; percents: Set<string> };

export function emptyAllowed(): AllowedNumbers {
  return { amounts: new Set(), percents: new Set() };
}

/** Collect the numbers mentioned in a text (JSON tool results included) into `into`. */
export function collectNumbers(text: string, into: AllowedNumbers = emptyAllowed()): AllowedNumbers {
  for (const m of text.matchAll(NUM_RE)) {
    const tok = m[0];
    const v = numericValue(tok);
    if (v === null) continue;
    if (tok.endsWith("%")) {
      into.percents.add(v);
      continue;
    }
    into.amounts.add(v);
    // Tool results also carry cents (e.g. 44000): allow the dollar value too.
    if (/^\d{3,}$/.test(v)) into.amounts.add(String(Number(v) / 100));
  }
  return into;
}

/** Is this token safe to show, given the allowed numbers? */
export function isAllowedNumber(token: string, allowed: AllowedNumbers) {
  const v = numericValue(token);
  if (v === null) return true;
  if (token.endsWith("%")) return allowed.percents.has(v);
  if (token.startsWith("$")) return allowed.amounts.has(v);
  // Plain small counts ("3 months", "12 months", "the 15th") and years are harmless.
  const n = Number(v);
  return n <= 31 || (n >= 2020 && n <= 2040) || allowed.amounts.has(v);
}

function replacement(token: string) {
  if (token.startsWith("$")) return "that amount";
  if (token.endsWith("%")) return "that share";
  return "that number";
}

/** Sanitize a complete text: strip emoji and unsupported numbers. Returns the text and what was removed. */
export function sanitizeText(text: string, allowed: AllowedNumbers) {
  const blocked: string[] = [];
  const clean = text.replace(EMOJI_RE, "").replace(NUM_RE, (tok) => {
    if (isAllowedNumber(tok, allowed)) return tok;
    blocked.push(tok);
    return replacement(tok);
  });
  return { text: clean, blocked };
}

/**
 * Streaming version: holds back a trailing partial number (e.g. "$4" of "$440.00")
 * until it is complete, then validates it.
 */
export class NumberGate {
  private buf = "";
  readonly blocked: string[] = [];
  private allowed: AllowedNumbers;

  constructor(initial = "") {
    this.allowed = collectNumbers(`${SCRIPT_FIGURES} ${initial}`);
  }

  allow(text: string) {
    collectNumbers(text, this.allowed);
  }

  push(delta: string): string {
    this.buf += delta;
    const tail = this.buf.match(/[$\d][\d,.%]*$/);
    const cut = tail ? this.buf.length - tail[0].length : this.buf.length;
    const ready = this.buf.slice(0, cut);
    this.buf = this.buf.slice(cut);
    return this.clean(ready);
  }

  flush(): string {
    const rest = this.buf;
    this.buf = "";
    return this.clean(rest);
  }

  private clean(text: string) {
    const { text: out, blocked } = sanitizeText(text, this.allowed);
    this.blocked.push(...blocked);
    return out;
  }
}
