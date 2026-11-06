import "server-only";
import { prisma } from "@/lib/db";

/** Messages per user per UTC day. Keeps the shared OpenRouter budget alive through judging. */
export function dailyLimit() {
  const n = Number(process.env.AI_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 60;
}

/**
 * Count one assistant message for today. Returns false (without counting) when
 * the user has reached the daily limit.
 */
export async function consumeAiMessage(userId: string, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const limit = dailyLimit();
  return prisma.$transaction(async (tx) => {
    const usage = await tx.aiUsage.findUnique({ where: { userId_day: { userId, day } } });
    if ((usage?.count ?? 0) >= limit) return false;
    await tx.aiUsage.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, count: 1 },
      update: { count: { increment: 1 } },
    });
    return true;
  });
}
