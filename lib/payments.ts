import "server-only";
import type { Prisma } from "@prisma/client";

export class InsufficientFundsError extends Error {
  constructor() {
    super("You don't have enough balance for this payment.");
    this.name = "InsufficientFundsError";
  }
}

type TransferArgs = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  note?: string | null;
};

/**
 * Move money between two Finpal users. Must be called inside a Prisma
 * transaction. The debit is conditional (balance >= amount) so two concurrent
 * payments can never overdraw the account.
 */
export async function transferWithinTx(tx: Prisma.TransactionClient, args: TransferArgs) {
  const { fromUserId, toUserId, amountCents, note } = args;
  if (fromUserId === toUserId) throw new Error("You can't send money to yourself.");

  const [from, to] = await Promise.all([
    tx.user.findUniqueOrThrow({ where: { id: fromUserId }, select: { fullName: true } }),
    tx.user.findUniqueOrThrow({ where: { id: toUserId }, select: { fullName: true } }),
  ]);

  const debit = await tx.user.updateMany({
    where: { id: fromUserId, balanceCents: { gte: amountCents } },
    data: { balanceCents: { decrement: amountCents } },
  });
  if (debit.count !== 1) throw new InsufficientFundsError();

  await tx.user.update({ where: { id: toUserId }, data: { balanceCents: { increment: amountCents } } });

  const createdAt = new Date();
  await tx.transaction.createMany({
    data: [
      {
        userId: fromUserId,
        type: "SEND",
        category: "p2p",
        counterparty: to.fullName,
        amountCents: -amountCents,
        note: note ?? null,
        createdAt,
      },
      {
        userId: toUserId,
        type: "RECEIVE",
        category: "p2p",
        counterparty: from.fullName,
        amountCents,
        note: note ?? null,
        createdAt,
      },
    ],
  });
}
