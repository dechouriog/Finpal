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
  RECEIVE: "bg-[#DCFCE7] text-[#166534]",
  BUY: "bg-[#FEF3C7] text-[#92400E]",
  SELL: "bg-[#FEF3C7] text-[#92400E]",
  AUTO_INVEST: "bg-teal-soft text-teal-ink",
  REFUND: "bg-[#FEE2E2] text-[#991B1B]",
};

export const STATUS_BADGE: Record<TxStatus, string> = {
  COMPLETED: "bg-[#DCFCE7] text-[#166534]",
  PENDING: "bg-[#FEF3C7] text-[#92400E]",
  FAILED: "bg-[#FEE2E2] text-[#991B1B]",
};

export function statusLabel(s: TxStatus) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
