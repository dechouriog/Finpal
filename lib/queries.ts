import "server-only";
import { prisma } from "@/lib/db";
import { portfolioValueCents } from "@/lib/portfolio";

export async function getRecentTransactions(userId: string, take = 5) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getPortfolioSummary(userId: string) {
  const positions = await prisma.position.findMany({
    where: { userId, shares: { gt: 0 } },
    include: { asset: true },
  });
  return { valueCents: portfolioValueCents(positions), positionCount: positions.length };
}

export async function listDemoUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, fullName: true, occupation: true, avatarColor: true, balanceCents: true },
  });
}
