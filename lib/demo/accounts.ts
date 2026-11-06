import "server-only";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { createSpace, newDemoSpaceIds, RESERVED_SPACE } from "@/lib/demo/seed";

/** Create a new isolated demo space (Laura clone + her own Maria and Sam). Returns the main user. */
export async function createDemoAccount() {
  const ids = newDemoSpaceIds();
  await prisma.$transaction((tx) => createSpace(tx, ids, { isDemo: true }), { timeout: 30_000 });
  return prisma.user.findUniqueOrThrow({
    where: { id: ids.laura },
    select: { id: true, name: true, email: true },
  });
}

/** Constant-time check of the secret recording key. Disabled when DEMO_RECORDING_KEY is unset. */
export function isValidRecordingKey(key: unknown) {
  const expected = process.env.DEMO_RECORDING_KEY;
  if (!expected || expected.length < 16 || typeof key !== "string") return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getReservedLaura() {
  return prisma.user.findUnique({
    where: { id: RESERVED_SPACE.laura },
    select: { id: true, name: true, email: true },
  });
}
