import { z } from "zod";
import { UserId } from "@/lib/domain";
import { MAX_TRANSFER_CENTS } from "@/lib/money";

export const AmountCents = z
  .number({ error: "Enter an amount." })
  .int("Amount must be in whole cents.")
  .min(1, "Enter an amount greater than $0.00.")
  .max(MAX_TRANSFER_CENTS, "The demo limit is $10,000.00 per transfer.");

const Note = z
  .string()
  .trim()
  .max(80, "Notes can be up to 80 characters.")
  .optional()
  .transform((v) => (v ? v : undefined));

export const SendMoneyInput = z.object({
  toUserId: UserId,
  amountCents: AmountCents,
  note: Note,
});
export type SendMoneyInput = z.input<typeof SendMoneyInput>;

export const RequestMoneyInput = z.object({
  fromUserId: UserId,
  amountCents: AmountCents,
  note: Note,
});
export type RequestMoneyInput = z.input<typeof RequestMoneyInput>;

export const RequestId = z.cuid();

export const DepositInput = z.object({ amountCents: AmountCents });

export const PayPalOrderId = z.string().regex(/^[A-Z0-9]{10,40}$/, "Invalid PayPal order id.");

export const WithdrawInput = z.object({
  amountCents: AmountCents,
  receiverEmail: z.email("Enter the email of a PayPal sandbox account.").max(120),
});
export type WithdrawInput = z.input<typeof WithdrawInput>;

export const AssetId = z.string().regex(/^[a-z0-9-]{2,60}$/, "Unknown asset.");

export const TradeInput = z.object({
  assetId: AssetId,
  amountCents: AmountCents,
  all: z.boolean().optional(),
});
export type TradeInput = z.input<typeof TradeInput>;

export const MonthDays = z
  .array(z.number().int().min(1).max(31))
  .min(1, "Pick at least one day of the month.")
  .max(4, "Pick up to 4 days.");

export const AutoInvestPlanInput = z.object({
  id: z.cuid().optional(),
  amountCents: AmountCents,
  days: MonthDays,
});
export type AutoInvestPlanInput = z.input<typeof AutoInvestPlanInput>;
