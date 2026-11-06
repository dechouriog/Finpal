import { z } from "zod";

/** Enum-like domain values. Stored as strings in the DB, validated with zod. */
export const TX_TYPES = ["DEPOSIT", "WITHDRAW", "SEND", "RECEIVE", "BUY", "SELL", "AUTO_INVEST", "REFUND"] as const;
export const TxType = z.enum(TX_TYPES);
export type TxType = z.infer<typeof TxType>;

export const TX_STATUSES = ["COMPLETED", "PENDING", "FAILED"] as const;
export const TxStatus = z.enum(TX_STATUSES);
export type TxStatus = z.infer<typeof TxStatus>;

export const ASSET_CATEGORIES = ["INDEX", "BOND", "GROWTH"] as const;
export const AssetCategory = z.enum(ASSET_CATEGORIES);
export type AssetCategory = z.infer<typeof AssetCategory>;

export const ASSET_CATEGORY_META: Record<AssetCategory, { label: string; color: string }> = {
  INDEX: { label: "Broad index funds", color: "#00C2A8" }, // teal
  BOND: { label: "Bonds", color: "#0B3D91" }, // navy
  GROWTH: { label: "Growth stocks", color: "#F59E0B" }, // amber
};

export const TX_TYPE_LABEL: Record<TxType, string> = {
  DEPOSIT: "Deposit",
  WITHDRAW: "Withdraw",
  SEND: "Send",
  RECEIVE: "Receive",
  BUY: "Buy",
  SELL: "Sell",
  AUTO_INVEST: "Auto-invest",
  REFUND: "Refund",
};

/** User ids are opaque strings; authorization always checks them server-side. */
export const UserId = z.string().trim().min(1).max(80);
