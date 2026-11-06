import "server-only";
import { NextResponse } from "next/server";
import { InsufficientFundsError } from "@/lib/payments";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Map thrown errors to a safe, user-facing message. */
export function errorMessage(err: unknown, fallback: string) {
  if (err instanceof InsufficientFundsError) return err.message;
  if (err instanceof Error && err.name === "InsufficientSharesError") return err.message;
  if (err instanceof Error && /^(We couldn't|This deposit|PayPal did not|PayPal is not configured)/.test(err.message)) {
    return err.message;
  }
  console.error(fallback, err);
  return fallback;
}
