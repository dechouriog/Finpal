# Security

Finpal is a hackathon prototype that runs on the PayPal **Sandbox** (test money only). This page lists the
protections in place and the known residual risks.

## Protections

- **Sessions:** Auth.js (v5) JWT sessions in a secure, httpOnly cookie. "Try the demo" creates an isolated demo
  account; there are no passwords. The reserved recording account is only reachable with a secret key
  (`DEMO_RECORDING_KEY`, compared in constant time).
- **Authorization:** every page, server action, API route and AI tool takes the user id from the session, never
  from client input. Demo users can only see and pay users of their own space.
- **Money safety:** amounts are integer cents. Every balance change runs in a database transaction with a
  conditional debit (no overdrafts). PayPal deposits are credited exactly once (stored orders, `PayPal-Request-Id`
  on create, capture and payouts, idempotent webhook processing). Failed payouts are refunded automatically.
- **Pal never moves money:** his tools only read data or prepare proposals; execution needs an explicit
  "Confirm & fund" in the UI.
- **Pal guardrails, enforced in code:** a streaming check replaces any dollar amount or percentage in Pal's text
  that doesn't come from a tool result, the user or Pal's fixed script; portfolio tools ignore model-supplied
  amounts; risky requests (all-in on one stock, the emergency fund, leverage, crypto, quick money) always get a
  pushback card and block money actions for that turn; emoji are stripped. Covered by tests with a scripted model.
- **Validation:** zod on every API route and server action; request bodies are size-bounded.
- **Rate limits:** demo creation (5 per IP per hour), transfers, trades, deposits, payouts and AI (per minute),
  plus a daily AI budget per user (`AI_DAILY_LIMIT`). Limits are in memory (single instance).
- **Webhooks:** PayPal signatures are verified with `PAYPAL_WEBHOOK_ID`; each event id is processed once.
- **Headers:** Content-Security-Policy compatible with the PayPal JS SDK (buttons, popup, card fields),
  `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict referrer policy,
  restrictive Permissions-Policy, HSTS in production.
- **Logging:** errors are logged as name, message, status and PayPal debug id only; never raw API responses,
  headers or secrets. `/api/health` reports configuration as booleans.
- **Secrets:** `.env` is git-ignored and has never been committed.

## Dependency audit (`npm audit --omit=dev`)

`npm audit fix` without breaking changes resolves nothing; the remaining advisories (no critical) are:

| Packages | Why they are present | Exposure | Plan |
| --- | --- | --- | --- |
| `zod@3`, `@langchain/core`, `langsmith`, `ai`, `@ai-sdk/*`, `mathjs`, `jsondiffpatch`, `openai@4`, `uuid` | Transitive dependencies of `@paypal/agent-toolkit`, which bundles adapters for LangChain, the Vercel AI SDK and MCP | Server-only. Finpal uses only the toolkit's OpenAI adapter to create a deposit order with a server-built numeric amount; no user input reaches these libraries | Upgrade when the toolkit updates its dependencies. Forcing newer versions with `overrides` was tested and introduced new advisories, so it was not kept |
| `next` (via `postcss`) | Build-time CSS processing | Not reachable at runtime | Next.js 16 upgrade after the hackathon |
| `prisma` (via `@prisma/config`, `deepmerge-ts`) | CLI / config loading at build time | Not reachable at runtime | Prisma 7 upgrade after the hackathon |

## Reporting

This is a demo project. If you find an issue, please open a GitHub issue without sensitive details.
