import { NextResponse } from "next/server";
import { errorMessage, jsonError } from "@/lib/api";
import { getCurrentUserId } from "@/lib/session";
import { DepositInput } from "@/lib/validation";
import { startDeposit } from "@/lib/wallet";

/** Create a PayPal order for an "Add money" deposit. */
export async function POST(req: Request) {
  const parsed = DepositInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid amount.");

  try {
    const userId = await getCurrentUserId();
    const orderId = await startDeposit(userId, parsed.data.amountCents);
    return NextResponse.json({ ok: true, orderId });
  } catch (err) {
    return jsonError(errorMessage(err, "We couldn't start the PayPal checkout."), 502);
  }
}
