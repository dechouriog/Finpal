import { afterEach, describe, expect, it } from "vitest";
import { consumeAiMessage } from "@/lib/assistant/usage";
import { newSpace } from "./helpers";

describe("Finpal AI daily budget", () => {
  afterEach(() => {
    process.env.AI_DAILY_LIMIT = "60";
  });

  it("allows AI_DAILY_LIMIT messages per user per day, then refuses", async () => {
    process.env.AI_DAILY_LIMIT = "3";
    const a = await newSpace();
    const b = await newSpace();
    const day = new Date("2026-11-07T10:00:00Z");
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await consumeAiMessage(a.laura, day));
    expect(results).toEqual([true, true, true, false]);
    // Per user: another user still has budget.
    expect(await consumeAiMessage(b.laura, day)).toBe(true);
    // Per day: tomorrow resets.
    expect(await consumeAiMessage(a.laura, new Date("2026-11-08T10:00:00Z"))).toBe(true);
  });
});
