import type { TxStatus, TxType } from "@/lib/domain";

/** Serializable transaction row sent to client components. */
export type ActivityRow = {
  id: string;
  type: TxType;
  category: string;
  counterparty: string;
  title: string;
  amountCents: number;
  status: TxStatus;
  note: string | null;
  createdAt: string; // ISO
  externalRef: string | null;
  shares: number | null;
  /** Seeded history, labeled "Demo data". */
  isSeed: boolean;
};

export const TYPE_BADGE: Record<TxType, string> = {
  DEPOSIT: "bg-teal-soft text-teal-ink",
  WITHDRAW: "bg-navy-soft text-navy",
  SEND: "bg-bg text-ink ring-1 ring-line",
  RECEIVE: "bg-success-soft text-success-ink",
  BUY: "bg-amber-soft text-amber-ink",
  SELL: "bg-amber-soft text-amber-ink",
  AUTO_INVEST: "bg-teal-soft text-teal-ink",
  REFUND: "bg-danger-soft text-danger-ink",
};

export const STATUS_BADGE: Record<TxStatus, string> = {
  COMPLETED: "bg-success-soft text-success-ink",
  PENDING: "bg-amber-soft text-amber-ink",
  FAILED: "bg-danger-soft text-danger-ink",
};

export function statusLabel(s: TxStatus) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
