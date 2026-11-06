import "server-only";
import { prisma } from "@/lib/db";
import { PalStage, stageFromProgress, stageRank, type PalStage as Stage } from "@/lib/pal";

/** Contributions = distinct investing moments (buys placed in the same minute count once). */
async function countContributions(userId: string) {
  const buys = await prisma.transaction.findMany({
    where: { userId, type: { in: ["BUY", "AUTO_INVEST"] }, status: "COMPLETED" },
    select: { createdAt: true },
  });
  return new Set(buys.map((b) => Math.floor(b.createdAt.getTime() / 60_000))).size;
}

/**
 * Recompute Pal's stage from the user's progress and store it. Stages only move
 * forward (Pal never shrinks); "Reset demo data" starts a new seed.
 */
export async function syncPalStage(userId: string): Promise<{ stage: Stage; previous: Stage; grew: boolean }> {
  const [user, contributions, plans] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { palStage: true } }),
    countContributions(userId),
    prisma.autoInvestEvent.count({ where: { userId } }),
  ]);
  const previous = PalStage.catch("seed").parse(user.palStage);
  const computed = stageFromProgress({ contributions, autoInvestActive: plans > 0 });
  const stage = stageRank(computed) > stageRank(previous) ? computed : previous;
  if (stage !== previous) await prisma.user.update({ where: { id: userId }, data: { palStage: stage } });
  return { stage, previous, grew: stage !== previous };
}
