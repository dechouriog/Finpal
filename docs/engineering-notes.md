# Finpal: engineering notes

A summary of what was built, the main technical decisions, and the problems solved along the way.

## 1. Overview

Finpal is a Next.js 15 application with three layers:

| Layer | Responsibility |
|---|---|
| **Wallet** | Integer-cent ledger, transfers between users, deposits through PayPal Orders, withdrawals through PayPal Payouts |
| **Invest** | Fixed-price assets, positions, Buy / Sell, recurring Auto-invest plans stored as iCal rules |
| **Pal** | A streaming, tool-calling assistant with an animated character, code-level guardrails and a deterministic fallback |

Everything runs on the server through route handlers and server actions. The user id always comes from the Auth.js session; client input never decides whose data is read or changed.

## 2. Wallet and payments

**Ledger.** All amounts are integers in cents. Every balance change runs inside a Prisma transaction with a conditional debit (`balance >= amount`), so two concurrent payments can never overdraw an account. This is covered by a test that fires two payments at once against the same balance.

**Deposits (PayPal Orders).**
- Every order is stored as a `PaymentOrder` (amount, status, PayPal ids, debug id) together with a pending ledger row.
- `PayPal-Request-Id` is sent on create and capture, so retries never create a second order or a second charge.
- A deposit is credited **exactly once** by `creditOnce`, which atomically moves the order from `CREATED`/`PENDING` to `COMPLETED`. The capture response and the `PAYMENT.CAPTURE.COMPLETED` webhook can arrive in any order, any number of times.
- The UI handles each outcome explicitly: approved, cancelled, declined (the PayPal popup reopens so the buyer can pick another funding source), pending and error. Errors show the PayPal debug ID for support.

**Webhooks.** Signatures are verified with PayPal's verification API and `PAYPAL_WEBHOOK_ID`. Each event id is processed once (`WebhookEvent` table). Completed, denied and refunded captures are reconciled; a refund debits the balance once and is recorded as a `REFUND` movement.

**Withdrawals (PayPal Payouts).** The balance is debited first in a transaction, then the payout is sent. If PayPal rejects it, the balance is refunded and the movement is marked as failed.

## 3. Demo accounts and isolation

The public deployment must let any number of judges try the app without sharing data.

- **Try the demo** creates a *space*: a copy of Laura (main user) with her own Maria and Sam contacts and 12 months of seeded history. Users can only see and pay users of their own space; the server checks it on every transfer and request.
- Sign-in uses Auth.js with a credentials provider and no passwords; the session is a JWT in an httpOnly cookie. Demo creation is rate-limited per IP.
- A reserved Laura account for recording is reachable only through a secret URL compared in constant time.
- Seeded movements are labeled *Demo data*. A cleanup script removes old demo spaces and refuses to run during the judging period.

## 4. Pal, the investing buddy

### Character

Pal is an animated SVG React component: a coin with a face and a sprout. Eight moods (idle, wave, listening, thinking, excited, serious, proud, oops) combine eye direction, eyebrows, mouth shapes, arm gestures and whole-body motion. Idle Pal breathes, blinks at random intervals and, on desktop, follows the cursor with his eyes. All motion follows the app's reduced-motion setting.

The sprout is a **growth stage** stored on the user: `seed` → `sprout` (first investment) → `plant` (Auto-invest active) → `tree` (three contributions). The stage is recomputed on the server after investing or saving a plan, only moves forward, and is shared with every Pal in the UI through a React context. When it grows, Pal plays a short grow animation and shows a one-line celebration.

### Conversation design

Pal's system prompt defines a consistent voice: passionate about long-term habits, warm, concise (1–3 sentences per bubble), no jargon, no emoji, and replies in the user's language. The guided flow asks about experience, horizon and risk tolerance, analyzes 12 months of cash flow with permission, protects a three-month emergency fund, proposes a starter portfolio, explains the risks and ends with a *Review & confirm* card.

The UI mirrors the conversation: Pal's mood follows the state (listening while the user types, thinking during tool calls, excited on found money, serious on risks, oops on errors), long replies are split into short bubbles, and a rotating "thinking" line replaces typing dots.

### Guardrails implemented in code

Prompts guide behavior; these checks enforce it regardless of what the model returns.

