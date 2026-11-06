import "server-only";
import {
  ApiError,
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController,
  type Order,
} from "@paypal/paypal-server-sdk";
import { PayPalAgentToolkit } from "@paypal/agent-toolkit/openai";

/**
 * PayPal SANDBOX integration.
 *  - Deposits ("Add money"): Orders v2 create + capture via @paypal/paypal-server-sdk
 *  - Withdrawals: Payouts v1 via REST (the server SDK has no Payouts controller)
 *  - Assistant: @paypal/agent-toolkit creates the deposit order the AI prepares
 */

function credentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.");
  }
  return { clientId, clientSecret };
}

const isLive = process.env.PAYPAL_ENV === "live";
const API_BASE = isLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

let ordersController: OrdersController | null = null;
function orders() {
  if (!ordersController) {
    const { clientId, clientSecret } = credentials();
    const client = new Client({
      clientCredentialsAuthCredentials: { oAuthClientId: clientId, oAuthClientSecret: clientSecret },
      environment: isLive ? Environment.Production : Environment.Sandbox,
      timeout: 15_000,
    });
    ordersController = new OrdersController(client);
  }
  return ordersController;
}

export function centsToValue(cents: number) {
  return (cents / 100).toFixed(2);
}

export function valueToCents(value: string | undefined) {
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value)) return NaN;
  const [whole = "0", frac = ""] = value.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

// ---------- errors ----------

/** A PayPal API failure with the fields support needs (never includes personal data). */
export class PayPalError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
    readonly debugId: string | null,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

type PayPalErrorBody = { name?: string; message?: string; debug_id?: string; details?: { issue?: string }[] };

function parseErrorBody(raw: unknown): PayPalErrorBody {
  if (raw && typeof raw === "object") return raw as PayPalErrorBody;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as PayPalErrorBody;
    } catch {
      return {};
    }
  }
  return {};
}

/** Normalize SDK/REST errors into PayPalError (issue code + debug id). */
export function toPayPalError(err: unknown, fallback: string): PayPalError {
  if (err instanceof PayPalError) return err;
  if (err instanceof ApiError) {
    const body = parseErrorBody(err.result ?? err.body);
    const debugId = body.debug_id ?? err.headers?.["paypal-debug-id"] ?? null;
    const code = body.details?.[0]?.issue ?? body.name ?? null;
    return new PayPalError(fallback, code, debugId, err.statusCode);
  }
  return new PayPalError(fallback, null, null, null);
}

/**
 * Create a CAPTURE order for a Finpal top-up. Returns the PayPal order id.
 * `requestId` is sent as PayPal-Request-Id, so retrying the same request never creates a second order.
 */
export async function createDepositOrder(amountCents: number, referenceId: string, requestId: string = referenceId) {
  const { result } = await orders().createOrder({
    paypalRequestId: requestId,
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          referenceId,
          description: "Finpal balance top-up",
          amount: { currencyCode: "USD", value: centsToValue(amountCents) },
        },
      ],
    },
    prefer: "return=minimal",
  }).catch((err: unknown) => {
    throw toPayPalError(err, "PayPal couldn't create the order.");
  });
  if (!result.id) throw new PayPalError("PayPal did not return an order id.", null, null, null);
  return result.id;
}

/**
 * Capture an approved order. Idempotent: PayPal-Request-Id is derived from the order id,
 * so a retried capture returns the original result instead of charging twice.
 */
export async function captureOrder(orderId: string) {
  const { result } = await orders()
    .captureOrder({ id: orderId, paypalRequestId: `capture-${orderId}`, prefer: "return=representation" })
    .catch((err: unknown) => {
      throw toPayPalError(err, "PayPal couldn't complete the payment.");
    });
  return summarizeCapture(result);
}

/** Read an order (used to reconcile when a capture was already done). */
export async function getOrder(orderId: string) {
  const { result } = await orders()
    .getOrder({ id: orderId })
    .catch((err: unknown) => {
      throw toPayPalError(err, "PayPal couldn't read the order.");
    });
  return summarizeCapture(result);
}

