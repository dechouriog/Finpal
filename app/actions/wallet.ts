"use server";

import { revalidatePath } from "next/cache";
import { errorMessage } from "@/lib/api";
import { TOO_MANY, allow } from "@/lib/rate-limit";
import { getCurrentUserId } from "@/lib/session";
import { WithdrawInput } from "@/lib/validation";
import { withdraw } from "@/lib/wallet";

export type WithdrawResult = { ok: true; batchId: string; status: string } | { ok: false; error: string };

/** Withdraw from the Finpal balance to a PayPal sandbox account (PayPal Payouts). */
export async function withdrawToPayPal(input: WithdrawInput): Promise<WithdrawResult> {
  const parsed = WithdrawInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const userId = await getCurrentUserId();
    if (!allow("payout", userId)) return { ok: false, error: TOO_MANY };
    const res = await withdraw(userId, parsed.data.amountCents, parsed.data.receiverEmail);
    revalidatePath("/", "layout");
    return { ok: true, ...res };
  } catch (err) {
    return { ok: false, error: errorMessage(err, "PayPal couldn't send this payout. Your balance was not changed.") };
  }
}
