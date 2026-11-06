import { prisma } from "@/lib/db";
import { DEMO_ASSETS, createSpace, newDemoSpaceIds } from "@/lib/demo/seed";

/** Seed assets (idempotent) and create a fresh isolated demo space. */
export async function newSpace() {
  for (const asset of DEMO_ASSETS) await prisma.asset.upsert({ where: { id: asset.id }, create: asset, update: asset });
  const ids = newDemoSpaceIds();
  await prisma.$transaction((tx) => createSpace(tx, ids, { isDemo: true }), { timeout: 30_000 });
  return ids;
}
