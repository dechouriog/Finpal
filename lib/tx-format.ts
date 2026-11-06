import type { Transaction } from "@prisma/client";

type TxLike = Pick<Transaction, "category" | "counterparty">;

/** Display name, e.g. "Studio Norte · client". */
export function txTitle(tx: TxLike) {
  if (tx.category === "client") return `${tx.counterparty} · client`;
  return tx.counterparty;
}

/** Short date like "Nov 3" (UTC, so server and client agree). */
export function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}
