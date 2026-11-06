import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { errorMessage, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { PayPalOrderId } from "@/lib/validation";
import { completeDeposit } from "@/lib/wallet";

/** Capture an approved PayPal order and credit the Finpal balance. */
export async function POST(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const parsed = PayPalOrderId.safeParse((await params).orderId);
  if (!parsed.success) return jsonError("Invalid PayPal order id.");

  try {
    const userId = await getCurrentUserId();
    const { amountCents } = await completeDeposit(userId, parsed.data);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balanceCents: true } });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, amountCents, balanceCents: user.balanceCents });
  } catch (err) {
    return jsonError(errorMessage(err, "We couldn't complete the PayPal payment."), 502);
  }
}
