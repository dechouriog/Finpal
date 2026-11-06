import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { InsufficientFundsError } from "@/lib/payments";
import { positionValueCents } from "@/lib/portfolio";

// Shares are stored as floats; treat anything below this as zero.
const SHARE_EPSILON = 1e-6;

export class InsufficientSharesError extends Error {
  constructor() {
    super("You don't own enough of this asset to sell that amount.");
    this.name = "InsufficientSharesError";
  }
}

/**
 * Buy `amountCents` worth of an asset at its fixed demo price.
 * TODO(prices): use a live quote from a market data feed here instead of Asset.priceCents.
 */
export async function buyWithinTx(
  tx: Prisma.TransactionClient,
  args: { userId: string; assetId: string; amountCents: number; type?: "BUY" | "AUTO_INVEST"; note?: string },
) {
  const asset = await tx.asset.findUniqueOrThrow({ where: { id: args.assetId } });
  const debit = await tx.user.updateMany({
    where: { id: args.userId, balanceCents: { gte: args.amountCents } },
    data: { balanceCents: { decrement: args.amountCents } },
  });
  if (debit.count !== 1) throw new InsufficientFundsError();

  const shares = args.amountCents / asset.priceCents;
  await tx.position.upsert({
    where: { userId_assetId: { userId: args.userId, assetId: asset.id } },
    create: { userId: args.userId, assetId: asset.id, shares },
    update: { shares: { increment: shares } },
  });
  await tx.transaction.create({
    data: {
      userId: args.userId,
      type: args.type ?? "BUY",
      category: "invest",
      counterparty: asset.name,
      amountCents: -args.amountCents,
      assetId: asset.id,
      shares,
      note: args.note ?? null,
    },
  });
  return { shares, asset };
}

/** Sell `amountCents` worth of an asset (or everything, if `all`). */
export async function sellWithinTx(
  tx: Prisma.TransactionClient,
  args: { userId: string; assetId: string; amountCents: number; all?: boolean },
) {
  const asset = await tx.asset.findUniqueOrThrow({ where: { id: args.assetId } });
  const position = await tx.position.findUnique({
    where: { userId_assetId: { userId: args.userId, assetId: asset.id } },
  });
  if (!position || position.shares <= SHARE_EPSILON) throw new InsufficientSharesError();

  const ownedValue = positionValueCents(position, asset);
  const sellAll = args.all || args.amountCents >= ownedValue;
  if (!sellAll && args.amountCents > ownedValue) throw new InsufficientSharesError();
  const proceeds = sellAll ? ownedValue : args.amountCents;
  const shares = sellAll ? position.shares : args.amountCents / asset.priceCents;

  const updated = await tx.position.updateMany({
    where: { id: position.id, shares: { gte: shares - SHARE_EPSILON } },
    data: { shares: sellAll ? 0 : { decrement: shares } },
  });
  if (updated.count !== 1) throw new InsufficientSharesError();

  await tx.user.update({ where: { id: args.userId }, data: { balanceCents: { increment: proceeds } } });
  await tx.transaction.create({
    data: {
      userId: args.userId,
      type: "SELL",
      category: "invest",
      counterparty: asset.name,
      amountCents: proceeds,
      assetId: asset.id,
      shares,
    },
  });
  return { proceeds, shares, asset };
}

/** Everything the Invest screens need for one user. */
export async function getInvestOverview(userId: string) {
  const [user, assets, positions, plans] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balanceCents: true } }),
    prisma.asset.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.position.findMany({ where: { userId, shares: { gt: SHARE_EPSILON } } }),
    prisma.autoInvestEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);
  const byAsset = new Map(positions.map((p) => [p.assetId, p]));
  const rows = assets.map((a) => {
    const p = byAsset.get(a.id);
    const shares = p?.shares ?? 0;
    return {
      id: a.id,
      name: a.name,
      category: a.category,
      priceCents: a.priceCents,
      description: a.description,
      shares,
      valueCents: p ? positionValueCents(p, a) : 0,
    };
  });
  const investedCents = rows.reduce((s, r) => s + r.valueCents, 0);
  return { cashCents: user.balanceCents, investedCents, rows, plans };
}
