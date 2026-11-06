import "server-only";
import { prisma } from "@/lib/db";
import { InsufficientFundsError } from "@/lib/payments";
import { captureOrder, createDepositOrder, createPayout } from "@/lib/paypal";

/**
 * Deposits and withdrawals that go through the PayPal Sandbox.
 * Every balance change happens inside a Prisma transaction and is idempotent.
 */

/** Step 1 of a deposit: create the PayPal order and a PENDING Finpal transaction. */
export async function startDeposit(userId: string, amountCents: number, existingOrderId?: string) {
  const pending = await prisma.transaction.create({
    data: {
      userId,
      type: "DEPOSIT",
      category: "deposit",
      counterparty: "PayPal",
      amountCents,
      status: "PENDING",
      note: "Funded with PayPal",
    },
  });
  try {
    const orderId = existingOrderId ?? (await createDepositOrder(amountCents, pending.id));
    await prisma.transaction.update({ where: { id: pending.id }, data: { externalRef: orderId } });
    return orderId;
  } catch (err) {
    await prisma.transaction.update({ where: { id: pending.id }, data: { status: "FAILED" } });
    throw err;
  }
}

/**
 * Step 2 of a deposit: capture the approved order and credit the balance.
 * Safe to call twice: only the first call that flips PENDING -> COMPLETED credits money.
 */
export async function completeDeposit(userId: string, orderId: string) {
  const pending = await prisma.transaction.findFirst({
    where: { userId, externalRef: orderId, type: "DEPOSIT" },
  });
  if (!pending) throw new Error("We couldn't find this deposit.");
  if (pending.status === "COMPLETED") return { amountCents: pending.amountCents, alreadyCaptured: true };
  if (pending.status !== "PENDING") throw new Error("This deposit can no longer be completed.");

  const capture = await captureOrder(orderId);
  if (capture.status !== "COMPLETED" || capture.capturedCents !== pending.amountCents || capture.currency !== "USD") {
    await prisma.transaction.update({ where: { id: pending.id }, data: { status: "FAILED" } });
    throw new Error("PayPal did not complete the payment.");
  }

  await prisma.$transaction(async (tx) => {
    const claim = await tx.transaction.updateMany({
      where: { id: pending.id, status: "PENDING" },
      data: { status: "COMPLETED", note: `Funded with PayPal · capture ${capture.captureId ?? ""}`.trim() },
    });
    if (claim.count === 1) {
      await tx.user.update({ where: { id: userId }, data: { balanceCents: { increment: pending.amountCents } } });
    }
  });
  return { amountCents: pending.amountCents, alreadyCaptured: false };
}

export async function cancelDeposit(userId: string, orderId: string) {
  await prisma.transaction.updateMany({
    where: { userId, externalRef: orderId, type: "DEPOSIT", status: "PENDING" },
    data: { status: "FAILED", note: "Canceled in PayPal" },
  });
}

/**
 * Withdraw to a PayPal sandbox account with Payouts.
 * The balance is debited first (atomically); if PayPal rejects the payout, it is refunded.
 */
export async function withdraw(userId: string, amountCents: number, receiverEmail: string) {
  const record = await prisma.$transaction(async (tx) => {
    const debit = await tx.user.updateMany({
      where: { id: userId, balanceCents: { gte: amountCents } },
      data: { balanceCents: { decrement: amountCents } },
    });
    if (debit.count !== 1) throw new InsufficientFundsError();
    return tx.transaction.create({
      data: {
        userId,
        type: "WITHDRAW",
        category: "withdraw",
        counterparty: receiverEmail,
        amountCents: -amountCents,
        status: "PENDING",
        note: "PayPal Payouts",
      },
    });
  });

  try {
    const payout = await createPayout({ amountCents, receiverEmail, senderBatchId: record.id });
    const status = payout.status === "SUCCESS" ? "COMPLETED" : "PENDING";
    await prisma.transaction.update({ where: { id: record.id }, data: { externalRef: payout.batchId, status } });
    return { batchId: payout.batchId, status };
  } catch (err) {
    await prisma.$transaction([
      prisma.transaction.update({ where: { id: record.id }, data: { status: "FAILED" } }),
      prisma.user.update({ where: { id: userId }, data: { balanceCents: { increment: amountCents } } }),
    ]);
    throw err;
  }
}
