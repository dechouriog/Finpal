"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { seedDemo } from "@/lib/demo/seed";
import { DemoUserId } from "@/lib/domain";
import { USER_COOKIE } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Switch the active demo user (Laura, Maria or Sam). */
export async function switchDemoUser(input: unknown): Promise<ActionResult> {
  const parsed = DemoUserId.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown demo user." };

  (await cookies()).set(USER_COOKIE, parsed.data, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Restore every demo account to its original state. */
export async function resetDemoData(): Promise<ActionResult> {
  try {
    await seedDemo(prisma);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("resetDemoData failed", err);
    return { ok: false, error: "Could not reset demo data. Please try again." };
  }
}
