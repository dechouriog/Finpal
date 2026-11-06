import { describe, expect, it } from "vitest";
import { amountToCents, applyKey, centsToInput, isAmountInput } from "@/lib/money";
import { formatCents } from "@/lib/utils";

describe("money helpers (integer cents, never floats)", () => {
  it("parses typed amounts into cents without float errors", () => {
    expect(amountToCents("12.5")).toBe(1250);
    expect(amountToCents("0.07")).toBe(7);
    expect(amountToCents("1500")).toBe(150_000);
    expect(amountToCents("0.1")).toBe(10);
    expect(amountToCents("19.99")).toBe(1999); // 19.99 * 100 = 1998.9999… as a float
    expect(amountToCents("")).toBe(0);
    expect(amountToCents("abc")).toBe(0);
    expect(amountToCents("1.234")).toBe(0);
  });

  it("validates partially typed input", () => {
    for (const ok of ["", "1", "12.", "12.5", "12.50", "99999.99"]) expect(isAmountInput(ok)).toBe(true);
    for (const bad of ["1.234", "-5", "1e3", "123456", "1,000"]) expect(isAmountInput(bad)).toBe(false);
  });

  it("keypad builds amounts and rejects invalid keys", () => {
    const type = (keys: string[]) => keys.reduce(applyKey, "");
    expect(type(["1", "2", ".", "5", "0"])).toBe("12.50");
    expect(type(["1", "2", ".", "5", "0", "9"])).toBe("12.50"); // max 2 decimals
    expect(type([".", "5"])).toBe("0.5");
    expect(type(["0", "7"])).toBe("7"); // no leading zero
    expect(type(["1", ".", "."])).toBe("1."); // one decimal point
    expect(type(["4", "2", "back"])).toBe("4");
  });

  it("formats cents as USD with a real minus sign", () => {
    expect(formatCents(123_456)).toBe("$1,234.56");
    expect(formatCents(-45_000)).toBe("−$450.00");
    expect(formatCents(85_000, { signed: true })).toBe("+$850.00");
    expect(formatCents(5_000, { compact: true })).toBe("$50");
    expect(formatCents(5_050, { compact: true })).toBe("$50.50");
    expect(formatCents(0)).toBe("$0.00");
  });

  it("converts cents to an input string", () => {
    expect(centsToInput(320_000)).toBe("3200.00");
    expect(centsToInput(7)).toBe("0.07");
  });
});
