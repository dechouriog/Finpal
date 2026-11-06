import type { Asset, Position } from "@prisma/client";

/** Value of a position in integer cents (fixed demo prices). */
export function positionValueCents(position: Pick<Position, "shares">, asset: Pick<Asset, "priceCents">) {
  return Math.round(position.shares * asset.priceCents);
}

export function portfolioValueCents(positions: (Pick<Position, "shares"> & { asset: Pick<Asset, "priceCents"> })[]) {
  return positions.reduce((sum, p) => sum + positionValueCents(p, p.asset), 0);
}
