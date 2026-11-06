import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getCurrentUserId } from "@/lib/session";
import { PayPalOrderId } from "@/lib/validation";
import { cancelDeposit } from "@/lib/wallet";

/** Mark a pending deposit as canceled when the user closes the PayPal popup. */
export async function POST(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const parsed = PayPalOrderId.safeParse((await params).orderId);
  if (!parsed.success) return jsonError("Invalid PayPal order id.");
  await cancelDeposit(await getCurrentUserId(), parsed.data);
  return NextResponse.json({ ok: true });
}
