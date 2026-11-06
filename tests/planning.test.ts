import { describe, expect, it } from "vitest";
import { buildAllocation, scoreRiskLevel } from "@/lib/allocation";
import { summarizeCashflow } from "@/lib/cashflow";
import { describeRule, monthlyRule, nextRunDates, parseMonthDays } from "@/lib/schedule";
import { newSpace } from "./helpers";

describe("emergency fund math", () => {
  it("Laura: $3,200 balance - 3 x $920 spending = $440 ready to invest", async () => {
    const s = await newSpace();
    const c = await summarizeCashflow(s.laura, 12);
    expect(c.avgIncomeCents).toBe(185_000);
    expect(c.avgSpendCents).toBe(92_000);
    expect(c.emergencyFundCents).toBe(276_000);
    expect(c.balanceCents).toBe(320_000);
    expect(c.readyToInvestCents).toBe(44_000);
    expect(c.steadyIncome?.counterparty).toBe("Studio Norte");
  });
});

describe("portfolio allocation", () => {
  it("moderate $440 -> $264 / $110 / $66", () => {
    const lines = buildAllocation("MODERATE", 44_000);
    expect(lines.map((l) => [l.category, l.weight, l.amountCents])).toEqual([
      ["INDEX", 60, 26_400],
      ["BOND", 25, 11_000],
      ["GROWTH", 15, 6_600],
    ]);
  });

  it("always sums exactly to the amount (rounding goes to the last line)", () => {
    for (const level of ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"] as const) {
      for (const amount of [1, 99, 101, 33_333, 44_000, 1_000_001]) {
        const total = buildAllocation(level, amount).reduce((s, l) => s + l.amountCents, 0);
        expect(total).toBe(amount);
      }
    }
  });

  it("scores risk profiles", () => {
    expect(scoreRiskLevel({ experience: "none", goal: "x", horizon: "long", tolerance: "wait" })).toBe("MODERATE");
    expect(scoreRiskLevel({ experience: "experienced", goal: "x", horizon: "long", tolerance: "buy_more" })).toBe("AGGRESSIVE");
    expect(scoreRiskLevel({ experience: "experienced", goal: "x", horizon: "short", tolerance: "buy_more" })).toBe("CONSERVATIVE");
    expect(scoreRiskLevel({ experience: "some", goal: "x", horizon: "long", tolerance: "sell" })).toBe("CONSERVATIVE");
  });
});

describe("Auto-invest dates", () => {
  const from = new Date("2026-11-05T10:00:00Z");
  const iso = (ds: Date[]) => ds.map((d) => d.toISOString().slice(0, 10));

  it("$50 every payday: Nov 15, Nov 30, Dec 15, Dec 30", () => {
    expect(iso(nextRunDates(monthlyRule([15, 30]), from, 4))).toEqual(["2026-11-15", "2026-11-30", "2026-12-15", "2026-12-30"]);
  });

  it("clamps days past the end of the month", () => {
    expect(iso(nextRunDates(monthlyRule([30]), new Date("2027-02-01"), 2))).toEqual(["2027-02-28", "2027-03-30"]);
    expect(iso(nextRunDates(monthlyRule([31]), new Date("2026-04-01"), 1))).toEqual(["2026-04-30"]);
  });

  it("includes today and is stable across years", () => {
    expect(iso(nextRunDates(monthlyRule([5]), from, 1))).toEqual(["2026-11-05"]);
    expect(iso(nextRunDates(monthlyRule([15]), new Date("2026-12-20"), 1))).toEqual(["2027-01-15"]);
  });

  it("round-trips the iCal rule", () => {
    const rule = monthlyRule([30, 15, 15]);
    expect(rule).toBe("FREQ=MONTHLY;BYMONTHDAY=15,30");
    expect(parseMonthDays(rule)).toEqual([15, 30]);
    expect(describeRule(rule)).toBe("Every month on the 15th and 30th");
  });
});
