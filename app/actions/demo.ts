"use server";

import { revalidatePath } from "next/cache";
import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { resetSpace } from "@/lib/demo/seed";
import { requireUserId } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** "Try the demo": create an isolated demo account and sign it in. */
export async function startDemo(): Promise<ActionResult> {
  try {
    await signIn("demo", { redirectTo: "/" });
    return { ok: true };
  } catch (err) {
    // signIn() throws a redirect on success; let Next.js handle it.
    if (!(err instanceof AuthError)) throw err;
    if (err instanceof CredentialsSignin && err.code === "rate_limited") {
      return { ok: false, error: "You've started several demos recently. Please try again in an hour." };
    }
    console.error("startDemo failed", err.type);
    return { ok: false, error: "We couldn't start the demo. Please try again." };
  }
}

export async function logOut() {
  await signOut({ redirectTo: "/welcome" });
}

/** Restore the signed-in user's own space (balance, history, contacts) to its initial state. */
export async function resetDemoData(): Promise<ActionResult> {
  const userId = await requireUserId();
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { spaceId: true, isDemo: true } });
    if (user.spaceId !== userId) return { ok: false, error: "Only the main demo account can reset its data." };
    await prisma.$transaction((tx) => resetSpace(tx, userId, user.isDemo), { timeout: 30_000 });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("resetDemoData failed", err);
    return { ok: false, error: "Could not reset demo data. Please try again." };
  }
}
