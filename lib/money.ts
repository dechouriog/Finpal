/** Max single transfer in the demo: $10,000.00 */
export const MAX_TRANSFER_CENTS = 10_000_00;

const AMOUNT_RE = /^\d{0,5}(\.\d{0,2})?$/;

/** True if `value` is a valid partially-typed amount like "", "12", "12.", "12.5", "12.50". */
export function isAmountInput(value: string) {
  return AMOUNT_RE.test(value);
}

/** Parse a typed amount string into integer cents without going through floats. */
export function amountToCents(value: string): number {
  if (!value || !isAmountInput(value)) return 0;
  const [whole = "", frac = ""] = value.split(".");
  return Number(whole || "0") * 100 + Number(frac.padEnd(2, "0") || "0");
}

/** Apply a keypad key ("0"-"9", ".", "back") to the current amount string. */
export function applyKey(current: string, key: string): string {
  if (key === "back") return current.slice(0, -1);
  if (key === "." && current.includes(".")) return current;
  let next = key === "." && current === "" ? "0." : current + key;
  if (/^0\d/.test(next)) next = next.slice(1); // no leading zeros
  return isAmountInput(next) ? next : current;
}
