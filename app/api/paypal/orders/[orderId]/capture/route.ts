import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { errorMessage, jsonError, withDebugId } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { PayPalOrderId } from "@/lib/validation";
import { DepositError, completeDeposit } from "@/lib/wallet";

/**
 * Capture an approved PayPal order and credit the Finpal balance (exactly once).
 * Responses carry a `code` so the UI can show the right state:
 *  - 200 ok
 *  - 402 DECLINED  -> the PayPal popup lets the buyer pick another funding source
 *  - 202 PENDING   -> PayPal is still processing; the webhook will finish it
 *  - 4xx/502 other -> error message with the PayPal debug ID
 */
export async function POST(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const parsed = PayPalOrderId.safeParse((await params).orderId);
  if (!parsed.success) return jsonError("Invalid PayPal order id.");

  const userId = await getSessionUserId();
  if (!userId) return jsonError("Please start the demo first.", 401);
  try {
    const { amountCents } = await completeDeposit(userId, parsed.data);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balanceCents: true } });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, amountCents, balanceCents: user.balanceCents });
  } catch (err) {
    if (err instanceof DepositError) {
      const status = err.code === "DECLINED" ? 402 : err.code === "PENDING" ? 202 : err.code === "NOT_FOUND" ? 404 : 409;
      return jsonError(withDebugId(err.message, err.debugId), err.code === "PAYPAL" ? 502 : status, {
        code: err.code,
        debugId: err.debugId,
      });
    }
    return jsonError(errorMessage(err, "We couldn't complete the PayPal payment."), 502, { code: "PAYPAL" });
  }
}
