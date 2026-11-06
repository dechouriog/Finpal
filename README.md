# Finpal

An AI investing guide that turns idle wallet savings into a first, well-understood investment, funded with **PayPal**.

**Built for the PayPal AI Hackathon 2026**

![Next.js](https://img.shields.io/badge/Next.js-15-000000)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)
![PayPal](https://img.shields.io/badge/PayPal-Sandbox-0B3D91)
![AI](https://img.shields.io/badge/AI-Claude-D97757)
![AG Grid](https://img.shields.io/badge/AG%20Grid-Community-0E5DA8)
![Deploy](https://img.shields.io/badge/deploy-Render-46E3B7)
![License](https://img.shields.io/badge/license-MIT-blue)

Finpal is a web app that you can use in two views:

- **Desktop**: the full app in the browser, with a sidebar and wide tables.
- **Mobile**: the same app inside a phone frame, with bottom tabs and bottom sheets, so you can try the mobile experience from a laptop.

Payments run for real against the **PayPal Sandbox**, with test accounts and test money. Asset prices are illustrative.

> Finpal is an independent hackathon concept. It is not affiliated with or endorsed by PayPal. Finpal AI provides education, not financial advice.

## The problem

Many people keep their savings in a digital wallet balance. Freelancers who get paid in dollars are a big part of that group. The money is safe, but it does not grow, and inflation slowly reduces what it can buy.

Most of them would like to invest, but they never start. Brokers feel intimidating, they don't know how much they can safely invest, and nobody explains the risks in plain language before they put money in.

## How it works

Finpal AI guides the user through one short conversation:

1. **Gets to know the user.** It asks about investing experience, what the money is for, the time horizon, and how they would react to a drop in value.
2. **Learns from real activity.** With the user's permission, it reads the balance and the cash flow of the last 12 months through its tools.
3. **Protects the safety net.** It sets aside an emergency fund of three months of expenses and only then calculates how much can be invested.
4. **Builds a starter portfolio** that matches the risk profile and explains each line.
5. **Explains the risks** in plain language: what could go wrong, how much it could drop in a bad year, and why time matters.
6. **Waits for confirmation.** The proposal appears as a *Review & confirm* card. When the user confirms, the investment is funded with PayPal (or with the Finpal balance, if the user prefers) and Auto-invest is scheduled for every payday.

Example with the demo user: Laura has **$3,200**. Her expenses are about $920 a month, so Finpal keeps **$2,760** as an emergency fund and proposes investing **$440**: 60% broad index funds, 25% bonds and 15% growth stocks, plus $50 every payday.

## Design decisions

- **The agent proposes, the user decides.** Claude has tools to read data and prepare actions, but no tool can move money on its own. Every movement goes through a confirmation screen in the UI.
- **Safety net first.** The amount to invest is always calculated after reserving three months of expenses. The agent never suggests investing the emergency fund.
- **Real payments, simulated market.** Funding uses the PayPal Orders API in the Sandbox (create, approve in the official popup, capture). Asset prices are fixed, because the focus of this proof of concept is the guided experience, not trading.
- **Money as integers.** All amounts are stored in cents (`Int`), never as floats, and every balance change happens inside a database transaction.
- **Mobile view through container queries.** Layouts react to the width of the app container, not the browser window, so mobile mode works on a desktop monitor. The phone frame is a real container, not an iframe, so the PayPal popup works inside it.
- **Original brand.** Finpal has its own name, logo, colors and typography. The only PayPal elements are the official ones provided by its SDKs.
- **Numbers come from tools, not from the model.** Every figure in the chat (income, expenses, emergency fund, amounts) is calculated by a tool over real data and shown in a card. If the AI API is slow or fails, the chat times out with a clear message and the user can retry.

## Features

| Finpal AI | Invest and activity |
|---|---|
| Guided onboarding conversation with streaming responses | Portfolio summary: total value, cash and invested amounts |
| Reads balance and 12-month cash flow through tools | Positions and assets in AG Grid, with sorting and filters |
| Calculates the emergency fund and the investable amount | Allocation donut by category |
| Builds a portfolio for the risk profile | Auto-invest calendar with editable recurring plans |
| Plain-language risk cards | Full transaction history in AG Grid |
| Review & confirm card before any money moves | Add money with the PayPal Checkout button |
| Visible tool steps with green checks | Withdraw to a PayPal account with Payouts |
| Quick replies and shortcut chips | Send and request money between users |

Errors the app handles: payment cancelled in the PayPal popup, popup closed, order not captured, insufficient balance, invalid amount, and AI timeout.

## Hackathon tools

| Tool | How Finpal uses it |
|---|---|
| PayPal | Orders API (create and capture) to fund the wallet and investments, Payouts API for withdrawals, and the Agent Toolkit to create the deposit orders the AI agent prepares |
| AG Grid | Portfolio, asset and activity tables |
| Bryntum | Planned: Bryntum Calendar for the Auto-invest view. Plans are already stored as iCal recurrence rules (`FREQ=MONTHLY;BYMONTHDAY=15,30`), the format Bryntum uses |
| Render | Hosting for the app and its PostgreSQL database |

**AI:** Claude (Anthropic) powers Finpal AI at runtime with tool calling and streaming.

## Stack

| Layer | Technologies |
|---|---|
| App | Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, framer-motion |
| Data | Prisma, SQLite (local), PostgreSQL (production) |
| Payments | `@paypal/react-paypal-js`, `@paypal/paypal-server-sdk`, `@paypal/agent-toolkit` |
| AI | Claude (Anthropic) through OpenRouter, using the OpenAI-compatible SDK with tool calling and streaming |
| Tables and calendar | AG Grid Community (Bryntum Calendar planned) |
| Validation | zod |
| Hosting | Render |

## Structure

```
.
├── app/                 Pages (Home, Payments, Invest, Activity, Profile) and server actions
│   └── api/             AI endpoint (streaming) and PayPal order create / capture
├── components/          Brand, device frame, AI panel, AG Grid tables, Auto-invest calendar
├── lib/
│   ├── assistant/       System prompt, agent loop, tools and chat cards
│   ├── paypal.ts        PayPal Server SDK, Payouts and Agent Toolkit client
│   ├── wallet.ts        Deposits and withdrawals (atomic, idempotent)
│   ├── cashflow.ts      12-month income, expenses and emergency fund
│   └── money.ts         Helpers for amounts in cents
├── prisma/              Schema, migrations and seed with the demo data
├── scripts/             Render build helpers and an assistant smoke test
└── render.yaml          Render deployment
```

## How to run it

**Requirements:** Node.js 20 or newer, a [PayPal Developer](https://developer.paypal.com/) account with a Sandbox app, and an [OpenRouter](https://openrouter.ai/keys) API key (Finpal AI uses Claude through OpenRouter).

**1. PayPal Sandbox credentials**

1. In the PayPal Developer Dashboard, go to *Apps & Credentials* and create a Sandbox app.
2. Copy the **Client ID** and the **Secret**.
3. In *Sandbox accounts*, make sure you have a personal test account with balance. You will use it to approve payments.

**2. Install and configure**

```bash
git clone https://github.com/dechouriog/Finpal.git
cd Finpal
npm install
cp .env.example .env     # fill in the PayPal and OpenRouter keys; PAYPAL_ENV=sandbox, DATABASE_URL="file:./dev.db"
```

**3. Database and demo data**

```bash
npx prisma migrate dev
npm run seed             # creates Laura's account, 12 months of history and sample assets
```

**4. Start**

```bash
npm run dev              # http://localhost:3000
```

Use the **Desktop | Mobile** toggle at the top, or open `http://localhost:3000/?device=mobile`.

## Testing the main flow

1. Open the app. Laura's demo account is already loaded.
2. Switch to **Mobile** for the intended experience.
3. Tap **Ask Finpal AI**, choose **Help me start investing** and answer the questions.
4. Tap **Review & confirm**, keep **Pay with PayPal** selected, tap **Confirm & fund** and log in to the PayPal Sandbox popup with the test account:
   - Email: `sb-xxxxx@personal.example.com`
   - Password: `********`
5. Check the result in **Invest** and **Activity**.

Use **Profile → Reset demo data** to run the flow again from the start.

You can also test **Add money** and **Withdraw** from Home, and **Send / Request** between Laura, Maria and Sam (switch users in **Profile**). `npm run test:assistant` runs the whole guided conversation from the terminal.

## Status and limitations

This is a prototype built for the hackathon:

- Payments use the PayPal Sandbox, not real money.
- Asset prices are fixed and illustrative. There is no real brokerage or real securities.
- The 12-month history of the demo user is seeded in the database, because the Sandbox does not easily expose the history of a personal account.
- Auto-invest runs are scheduled and shown in the calendar, but no background job executes them yet.
- Finpal AI gives educational information. It is not financial advice.

## Roadmap

- Bryntum Calendar view for Auto-invest (the data model is ready).
- Live price feed for assets (the integration point is marked in the code).
- Scheduled job that executes Auto-invest runs on each payday.

## License

[MIT](LICENSE)
