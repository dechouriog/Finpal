import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { valueToCents, verifyWebhookSignature } from "@/lib/paypal";
import { onCaptureCompleted, onCaptureDenied, onCaptureRefunded } from "@/lib/wallet";

export const dynamic = "force-dynamic";

const Amount = z.object({ value: z.string(), currency_code: z.string() });
const Event = z.object({
  id: z.string().min(1).max(100),
  event_type: z.string().max(100),
  resource: z
    .object({
      id: z.string().max(100),
      amount: Amount.optional(),
      supplementary_data: z
        .object({ related_ids: z.object({ order_id: z.string().optional() }).partial().optional() })
        .partial()
        .optional(),
      links: z.array(z.object({ href: z.string(), rel: z.string() })).optional(),
    })
    .passthrough(),
});

/**
 * PayPal webhook. Verifies the signature with PAYPAL_WEBHOOK_ID, then reconciles
 * captures idempotently (each event id is processed once). The capture response
 * remains the primary source of truth; the webhook catches anything it missed.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const h = req.headers;
  const verification = await verifyWebhookSignature(
    {
      authAlgo: h.get("paypal-auth-algo"),
      certUrl: h.get("paypal-cert-url"),
      transmissionId: h.get("paypal-transmission-id"),
      transmissionSig: h.get("paypal-transmission-sig"),
      transmissionTime: h.get("paypal-transmission-time"),
    },
    json,
  );
  if (verification === "unconfigured") {
    console.warn("PayPal webhook received but PAYPAL_WEBHOOK_ID is not set; ignoring it (capture responses still apply).");
    return NextResponse.json({ ok: true, ignored: "webhook not configured" });
  }
  if (verification !== "valid") return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = Event.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: true, ignored: "unsupported payload" });
  const event = parsed.data;

  // Dedup: PayPal retries deliveries; process each event id once.
  try {
    await prisma.webhookEvent.create({ data: { id: event.id, type: event.event_type } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw err;
  }

  const r = event.resource;
  const orderId = r.supplementary_data?.related_ids?.order_id ?? null;
  let outcome = "ignored";
  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED":
      if (r.amount?.currency_code === "USD") outcome = await onCaptureCompleted(orderId, r.id, valueToCents(r.amount.value));
      break;
    case "PAYMENT.CAPTURE.DENIED":
      outcome = await onCaptureDenied(orderId, r.id);
      break;
    case "PAYMENT.CAPTURE.REFUNDED": {
      // resource is the refund; its "up" link points to the original capture.
      const captureId = r.links?.find((l) => l.rel === "up")?.href.split("/").pop();
      if (captureId && r.amount?.currency_code === "USD") {
        outcome = await onCaptureRefunded(captureId, valueToCents(r.amount.value), r.id);
      }
      break;
    }
  }
  console.info("PayPal webhook", { type: event.event_type, id: event.id, outcome });
  return NextResponse.json({ ok: true, outcome });
}
