"use server";

import { safeError } from "@/lib/log";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { InsufficientFundsError, UnknownContactError, transferWithinTx } from "@/lib/payments";
import { TOO_MANY, allow } from "@/lib/rate-limit";
import { getCurrentUserId } from "@/lib/session";
import { RequestId, RequestMoneyInput, SendMoneyInput } from "@/lib/validation";
import type { ActionResult } from "./demo";

function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input.";
}

function failure(err: unknown, fallback: string): ActionResult {
  if (err instanceof InsufficientFundsError || err instanceof UnknownContactError) return { ok: false, error: err.message };
  if (err instanceof Error && err.message.startsWith("You can't")) return { ok: false, error: err.message };
  console.error(fallback, safeError(err));
  return { ok: false, error: fallback };
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Send money from the current user to another demo user. */
export async function sendMoney(input: SendMoneyInput): Promise<ActionResult> {
  const parsed = SendMoneyInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const fromUserId = await getCurrentUserId();
  if (!allow("transfer", fromUserId)) return { ok: false, error: TOO_MANY };
  const { toUserId, amountCents, note } = parsed.data;

  try {
    await prisma.$transaction((tx) => transferWithinTx(tx, { fromUserId, toUserId, amountCents, note }));
  } catch (err) {
    return failure(err, "The payment could not be completed.");
  }
  refresh();
  return { ok: true };
}

/** Ask another demo user for money. Nothing moves until they pay. */
export async function requestMoney(input: RequestMoneyInput): Promise<ActionResult> {
  const parsed = RequestMoneyInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const requesterId = await getCurrentUserId();
  if (!allow("transfer", requesterId)) return { ok: false, error: TOO_MANY };
  const { fromUserId, amountCents, note } = parsed.data;
  if (fromUserId === requesterId) return { ok: false, error: "You can't request money from yourself." };
  const [me, payer] = await Promise.all([
    prisma.user.findUnique({ where: { id: requesterId }, select: { spaceId: true } }),
    prisma.user.findUnique({ where: { id: fromUserId }, select: { spaceId: true } }),
  ]);
  if (!me || !payer || payer.spaceId !== me.spaceId) return { ok: false, error: new UnknownContactError().message };

  await prisma.moneyRequest.create({ data: { requesterId, payerId: fromUserId, amountCents, note } });
  refresh();
  return { ok: true };
}

/** Pay a request addressed to the current user. */
export async function payRequest(id: unknown): Promise<ActionResult> {
  const parsed = RequestId.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Unknown request." };
  const userId = await getCurrentUserId();
  if (!allow("transfer", userId)) return { ok: false, error: TOO_MANY };

  try {
    await prisma.$transaction(async (tx) => {
      // Claim the request first so it can only be paid once.
      const claim = await tx.moneyRequest.updateMany({
        where: { id: parsed.data, payerId: userId, status: "PENDING" },
        data: { status: "PAID", resolvedAt: new Date() },
      });
      if (claim.count !== 1) throw new Error("You can't pay this request anymore.");
      const req = await tx.moneyRequest.findUniqueOrThrow({ where: { id: parsed.data } });
      await transferWithinTx(tx, {
        fromUserId: userId,
        toUserId: req.requesterId,
        amountCents: req.amountCents,
        note: req.note,
      });
    });
  } catch (err) {
    return failure(err, "The request could not be paid.");
  }
  refresh();
  return { ok: true };
}

/** Decline a request addressed to me, or cancel one I made. */
export async function closeRequest(id: unknown): Promise<ActionResult> {
  const parsed = RequestId.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Unknown request." };
  const userId = await getCurrentUserId();

  const req = await prisma.moneyRequest.findUnique({ where: { id: parsed.data } });
  if (!req || req.status !== "PENDING") return { ok: false, error: "This request is already closed." };
  const status = req.payerId === userId ? "DECLINED" : req.requesterId === userId ? "CANCELED" : null;
  if (!status) return { ok: false, error: "Unknown request." };

  await prisma.moneyRequest.updateMany({
    where: { id: req.id, status: "PENDING" },
    data: { status, resolvedAt: new Date() },
  });
  refresh();
  return { ok: true };
}
