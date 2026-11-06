import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * The signed-in user's id from the Auth.js session cookie, or null.
 * The user id ALWAYS comes from the session, never from client input.
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** For pages and server actions: the signed-in user's id, or redirect to the welcome screen. */
export async function requireUserId(): Promise<string> {
  const id = await getSessionUserId();
  if (!id) redirect("/welcome");
  return id;
}

/** Alias kept for existing call sites. */
export const getCurrentUserId = requireUserId;

/** The signed-in user. If the account no longer exists (e.g. cleaned up), send them back to /welcome. */
export async function getCurrentUser() {
  const id = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/welcome?expired=1");
  return user;
}
