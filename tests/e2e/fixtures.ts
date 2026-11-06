import { test as base, expect, type Page } from "@playwright/test";

type Device = "desktop" | "mobile";

/**
 * Minimal stand-in for the PayPal JS SDK. Renders a "PayPal (test)" button that runs
 * the same createOrder -> onApprove callbacks the real popup would.
 */
const PAYPAL_SDK_STUB = `
window.paypal = {
  version: "5.0.0-e2e",
  FUNDING: { PAYPAL: "paypal", CARD: "card", VENMO: "venmo", PAYLATER: "paylater", CREDIT: "credit" },
  getFundingSources: function () { return ["paypal"]; },
  isFundingEligible: function () { return true; },
  Buttons: function (opts) {
    return {
      isEligible: function () { return true; },
      render: function (container) {
        var el = typeof container === "string" ? document.querySelector(container) : container;
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = "PayPal (test)";
        b.onclick = async function () {
          var id = await opts.createOrder({}, {});
          await opts.onApprove({ orderID: id }, { restart: function () { return Promise.resolve(); } });
        };
        el.appendChild(b);
        return Promise.resolve();
      },
      close: function () { return Promise.resolve(); },
      updateProps: function () { return Promise.resolve(); },
      hasReturned: function () { return false; }
    };
  }
};`;

/** Mock the PayPal popup: the SDK script, plus order create/capture as PayPal would answer after approval. */
export async function mockPayPal(page: Page, amountCents: number) {
  await page.route("**/sdk/js**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: PAYPAL_SDK_STUB }),
  );
  await page.route("**/api/paypal/orders", (route) =>
    route.fulfill({ json: { ok: true, orderId: "E2EORDER000000001" } }),
  );
  await page.route("**/api/paypal/orders/*/capture", (route) =>
    route.fulfill({ json: { ok: true, amountCents, balanceCents: 320_000 } }),
  );
}

export const test = base.extend<{ device: Device; startDemo: () => Promise<void> }>({
  device: ["desktop", { option: true }],
  startDemo: async ({ page, device }, use) => {
    await use(async () => {
      // Unique client IP per test so the per-IP demo rate limit never interferes.
      await page.setExtraHTTPHeaders({ "X-Forwarded-For": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.1` });
      await page.goto(`/welcome?device=${device}`);
      await page.getByRole("button", { name: "Try the demo" }).click();
      await page.waitForURL("**/");
      await expect(page.getByText("$3,200.00").first()).toBeVisible();
    });
  },
});

export { expect };
