import { z } from "zod";

/**
 * Risky requests Pal pushes back on (kindly, with a reason and a safer option).
 * Detection is deterministic and server-side, so the guardrail doesn't depend on the model.
 */
export const RISKY_KINDS = ["single_stock", "emergency_fund", "leverage", "crypto", "quick_money"] as const;
export const RiskyKind = z.enum(RISKY_KINDS);
export type RiskyKind = z.infer<typeof RiskyKind>;

const PATTERNS: [RiskyKind, RegExp][] = [
  // "invest my emergency fund", "use my safety net", "invest everything including my savings cushion"
  ["emergency_fund", /\b(emergency fund|safety net|rainy[- ]day|fondo de emergencia|colch[oó]n|reserva de emerg[eê]ncia)\b/i],
  ["leverage", /\b(leverage|margin|borrow(ing)? (money )?to invest|loan to invest|credit card to invest|apalancamiento|pr[eé]stamo para invertir|alavancagem|empr[eé]stimo para investir)\b/i],
  ["crypto", /\b(crypto|bitcoin|btc|ethereum|eth|dogecoin|doge|memecoin|meme coin|altcoin|nft|cripto)\b/i],
  ["quick_money", /\b(get rich|rich quick|double my money|fast money|quick money|10x|to the moon|hacerme rico|dinero r[aá]pido|ficar rico|dinheiro r[aá]pido)\b/i],
  [
    "single_stock",
    /\b(all[- ]in|(all|everything|all my (money|savings))\s+(in|into|on)\s+(one|a single|1)\s+(stock|company|share)s?|one stock|single stock|todo en una (sola )?acci[oó]n|tudo em uma (s[oó] )?a[cç][aã]o)\b/i,
  ],
];

export function detectRiskyRequest(text: string | null | undefined): RiskyKind | null {
  if (!text) return null;
  for (const [kind, re] of PATTERNS) if (re.test(text)) return kind;
  return null;
}

export const PUSHBACK_OPTIONS = ["Show me the safer option", "I understand the risk"] as const;

/** Server-written pushback copy (Pal's voice, no promises, no invented numbers). */
export const PUSHBACK: Record<RiskyKind, { title: string; reason: string; alternative: string }> = {
  single_stock: {
    title: "Let's not bet the rent on one company",
    reason:
      "Putting everything into one stock is a coin flip with money you need. If that one company stumbles, your whole plan stumbles with it.",
    alternative: "Keep a diversified core and add a small growth slice, around 10–20% of what you invest.",
  },
  emergency_fund: {
    title: "Your safety net stays untouched",
    reason:
      "Your safety net isn't boring. It's what lets you stay invested when markets get loud. Invest it, and a surprise bill could force you to sell at the worst moment.",
    alternative: "Keep three months of expenses in cash and invest only what's left after that.",
  },
  leverage: {
    title: "Borrowing to invest cuts both ways",
    reason: "Borrowed money multiplies losses as well as gains, and the loan is still there if prices fall.",
    alternative: "Invest only money you already have, and build up with a small amount every payday.",
  },
  crypto: {
    title: "That's a gamble, not a plan",
    reason:
      "Crypto can lose a big chunk of its value in days, and Finpal doesn't offer it. Money you're counting on deserves something steadier.",
    alternative: "Start with a diversified mix of index funds and bonds, and keep any speculation to money you can afford to lose.",
  },
  quick_money: {
    title: "There's no safe shortcut",
    reason: "Nobody can promise fast returns. Anyone who does is selling risk, not a plan.",
    alternative: "A diversified mix plus a small habit every payday. Slow money, strong money.",
  },
};
