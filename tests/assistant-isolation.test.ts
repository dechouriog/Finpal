import { describe, expect, it } from "vitest";
import { TOOLS } from "@/lib/assistant/tools";
import { prisma } from "@/lib/db";
import { newSpace } from "./helpers";

describe("AI tools only read the signed-in user's data", () => {
  it("list_transactions, get_balance and get_portfolio never return another user's data", async () => {
    const a = await newSpace();
    const b = await newSpace();

    // Give user B a unique movement, balance and portfolio.
    await prisma.transaction.create({
      data: { userId: b.laura, type: "RECEIVE", category: "client", counterparty: "B-ONLY-SECRET-CLIENT", amountCents: 12_345 },
    });
    await prisma.user.update({ where: { id: b.laura }, data: { balanceCents: 777_77 } });
    await prisma.position.create({ data: { userId: b.laura, assetId: "aurora-cloud", shares: 3 } });

    const ctxA = { userId: a.laura, now: new Date() };
    const txs = (await TOOLS.list_transactions!.run({ limit: 30 }, ctxA)).result as { who: string }[];
    expect(txs.length).toBeGreaterThan(0);
    expect(JSON.stringify(txs)).not.toContain("B-ONLY-SECRET-CLIENT");

    const bal = (await TOOLS.get_balance!.run({}, ctxA)).result as { balance_cents: number };
    expect(bal.balance_cents).toBe(3_200_00);

    const pf = (await TOOLS.get_portfolio!.run({}, ctxA)).result as { holdings: unknown[] };
    expect(pf.holdings).toEqual([]);

    // Sanity: the same tools DO see B's data with B's context.
    const txsB = (await TOOLS.list_transactions!.run({ limit: 30 }, { userId: b.laura, now: new Date() })).result;
    expect(JSON.stringify(txsB)).toContain("B-ONLY-SECRET-CLIENT");
  });

  it("tools ignore any user id the model tries to pass", async () => {
    const a = await newSpace();
    const b = await newSpace();
    const res = (await TOOLS.get_balance!.run({ userId: b.laura, user_id: b.laura }, { userId: a.laura, now: new Date() }))
      .result as { balance_cents: number };
    const aUser = await prisma.user.findUniqueOrThrow({ where: { id: a.laura } });
    expect(res.balance_cents).toBe(aUser.balanceCents);
  });
});
