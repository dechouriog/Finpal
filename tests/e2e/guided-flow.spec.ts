import { expect, mockPayPal, test } from "./fixtures";

test("Try the demo -> Pal guided flow -> Review & confirm -> You're invested!", async ({ page, startDemo }) => {
  await startDemo();
  await mockPayPal(page, 44_000);

  // Open the assistant from the floating button (present on every screen).
  await page.getByRole("button", { name: "Ask Pal" }).filter({ visible: true }).last().click();
  const chat = page.getByRole("dialog");
  await expect(chat.getByText("Education, not financial advice")).toBeVisible();

  const reply = async (choice: string, nextVisible: string | RegExp) => {
    await chat.getByRole("button", { name: choice, exact: true }).click();
    await expect(chat.getByText(nextVisible).last()).toBeVisible();
  };

  await chat.getByRole("button", { name: "Help me start investing" }).click();
  await expect(chat.getByRole("button", { name: "I'm new to investing" })).toBeVisible();
  await reply("I'm new to investing", "Under 2 years");
  await reply("5+ years", "Wait it out");
  await reply("Wait it out", "Moderate · 5+ years");
  await reply("Yes, go ahead", "Here's what I found");

  // Numbers come from tools: $440 ready, split $264 / $110 / $66.
  await expect(chat.getByText("Ready to invest now")).toBeVisible();
  await expect(chat.getByText("$440.00").first()).toBeVisible();
  for (const amount of ["$264.00", "$110.00", "$66.00"]) await expect(chat.getByText(amount).first()).toBeVisible();
  await expect(chat.getByText("Prices go down, too")).toBeVisible();

  await reply("Yes, add Auto-invest", "Ready when you are");
  await chat.getByRole("button", { name: "Review & confirm" }).click();

  const review = page.getByRole("dialog", { name: "Review and confirm" });
  await expect(review.getByText("Pay with PayPal")).toBeVisible();
  await review.getByRole("button", { name: "Confirm & fund" }).click();
  // Mocked PayPal popup: approve the payment.
  await review.getByRole("button", { name: "PayPal (test)" }).click();

  await expect(review.getByText("You're invested!")).toBeVisible();
  await expect(review.getByText("Nov 15").or(review.getByText(/\w{3} 15/)).first()).toBeVisible();

  // Invest shows the new portfolio.
  await review.getByRole("link", { name: "See my portfolio" }).click();
  await page.waitForURL("**/invest");
  await expect(page.getByText("$440.00").filter({ visible: true }).first()).toBeVisible();

  // Activity shows the three buys.
  await page.goto("/activity");
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  await expect(page.getByText("Total Market Index Fund").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Short-Term Bond Fund").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Aurora Cloud Systems").filter({ visible: true }).first()).toBeVisible();
});

test("Add money: PayPal approval credits the balance", async ({ page, startDemo }) => {
  await startDemo();
  await mockPayPal(page, 5_000);
  await page.goto("/add-money");
  await page.getByRole("button", { name: "PayPal (test)" }).click();
  await expect(page.getByText("Money added!")).toBeVisible();
  await expect(page.getByText("$50.00 from PayPal is in your Finpal balance.")).toBeVisible();
});