| Guardrail | How it works |
|---|---|
| **No invented numbers** | Pal's text is streamed through a `NumberGate`. Dollar amounts and percentages are allowed only if they appear in a tool result, the user's message or Pal's fixed script. Partial numbers split across stream chunks are held until complete. Anything else is replaced before it reaches the screen. |
| **Server-side amounts** | Portfolio and review tools ignore amounts and risk levels passed by the model and use the saved risk profile and the cash-flow calculation. |
| **Risky requests** | A detector (English, Spanish, Portuguese) flags requests such as all-in on one stock, investing the emergency fund, leverage, crypto gambling or quick money. The first model call is forced to the pushback tool, money-action tools are blocked for that turn, and the server shows the pushback card itself if the model skips it. |
| **Never moves money** | Tools only read data or prepare proposals. Execution happens in a server action triggered by the user's *Confirm & fund*. |
| **Chat hygiene** | One set of quick replies per turn; if the model shows quick replies without a question, Pal asks it; emoji are stripped. |

### Reliability

- Model calls time out after 20 seconds and are retried once on rate limits and server errors; each round has a hard cap.
- If the model fails, a deterministic fallback completes the guided flow (and handles risky requests) with the same tools, cards and voice. `AI_FORCE_FALLBACK=1` switches it on deliberately.
- A daily message budget per user (`AI_DAILY_LIMIT`) and a per-minute rate limit protect the AI budget.
- If the client disconnects mid-response, the stream stops writing and the model call is aborted.

## 5. User interface

- **Desktop and Mobile in one app.** Layout is driven by container queries on the app container, not the browser window, so the phone frame works on a laptop. The frame is a real container (not an iframe), which keeps the PayPal popup working.
- **Design system.** Finpal tokens for color, elevation and status tints; one currency formatter (`formatCents`) with a real minus sign; WCAG AA contrast (three tokens were darkened slightly after measuring).
- **Accessibility.** Keyboard navigation for tabs and toggles, focus trap and focus return in dialogs, labeled icon buttons, labeled AG Grid regions.
- **States.** Layout-matching skeletons, empty states with one clear action, error boundaries with recovery, and toasts that stay inside the app container.

## 6. Notable problems and how they were solved

| Problem | Cause | Solution |
|---|---|---|
| Chat input lost focus on every keystroke | A dialog effect depended on an inline callback and re-focused the panel on each render | Focus moves only when the dialog opens; the latest callback is kept in a ref. A component test types a full sentence and fails on the old version. |
| Mobile content wider than the phone | CSS grids without explicit columns grew to their widest content | Explicit single-column grids on mobile (`minmax(0, 1fr)`) |
| Pages opened scrolled down | The main scroll container is shared across routes | Scroll to top on every route change |
| Dev server recompiling on every database write | Tailwind's automatic source detection watched the whole project, including the SQLite file | Limit Tailwind to `app`, `components` and `lib` |
| Invented figures could pass the number check | Numbers in the system prompt (e.g. cents) were trusted | Only Pal's explicit script figures are trusted; percentages must match a known percentage |
| Duplicate or missing questions with quick replies | The model sometimes repeated chips or skipped the question | One chip set per turn and a server-side question when it's missing |
| Postgres in production, SQLite locally | Prisma migrations are provider-specific | A generated PostgreSQL schema with its own migrations, checked in CI and tested with `migrate deploy` against PostgreSQL 16 |
| Build output corrupted in a synced folder | The project lived in a cloud-synced directory | Project moved to a local directory |

## 7. Security

Security headers include a Content-Security-Policy that allows the PayPal SDK (buttons, popup and card fields) and blocks everything else, plus HSTS in production. All endpoints and actions validate input with zod and authorize with the session. Logs contain only error names, messages and PayPal debug ids. Details and the dependency audit are in [SECURITY.md](../SECURITY.md).

## 8. Quality

| Layer | Coverage |
|---|---|
| Unit | Money helpers, allocation, risk scoring, Auto-invest dates, Pal moods and stages, number guardrail |
| Integration | Every API route against an isolated SQLite database with PayPal mocked: auth, validation, single credit, declines with debug id, webhook dedup, daily AI limit, health |
| Guardrails | Pal with a scripted model: invented numbers removed, risky requests produce a pushback card and never an action, quick-reply hygiene |
| End to end | Playwright in Desktop and Mobile: Try the demo → guided flow → Review & confirm → You're invested → Invest and Activity; Add money |

CI runs lint, typecheck, the PostgreSQL schema check, unit and integration tests, a production build and the E2E suite on every push. A production-like deploy (clean install, `migrate deploy` on PostgreSQL, idempotent seed, start) was verified in a Linux container.
