import "server-only";
import type { Prisma } from "@prisma/client";

/** Thrown when the recipient doesn't exist or belongs to another demo space. */
export class UnknownContactError extends Error {
  constructor() {
    super("You can only send money to your Finpal contacts.");
    this.name = "UnknownContactError";
  }
}

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
    tx.user.findUniqueOrThrow({ where: { id: fromUserId }, select: { fullName: true, spaceId: true } }),
    tx.user.findUnique({ where: { id: toUserId }, select: { fullName: true, spaceId: true } }),
  ]);
  // Isolation: money only moves between users of the same space.
  if (!to || to.spaceId !== from.spaceId) throw new UnknownContactError();

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
