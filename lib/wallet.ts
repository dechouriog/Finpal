import "server-only";
import { prisma } from "@/lib/db";
import { InsufficientFundsError } from "@/lib/payments";
import { PayPalError, captureOrder, createDepositOrder, createPayout, getOrder, toPayPalError } from "@/lib/paypal";

/**
 * Deposits and withdrawals through the PayPal Sandbox.
 *
 * Every PayPal order is stored as a PaymentOrder. A deposit is credited to the
 * balance exactly once, by whichever arrives first: the capture response or the
 * PAYMENT.CAPTURE.COMPLETED webhook (see creditOnce).
 */

/** User-facing deposit outcome errors. `code` lets the UI pick the right state. */
export class DepositError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "DECLINED" | "PENDING" | "INVALID_STATE" | "PAYPAL",
    readonly debugId: string | null = null,
  ) {
    super(message);
    this.name = "DepositError";
  }
}

const DECLINE_CODES = new Set(["INSTRUMENT_DECLINED", "PAYER_ACTION_REQUIRED", "TRANSACTION_REFUSED"]);

/** Step 1: create the PayPal order (or register one created elsewhere) and a PENDING ledger row. */
export async function startDeposit(userId: string, amountCents: number, existingOrderId?: string) {
  const record = await prisma.paymentOrder.create({ data: { userId, amountCents } });
  const ledger = await prisma.transaction.create({
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
    // record.id doubles as the PayPal-Request-Id: retries never create a second order.
    const orderId = existingOrderId ?? (await createDepositOrder(amountCents, record.id));
    await prisma.$transaction([
      prisma.paymentOrder.update({
        where: { id: record.id },
        data: { paypalOrderId: orderId, status: "CREATED", transactionId: ledger.id },
      }),
      prisma.transaction.update({ where: { id: ledger.id }, data: { externalRef: orderId } }),
    ]);
    return orderId;
  } catch (err) {
    const pe = toPayPalError(err, "PayPal couldn't create the order.");
    await prisma.$transaction([
      prisma.paymentOrder.update({ where: { id: record.id }, data: { status: "FAILED", debugId: pe.debugId } }),
      prisma.transaction.update({ where: { id: ledger.id }, data: { status: "FAILED" } }),
    ]);
    throw pe;
  }
}

/**
 * Credit a completed capture exactly once. Safe to call from the capture route
 * AND the webhook, in any order, any number of times.
 */
export async function creditOnce(paymentOrderId: string, captureId: string | null) {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.paymentOrder.updateMany({
      where: { id: paymentOrderId, status: { in: ["CREATED", "PENDING"] } },
      data: { status: "COMPLETED", captureId },
    });
    if (claim.count !== 1) return false; // already credited (or no longer creditable)
    const order = await tx.paymentOrder.findUniqueOrThrow({ where: { id: paymentOrderId } });
    await tx.user.update({ where: { id: order.userId }, data: { balanceCents: { increment: order.amountCents } } });
    if (order.transactionId) {
      await tx.transaction.update({
        where: { id: order.transactionId },
        data: { status: "COMPLETED", note: captureId ? `Funded with PayPal · capture ${captureId}` : "Funded with PayPal" },
      });
    }
    return true;
  });
}

async function markOrder(paymentOrderId: string, status: string, debugId: string | null = null) {
  const order = await prisma.paymentOrder.update({ where: { id: paymentOrderId }, data: { status, debugId } });
  if (order.transactionId && (status === "DECLINED" || status === "CANCELED" || status === "FAILED")) {
    await prisma.transaction.update({
      where: { id: order.transactionId },
      data: { status: "FAILED", note: status === "CANCELED" ? "Canceled in PayPal" : "Not completed by PayPal" },
    });
  }
}

