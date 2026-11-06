import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { DEFAULT_USER_ID, DemoUserId } from "@/lib/domain";

export const USER_COOKIE = "finpal_uid";

/** The demo user currently selected in Profile (cookie), defaulting to Laura. */
export async function getCurrentUserId() {
  const raw = (await cookies()).get(USER_COOKIE)?.value;
  const parsed = DemoUserId.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_USER_ID;
}

export async function getCurrentUser() {
  const id = await getCurrentUserId();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error("Demo data not found. Run `npm run seed` to create it.");
  }
  return user;
}
