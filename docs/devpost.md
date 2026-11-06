# Finpal: Devpost submission

Ready-to-paste sections for the Devpost project page.

## Links

- **Live app:** https://finpal-r4cd.onrender.com
- **Source code:** https://github.com/dechouriog/Finpal

## Testing instructions

1. Open https://finpal-r4cd.onrender.com and tap **Try the demo** (no sign-up). The first visit after a quiet period can take up to a minute while the server wakes up.
2. Switch to **Mobile** at the top, tap **Help me start investing** and answer Pal with the quick replies.
3. Tap **Review & confirm**, keep **Pay with PayPal** and tap **Confirm & fund**.
4. In the PayPal Sandbox window, log in with `finpal-judges@personal.example.com` and the password `<add the sandbox password here, only on Devpost>`.
5. Check **Invest** and **Activity**. **Profile → Reset demo data** starts over.

## Inspiration

Many people keep their savings sitting in a digital wallet. Freelancers who get paid in dollars are a big part of that group: the money is safe, but it doesn't grow, and inflation slowly eats it. Most of them would like to invest, but they never start. They don't know how much they can safely put in, brokers feel intimidating, and nobody explains the risks in plain language first.

We asked a simple question: what if the wallet where the money already lives came with a friendly, honest investing buddy?

## What it does

Finpal is a wallet with **Pal**, an investing buddy, funded with PayPal.

Pal is a small coin with a face and a sprout on top. He's a passionate long-term investor who coaches you like a friend:

- He asks a few plain-language questions (experience, goal, time horizon, and what you'd do if your investment dropped 10% in a month) and saves your risk profile.
- With your permission, he analyzes **12 months of activity** through his tools: average income, average spending, a **three-month emergency fund**, and what is **ready to invest now**.
- He builds a **starter portfolio** (broad index funds, bonds and growth stocks) for your risk level, explains every line, and is honest about risk, including how much it could drop in a bad year.
- Nothing happens until you press **Confirm & fund** on a review screen. You pay with PayPal or a test card in the PayPal Sandbox, the investment is placed, **Auto-invest** schedules a small amount for every payday, and Pal's sprout grows.

Pal's sprout grows with your progress: a seed for new users, two leaves after the first investment, a small plant when Auto-invest is on, and a little tree after three contributions. His face shows how he feels: he waves, listens while you type, thinks while he checks your numbers, gets excited when he finds money that can start working, turns calm and serious when he talks about risk, and gives a thumbs-up when you invest.

Ask Pal to put everything into one stock, invest your emergency fund or gamble on crypto, and he pushes back kindly with a reason and a safer alternative, and respects your decision.

Example: Laura has $3,200. She spends about $920 a month, so Pal keeps $2,760 as her safety net and proposes investing $440: $264 in index funds, $110 in bonds and $66 in growth stocks, plus $50 every payday.

Around Pal there is a complete wallet: add money with PayPal Checkout, withdraw with PayPal Payouts, send and request money, an Invest section with Buy and Sell, and a full activity history. Every visitor gets a private demo account with Laura's story, and the app can be viewed as Desktop or inside a phone frame.

## How we built it

- **Next.js 15, TypeScript and Tailwind CSS**, with container queries so the same app renders as Desktop or Mobile inside a real phone container (not an iframe, so the PayPal popup works).
- **Pal** is an animated SVG React component built with framer-motion: eight moods, four growth stages stored per user, blinking, breathing, eye-tracking on desktop, and full support for reduced motion.
- **PayPal:** the Orders API (create and capture, with `PayPal-Request-Id` for idempotency) for deposits and investment funding, the official **JS SDK Checkout** button (PayPal and card), **Payouts** for withdrawals, **Webhooks** to reconcile captures and refunds, and the **Agent Toolkit** (`create_order`) for the deposit orders Pal prepares.
- **Claude (Anthropic) through OpenRouter**, with tool calling and streaming. Pal's tools read the balance, transactions and portfolio, compute cash flow, save the risk profile, build the portfolio, explain risks, push back on risky requests and prepare the review card.
- **AG Grid** for the portfolio, asset and activity tables, themed with Finpal's design tokens.
- **Prisma** with SQLite locally and PostgreSQL in production; **Auth.js** for passwordless demo sessions; **zod** validation everywhere.
- **Render** for hosting, and **Vitest, Playwright and GitHub Actions** for quality.

## Challenges we ran into

- **Keeping the AI honest with money.** Language models can get numbers wrong. Every figure comes from a tool, and a streaming guardrail removes any dollar amount or percentage in Pal's text that doesn't come from a tool result. The server even ignores amounts the model passes and uses its own calculation.
- **Passionate, but responsible.** Pal's enthusiasm had to be about habits, never hype. Risky requests are detected on the server, always produce a kind pushback card, and block any money action in that turn, whatever the model says.
- **Never moving money by accident.** Pal can only prepare proposals. Execution needs an explicit confirmation, and each PayPal deposit is credited exactly once whether the capture response or the webhook arrives first.
- **A phone view that works on a laptop.** Media queries follow the browser window, so we built the layout on container queries and a real phone container that still supports the PayPal popup.
- **A reliable live demo.** Timeouts, retries, a deterministic fallback that completes the guided flow in Pal's voice, a daily AI budget, and an isolated demo space for every visitor.

## Accomplishments that we're proud of

- Pal: a character with a real personality that grows with the user, and guardrails that keep his enthusiasm responsible.
- A complete guided flow from "Help me start investing" to "You're invested!" in under three minutes, funded through the real PayPal Sandbox.
- The safety-net-first logic: Pal never suggests investing the emergency fund.
- Production-grade foundations for a prototype: integer-cent ledger with atomic transfers, idempotent payments, webhook reconciliation, security headers compatible with the PayPal SDK, accessibility checks, and end-to-end tests in both Desktop and Mobile views.

## What we learned

- The hardest part of AI in finance is not the conversation, it's the guardrails: where numbers come from, who confirms, and what happens when something fails.
- Personality and responsibility work together. A character that celebrates habits makes long-term investing feel approachable without promising anything.
- PayPal's Orders, Payouts, Webhooks and Agent Toolkit fit together well for a wallet: the toolkit lets an agent prepare a real order while the user stays in control of approval.

## What's next for Finpal

- A live price feed for assets (the integration point is ready in the code).
- A scheduled job that executes Auto-invest on each payday, so Pal keeps growing on his own.
- A Bryntum Calendar view for Auto-invest (plans are already stored as iCal recurrence rules).
- Goal tracking and gentle nudges from Pal based on cash-flow changes.

## Built with

`next.js` `react` `typescript` `tailwindcss` `framer-motion` `svg` `prisma` `postgresql` `sqlite` `paypal` `paypal-orders-api` `paypal-payouts` `paypal-webhooks` `paypal-agent-toolkit` `paypal-js-sdk` `claude` `anthropic` `openrouter` `ag-grid` `auth.js` `zod` `vitest` `playwright` `github-actions` `render`