/** Step 2: capture an approved order and credit the balance (idempotent). */
export async function completeDeposit(userId: string, orderId: string) {
  const order = await prisma.paymentOrder.findFirst({ where: { userId, paypalOrderId: orderId } });
  if (!order) throw new DepositError("We couldn't find this deposit.", "NOT_FOUND");
  if (order.status === "COMPLETED") return { amountCents: order.amountCents, alreadyCaptured: true };
  if (!["CREATED", "PENDING"].includes(order.status)) {
    throw new DepositError("This deposit can no longer be completed.", "INVALID_STATE");
  }

  let capture: Awaited<ReturnType<typeof captureOrder>>;
  try {
    capture = await captureOrder(orderId);
  } catch (err) {
    const pe = toPayPalError(err, "PayPal couldn't complete the payment.");
    if (pe.code === "ORDER_ALREADY_CAPTURED") {
      capture = await getOrder(orderId); // reconcile with PayPal's state
    } else if (pe.code && DECLINE_CODES.has(pe.code)) {
      // The buyer can pick another funding source in the popup; keep the order open.
      await prisma.paymentOrder.update({ where: { id: order.id }, data: { debugId: pe.debugId } });
      throw new DepositError("PayPal declined this payment method. Please choose another one.", "DECLINED", pe.debugId);
    } else {
      await prisma.paymentOrder.update({ where: { id: order.id }, data: { debugId: pe.debugId } });
      throw new DepositError(pe.message, "PAYPAL", pe.debugId);
    }
  }

  const amountOk = capture.capturedCents === order.amountCents && capture.currency === "USD";
  if (capture.captureStatus === "COMPLETED" && amountOk) {
    await creditOnce(order.id, capture.captureId);
    return { amountCents: order.amountCents, alreadyCaptured: false };
  }
  if (capture.captureStatus === "PENDING") {
    await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: "PENDING", captureId: capture.captureId } });
    throw new DepositError("PayPal is still processing this payment. We'll add it as soon as it clears.", "PENDING");
  }
  await markOrder(order.id, "DECLINED");
  throw new DepositError("PayPal did not complete the payment.", "DECLINED");
}

/** Buyer closed or cancelled the popup. */
export async function cancelDeposit(userId: string, orderId: string) {
  const order = await prisma.paymentOrder.findFirst({ where: { userId, paypalOrderId: orderId, status: "CREATED" } });
  if (order) await markOrder(order.id, "CANCELED");
}

// ---------- webhook reconciliation ----------

/** PAYMENT.CAPTURE.COMPLETED */
export async function onCaptureCompleted(orderId: string | null, captureId: string, amountCents: number) {
  const order = orderId
    ? await prisma.paymentOrder.findUnique({ where: { paypalOrderId: orderId } })
    : await prisma.paymentOrder.findUnique({ where: { captureId } });
  if (!order) return "unknown_order";
  if (amountCents !== order.amountCents) return "amount_mismatch";
  return (await creditOnce(order.id, captureId)) ? "credited" : "already_credited";
}

/** PAYMENT.CAPTURE.DENIED */
export async function onCaptureDenied(orderId: string | null, captureId: string) {
  const order = orderId
    ? await prisma.paymentOrder.findUnique({ where: { paypalOrderId: orderId } })
    : await prisma.paymentOrder.findUnique({ where: { captureId } });
  if (!order || order.status === "COMPLETED") return "ignored";
  await markOrder(order.id, "DECLINED");
  return "declined";
}

/** PAYMENT.CAPTURE.REFUNDED: the money went back to the buyer, so take it out of the Finpal balance. */
export async function onCaptureRefunded(captureId: string, refundCents: number, refundId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.paymentOrder.findUnique({ where: { captureId } });
    if (!order) return "unknown_order";
    const claim = await tx.paymentOrder.updateMany({
      where: { id: order.id, status: "COMPLETED" },
      data: { status: "REFUNDED" },
    });
    if (claim.count !== 1) return "already_refunded";
    await tx.user.update({ where: { id: order.userId }, data: { balanceCents: { decrement: refundCents } } });
    await tx.transaction.create({
      data: {
        userId: order.userId,
        type: "REFUND",
        category: "refund",
        counterparty: "PayPal",
        amountCents: -refundCents,
        externalRef: refundId,
        note: `Refund of PayPal order ${order.paypalOrderId ?? ""}`.trim(),
      },
    });
    return "refunded";
  });
}

// ---------- withdrawals ----------

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
      prisma.transaction.update({ where: { id: record.id }, data: { status: "FAILED", note: "PayPal Payouts · refunded" } }),
      prisma.user.update({ where: { id: userId }, data: { balanceCents: { increment: amountCents } } }),
    ]);
    throw err instanceof PayPalError ? err : toPayPalError(err, "PayPal couldn't send this payout.");
  }
}
