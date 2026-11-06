# finpal

**Finpal = Finance + Pal.** A digital wallet with AI-guided investing, built as a proof of concept for the
PayPal AI Hackathon on Devpost. Payments run on the **PayPal Sandbox**.

> Millions of people keep idle savings sitting in their wallet balance. Finpal shows how an AI assistant
> inside a wallet could help them understand their cash flow, keep a safety net, and start investing with
> confidence: education, not financial advice.

> **Work in progress.** This README will be expanded as the build progresses.

## Status

| Area | Status |
| --- | --- |
| Brand, Desktop / Mobile device viewer, navigation | Done |
| Database, demo data, Home and Profile | Done |
| Send / Request between demo users | Done |
| Add money (PayPal Orders) and Withdraw (PayPal Payouts) | In progress |
| Activity (AG Grid) | Planned |
| Invest (AG Grid, allocation donut, Auto-invest with Bryntum Calendar) | Planned |
| Finpal AI assistant (Claude with tool calling) | Planned |

## Run it locally

Requirements: Node.js 20+.

```bash
cp .env.example .env        # then fill in your keys
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Open http://localhost:3000 and use the **Desktop | Mobile** toggle at the top to switch layouts.
**Profile → Reset demo data** restores every demo account at any time.

## Demo data

- **Laura** (29, freelance designer, Bogota): $3,200.00 balance and 12 months of history. She earns about $1,850
  a month and spends about $920 a month.
- **Maria** and **Sam**: extra accounts for sending and requesting money. Switch users in **Profile**.

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · framer-motion · Prisma (SQLite locally,
PostgreSQL in production) · zod. Coming next: PayPal Server SDK and JS SDK, PayPal Agent Toolkit,
Anthropic Claude, AG Grid, Bryntum Calendar, Render.

## Disclaimer

Finpal is an independent hackathon concept. Not affiliated with or endorsed by PayPal. Payments run on the
PayPal Sandbox.

## License

[MIT](LICENSE)