function summarizeCapture(order: Order) {
  const capture = order.purchaseUnits?.[0]?.payments?.captures?.[0];
  return {
    status: order.status ?? "UNKNOWN",
    captureId: capture?.id ?? null,
    // COMPLETED | PENDING | DECLINED | ... (status of the capture itself)
    captureStatus: capture?.status ?? null,
    capturedCents: valueToCents(capture?.amount?.value),
    currency: capture?.amount?.currencyCode ?? null,
  };
}

// ---------- OAuth for REST endpoints not covered by the server SDK ----------

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { clientId, clientSecret } = credentials();
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status}).`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

/** Send a payout to a PayPal (sandbox) account email. */
export async function createPayout(args: { amountCents: number; receiverEmail: string; senderBatchId: string }) {
  const token = await accessToken();
  const res = await fetch(`${API_BASE}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Idempotency: retrying the same withdrawal never sends a second payout.
      "PayPal-Request-Id": `payout-${args.senderBatchId}`,
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: args.senderBatchId,
        email_subject: "You have money from Finpal",
        email_message: "Your Finpal withdrawal has been sent.",
      },
      items: [
        {
          recipient_type: "EMAIL",
          receiver: args.receiverEmail,
          amount: { value: centsToValue(args.amountCents), currency: "USD" },
          note: "Finpal withdrawal",
          sender_item_id: args.senderBatchId,
        },
      ],
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    batch_header?: { payout_batch_id?: string; batch_status?: string };
  } & PayPalErrorBody;
  if (!res.ok || !json.batch_header?.payout_batch_id) {
    const body = json as PayPalErrorBody;
    throw new PayPalError(
      "PayPal couldn't send this payout.",
      body.details?.[0]?.issue ?? body.name ?? null,
      body.debug_id ?? res.headers.get("paypal-debug-id"),
      res.status,
    );
  }
  return { batchId: json.batch_header.payout_batch_id, status: json.batch_header.batch_status ?? "PENDING" };
}

// ---------- Agent Toolkit ----------

let toolkit: PayPalAgentToolkit | null = null;
function agentToolkit() {
  if (!toolkit) {
    const { clientId, clientSecret } = credentials();
    toolkit = new PayPalAgentToolkit({
      clientId,
      clientSecret,
      configuration: { actions: { orders: { create: true, get: true } }, context: { sandbox: !isLive } },
    });
  }
  return toolkit;
}

/**
 * Create a deposit order through the PayPal Agent Toolkit's `create_order` tool.
 * Creating an order does NOT move money: the user still has to approve it in the
 * PayPal popup and Finpal captures it only after that.
 */
export async function createDepositOrderViaAgentToolkit(amountCents: number) {
  const value = Number(centsToValue(amountCents));
  const result = await agentToolkit().handleToolCall({
    id: `finpal-${Date.now()}`,
    type: "function",
    function: {
      name: "create_order",
      arguments: JSON.stringify({
        currencyCode: "USD",
        items: [{ name: "Finpal balance top-up", quantity: 1, itemCost: value, itemTotal: value }],
      }),
    },
  });
  const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
  const id = text.match(/"id"\s*:\s*"([A-Z0-9]{17,32})"/)?.[1];
  if (!id) throw new Error("The PayPal Agent Toolkit did not return an order id.");
  return id;
}

// ---------- Webhooks ----------

export type WebhookHeaders = {
  authAlgo: string | null;
  certUrl: string | null;
  transmissionId: string | null;
  transmissionSig: string | null;
  transmissionTime: string | null;
};

/**
 * Verify a webhook with PayPal's verify-webhook-signature API.
 * Returns "unconfigured" when PAYPAL_WEBHOOK_ID is not set.
 */
export async function verifyWebhookSignature(headers: WebhookHeaders, event: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return "unconfigured" as const;
  if (Object.values(headers).some((v) => !v)) return "invalid" as const;
  const token = await accessToken();
  const res = await fetch(`${API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: event,
    }),
    cache: "no-store",
  });
  if (!res.ok) return "invalid" as const;
  const json = (await res.json()) as { verification_status?: string };
  return json.verification_status === "SUCCESS" ? ("valid" as const) : ("invalid" as const);
}
