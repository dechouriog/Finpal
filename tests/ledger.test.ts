import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { InsufficientFundsError, UnknownContactError, transferWithinTx } from "@/lib/payments";
import { newSpace } from "./helpers";

const balance = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).balanceCents;

describe("ledger transfers", () => {
  it("moves money on both sides atomically and records both rows", async () => {
    const s = await newSpace();
    const [a0, m0] = [await balance(s.laura), await balance(s.maria)];
    await prisma.$transaction((tx) => transferWithinTx(tx, { fromUserId: s.laura, toUserId: s.maria, amountCents: 25_50, note: "Coffee" }));
    expect(await balance(s.laura)).toBe(a0 - 25_50);
    expect(await balance(s.maria)).toBe(m0 + 25_50);

    const rows = await prisma.transaction.findMany({ where: { category: "p2p", userId: { in: [s.laura, s.maria] } } });
    expect(rows.map((r) => [r.type, r.amountCents]).sort()).toEqual([
      ["RECEIVE", 25_50],
      ["SEND", -25_50],
    ]);
  });

  it("rejects insufficient funds and leaves both balances unchanged", async () => {
    const s = await newSpace();
    const [a0, m0] = [await balance(s.laura), await balance(s.maria)];
    await expect(
      prisma.$transaction((tx) => transferWithinTx(tx, { fromUserId: s.laura, toUserId: s.maria, amountCents: a0 + 1 })),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
    expect(await balance(s.laura)).toBe(a0);
    expect(await balance(s.maria)).toBe(m0);
  });

  it("rejects a transfer to yourself", async () => {
    const s = await newSpace();
    await expect(
      prisma.$transaction((tx) => transferWithinTx(tx, { fromUserId: s.laura, toUserId: s.laura, amountCents: 100 })),
    ).rejects.toThrow("You can't send money to yourself.");
  });

  it("rejects transfers to another demo space", async () => {
    const a = await newSpace();
    const b = await newSpace();
    await expect(
      prisma.$transaction((tx) => transferWithinTx(tx, { fromUserId: a.laura, toUserId: b.maria, amountCents: 100 })),
    ).rejects.toBeInstanceOf(UnknownContactError);
  });

  it("never overdraws under concurrent payments", async () => {
    const s = await newSpace();
    await prisma.user.update({ where: { id: s.laura }, data: { balanceCents: 1_000 } });
    const pay = () =>
      prisma.$transaction((tx) => transferWithinTx(tx, { fromUserId: s.laura, toUserId: s.sam, amountCents: 600 })).then(
        () => "ok",
        () => "rejected",
      );
    const results = await Promise.all([pay(), pay()]);
    expect(results.sort()).toEqual(["ok", "rejected"]);
    expect(await balance(s.laura)).toBe(400);
  });
});
