"use client";

import { useRef } from "react";
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { Loader2 } from "lucide-react";

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

export type CaptureResult = { amountCents: number; balanceCents: number };

type Props = {
  amountCents: number;
  /** Use an order that was already created on the server (e.g. by the assistant). */
  orderId?: string;
  disabled?: boolean;
  /** The buyer approved in the popup; Finpal is now capturing. */
  onProcessing?: () => void;
  onSuccess: (result: CaptureResult) => void;
  onError: (message: string) => void;
  /** The buyer closed the popup or cancelled. */
  onCancel?: () => void;
  /** PayPal declined the funding source; the popup reopens so the buyer can pick another. */
  onDeclined?: (message: string) => void;
  /** PayPal accepted but is still processing; the webhook will finish the deposit. */
  onPending?: (message: string) => void;
};

class CheckoutError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
  }
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({ ok: false, error: "Unexpected response from Finpal." }))) as T & {
    ok: boolean;
    error?: string;
    code?: string;
  };
  if (!res.ok || !json.ok) throw new CheckoutError(json.error ?? "Something went wrong.", json.code ?? null);
  return json;
}

/**
 * Official PayPal Checkout button (JS SDK). The server creates and captures the
 * order; the buyer logs in only inside PayPal's own sandbox popup.
 */
export function PayPalCheckout(props: Props) {
  if (!CLIENT_ID) {
    return (
      <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
        PayPal is not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID in .env.
      </p>
    );
  }
  return (
    <PayPalScriptProvider options={{ clientId: CLIENT_ID, currency: "USD", intent: "capture", components: "buttons" }}>
      <Buttons {...props} />
    </PayPalScriptProvider>
  );
}

function Buttons({ amountCents, orderId, disabled, onProcessing, onSuccess, onError, onCancel, onDeclined, onPending }: Props) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  // Keep the latest values without re-rendering the PayPal iframe on every keystroke.
  const latest = useRef({ amountCents, orderId });
  latest.current = { amountCents, orderId };
  const currentOrder = useRef<string | null>(null);

  if (isRejected) {
    return (
      <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
        The PayPal button could not load. Check your connection and try again.
      </p>
    );
  }

  return (
    <div className="relative min-h-[55px]">
      {isPending && (
        <div className="absolute inset-0 grid place-items-center rounded-full bg-bg text-sm text-muted">
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading PayPal…
          </span>
        </div>
      )}
      <PayPalButtons
        fundingSource="paypal"
        disabled={disabled}
        forceReRender={[disabled]}
        style={{ layout: "horizontal", shape: "pill", height: 48, tagline: false, label: "pay" }}
        createOrder={async () => {
          try {
            if (latest.current.orderId) {
              currentOrder.current = latest.current.orderId;
              return latest.current.orderId;
            }
            const { orderId: id } = await postJson<{ orderId: string }>("/api/paypal/orders", {
              amountCents: latest.current.amountCents,
            });
            currentOrder.current = id;
            return id;
          } catch (err) {
            onError(err instanceof Error ? err.message : "We couldn't start the PayPal checkout.");
            throw err;
          }
        }}
        onApprove={async (data, actions) => {
          onProcessing?.();
          try {
            const result = await postJson<CaptureResult>(`/api/paypal/orders/${data.orderID}/capture`);
            onSuccess(result);
          } catch (err) {
            const e = err instanceof CheckoutError ? err : new CheckoutError("We couldn't complete the PayPal payment.", null);
            if (e.code === "DECLINED") {
              // Recoverable: reopen the PayPal flow so the buyer can choose another funding source.
              onDeclined?.(e.message);
              return actions.restart();
            }
            if (e.code === "PENDING") return onPending ? onPending(e.message) : onError(e.message);
            onError(e.message);
          }
        }}
        onCancel={() => {
          const id = currentOrder.current;
          if (id) void fetch(`/api/paypal/orders/${id}/cancel`, { method: "POST" });
          onCancel?.();
        }}
        onError={() => onError("PayPal reported a problem. Please try again.")}
      />
    </div>
  );
}
