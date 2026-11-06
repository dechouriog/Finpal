import { describe, expect, it } from "vitest";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { AssistantCard, AssistantEvent } from "@/lib/assistant/cards";
import { runFallback } from "@/lib/assistant/fallback";
import { TOOLS } from "@/lib/assistant/tools";
import { newSpace } from "./helpers";

const cardsOf = (events: AssistantEvent[]) =>
  events.filter((e): e is Extract<AssistantEvent, { t: "card" }> => e.t === "card").map((e) => e.card);
const find = <K extends AssistantCard["kind"]>(cards: AssistantCard[], kind: K) =>
  cards.find((c): c is Extract<AssistantCard, { kind: K }> => c.kind === kind);

describe("AI cards: every amount comes from tools, never from model text or arguments", () => {
  it("cash-flow card shows Laura's real numbers ($440 ready to invest)", async () => {
    const ids = await newSpace();
    const out = await TOOLS.summarize_cashflow!.run({}, { userId: ids.laura, now: new Date() });
    const card = find(out.cards ?? [], "cashflow")!;
    expect(card.avgIncomeCents).toBe(185_000);
    expect(card.avgSpendCents).toBe(92_000);
    expect(card.emergencyFundCents).toBe(276_000);
    expect(card.readyToInvestCents).toBe(44_000);
  });

  it("ignores wrong amounts and risk levels passed by the model", async () => {
    const ids = await newSpace();
    const ctx = { userId: ids.laura, now: new Date() };
    await TOOLS.save_risk_profile!.run(
      { experience: "none", goal: "Grow my savings", horizon: "long", tolerance: "wait" },
      ctx,
    );
    // The model "hallucinates" $9,999.99 and AGGRESSIVE: the card must still show the server's plan.
    const pf = await TOOLS.build_portfolio!.run({ risk_level: "AGGRESSIVE", amount_cents: 999_999 }, ctx);
    const portfolio = find(pf.cards ?? [], "portfolio")!;
    expect(portfolio.totalCents).toBe(44_000);
    expect(portfolio.lines.map((l) => l.amountCents)).toEqual([26_400, 11_000, 6_600]);

    const rv = await TOOLS.review_and_confirm!.run(
      { amount_cents: 100, risk_level: "CONSERVATIVE", auto_invest_amount_cents: 5000, auto_invest_days: [15, 30] },
      ctx,
    );
    const review = find(rv.cards ?? [], "review")!;
    expect(review.amountCents).toBe(44_000);
    expect(review.level).toBe("MODERATE");
    expect(review.shortfallCents).toBe(0);
  });

  it("fallback completes the whole guided flow without the model, with tool-sourced numbers", async () => {
    const ids = await newSpace();
    const ctx = { userId: ids.laura, now: new Date() };
    const history: ChatCompletionMessageParam[] = [];
    const allCards: AssistantCard[] = [];
    const say = async (text: string) => {
      history.push({ role: "user", content: text });
      const events: AssistantEvent[] = [];
      const added = await runFallback(history, ctx, (e) => events.push(e));
      expect(added).not.toBeNull();
      history.push(...added!);
      allCards.push(...cardsOf(events));
      return events;
    };

    await say("Help me start investing");
    await say("I'm new to investing");
    await say("5+ years");
    await say("Wait it out");
    expect(find(allCards, "profile")?.level).toBe("MODERATE");
    await say("Yes, go ahead");
    expect(find(allCards, "cashflow")?.readyToInvestCents).toBe(44_000);
    expect(find(allCards, "portfolio")?.lines.map((l) => l.amountCents)).toEqual([26_400, 11_000, 6_600]);
    expect(find(allCards, "risks")?.items).toHaveLength(3);
    const last = await say("Yes, add Auto-invest");

    const review = find(allCards, "review")!;
    expect(review.amountCents).toBe(44_000);
    expect(review.autoInvest?.days).toEqual([15, 30]);
    // Amounts in the fallback's text match the cards exactly.
    const text = last.filter((e) => e.t === "text").map((e) => (e as { d: string }).d).join("");
    expect(text).toContain("$440.00");
  });
});
