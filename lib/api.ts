import "server-only";
import { NextResponse } from "next/server";
import { InsufficientFundsError } from "@/lib/payments";
import { PayPalError } from "@/lib/paypal";
import { DepositError } from "@/lib/wallet";

export function jsonError(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** Append the PayPal debug id so users can quote it to support. */
export function withDebugId(message: string, debugId: string | null | undefined) {
  return debugId ? `${message} (PayPal debug ID: ${debugId})` : message;
}

/** Map thrown errors to a safe, user-facing message. Never leaks raw PayPal responses. */
export function errorMessage(err: unknown, fallback: string) {
  if (err instanceof InsufficientFundsError) return err.message;
  if (err instanceof Error && err.name === "UnknownContactError") return err.message;
  if (err instanceof Error && err.name === "InsufficientSharesError") return err.message;
  if (err instanceof DepositError) return withDebugId(err.message, err.debugId);
  if (err instanceof PayPalError) {
    console.error(fallback, { code: err.code, status: err.status, debugId: err.debugId });
    return withDebugId(err.message, err.debugId);
  }
  if (err instanceof Error && /^PayPal is not configured/.test(err.message)) return err.message;
  console.error(fallback, err instanceof Error ? err.message : err);
  return fallback;
}
