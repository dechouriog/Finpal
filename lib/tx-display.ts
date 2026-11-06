import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Briefcase,
  Bus,
  CalendarClock,
  House,
  PenTool,
  ShoppingBasket,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Undo2,
  UtensilsCrossed,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Transaction } from "@prisma/client";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  client: Briefcase,
  rent: House,
  groceries: ShoppingBasket,
  utilities: Zap,
  internet: Wifi,
  phone: Smartphone,
  transport: Bus,
  software: PenTool,
  dining: UtensilsCrossed,
};

const TYPE_ICON: Record<string, LucideIcon> = {
  DEPOSIT: ArrowDownToLine,
  WITHDRAW: ArrowUpFromLine,
  SEND: ArrowUpRight,
  RECEIVE: ArrowDownLeft,
  BUY: TrendingUp,
  SELL: TrendingDown,
  AUTO_INVEST: CalendarClock,
  REFUND: Undo2,
};

type TxLike = Pick<Transaction, "type" | "category" | "counterparty">;

export function txIcon(tx: TxLike): LucideIcon {
  if (tx.type === "SEND" || tx.type === "RECEIVE") {
    return CATEGORY_ICON[tx.category] ?? TYPE_ICON[tx.type] ?? ArrowUpRight;
  }
  return TYPE_ICON[tx.type] ?? ArrowUpRight;
}

export { txTitle, formatShortDate } from "@/lib/tx-format";
