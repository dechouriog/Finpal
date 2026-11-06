import "server-only";
import {
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

/** Create a CAPTURE order for a Finpal top-up. Returns the PayPal order id. */
export async function createDepositOrder(amountCents: number, referenceId: string) {
  const { result } = await orders().createOrder({
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
  });
  if (!result.id) throw new Error("PayPal did not return an order id.");
  return result.id;
}

/** Capture an approved order. Returns the status and the captured amount in cents. */
export async function captureOrder(orderId: string) {
  const { result } = await orders().captureOrder({ id: orderId, prefer: "return=representation" });
  return summarizeCapture(result);
}

function summarizeCapture(order: Order) {
  const capture = order.purchaseUnits?.[0]?.payments?.captures?.[0];
  return {
    status: order.status ?? "UNKNOWN",
    captureId: capture?.id ?? null,
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
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
    message?: string;
    name?: string;
  };
  if (!res.ok || !json.batch_header?.payout_batch_id) {
    throw new Error(json.message || json.name || `PayPal payout failed (${res.status}).`);
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
