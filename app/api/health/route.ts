import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Health check for Render and uptime pings. Reports booleans only: never secrets.
 * 200 when the database answers; 503 otherwise.
 */
export async function GET() {
  const started = Date.now();
  let database = false;
  try {
    await prisma.asset.count();
    database = true;
  } catch {
    database = false;
  }
  const config = {
    paypal: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
    paypalEnv: process.env.PAYPAL_ENV === "live" ? "live" : "sandbox",
    paypalWebhook: Boolean(process.env.PAYPAL_WEBHOOK_ID),
    ai: Boolean(process.env.OPENROUTER_API_KEY),
    auth: Boolean(process.env.AUTH_SECRET),
  };
  return NextResponse.json(
    { ok: database, database, config, latencyMs: Date.now() - started, time: new Date().toISOString() },
    { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
