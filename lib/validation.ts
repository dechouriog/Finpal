import { z } from "zod";
import { DemoUserId } from "@/lib/domain";
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
  toUserId: DemoUserId,
  amountCents: AmountCents,
  note: Note,
});
export type SendMoneyInput = z.input<typeof SendMoneyInput>;

export const RequestMoneyInput = z.object({
  fromUserId: DemoUserId,
  amountCents: AmountCents,
  note: Note,
});
export type RequestMoneyInput = z.input<typeof RequestMoneyInput>;

export const RequestId = z.cuid();
