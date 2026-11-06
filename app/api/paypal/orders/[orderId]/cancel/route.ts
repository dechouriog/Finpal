import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSessionUserId } from "@/lib/session";
import { PayPalOrderId } from "@/lib/validation";
import { cancelDeposit } from "@/lib/wallet";

/** Mark a pending deposit as canceled when the user closes the PayPal popup. */
export async function POST(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const parsed = PayPalOrderId.safeParse((await params).orderId);
  if (!parsed.success) return jsonError("Invalid PayPal order id.");
  const userId = await getSessionUserId();
  if (!userId) return jsonError("Please start the demo first.", 401);
  await cancelDeposit(userId, parsed.data);
  return NextResponse.json({ ok: true });
}
