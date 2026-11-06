# Finpal: demo video script (under 3 minutes)

Laura's story with Pal, recorded with the reserved account. Every label below matches the app.

## Before recording

1. Reset Laura: run `npm run seed` locally, or open the app as Laura and use **Profile → Reset demo data**. Pal starts as a **seed**.
2. Open `/demo/laura?key=<DEMO_RECORDING_KEY>` (signs in as Laura; not linked in the UI).
3. Select **Mobile** in the top bar. Use a fresh browser profile so Pal's welcome card appears. Hide bookmarks and zoom so the phone fills the frame.
4. Have the PayPal **sandbox personal account** email and password ready (Developer Dashboard → Testing Tools → Sandbox Accounts).
5. Optional, for a fully predictable run: start the server with `AI_FORCE_FALLBACK=1`. Pal then uses fixed wording with the same tools and cards.

## Script

| Time | On screen | Say |
|---|---|---|
| 0:00 | **Home**: Laura, $3,200.00 balance. Pal (a seed) waves from the welcome card: "Hey Laura, I'm Pal." | "This is Laura, a freelance designer in Bogota. She has $3,200 in her wallet, and it just sits there. Meet Pal, her investing buddy." |
| 0:12 | Tap **Help me start investing**. Pal thinks: "Crunching your cash flow…" | "Pal loves long-term investing, but he starts by getting to know her." |
| 0:18 | **I'm new to investing** → **5+ years** → **Wait it out** | "Experience, horizon, and the honest question: what would you do if your investment dropped 10% in a month?" |
| 0:35 | **Saved your risk profile**, chip **Moderate · 5+ years** | "Moderate, long term." |
| 0:40 | Tap **Yes, go ahead**. Green checks: **Read your Finpal balance**, **Analyzed 12 months of activity**, **Found a steady income pattern** | "With her permission, Pal looks at 12 months of real activity through his tools." |
| 0:50 | Card **Here's what I found**: Ready to invest now **$440.00**. Pal is excited. | "Safety net first: $2,760, three months of expenses, stays in cash. That leaves $440 ready to work." |
| 1:02 | **Your starter portfolio**: donut, 60% $264.00 / 25% $110.00 / 15% $66.00 | "A simple mix: index funds as the core, bonds to soften drops, a small slice of growth. Every line explained." |
| 1:15 | Risk cards. Pal turns calm and serious. | "And the honest part: in a rough year a mix like this can drop. Pal never promises returns." |
| 1:25 | Tap **Yes, add Auto-invest** → **Review & confirm** | "She adds $50 every payday. Pal can't move money: everything goes to a review screen, and it's her call." |
| 1:35 | **Review & confirm**: $440.00, Moderate · 5+ years, **Pay with PayPal**, Auto-invest | "Amount, portfolio, funding source and schedule, all in one place." |
| 1:42 | Tap **Confirm & fund** → PayPal Sandbox popup → log in → pay | "She funds it with PayPal, in PayPal's own window." |
| 2:00 | **Funding with PayPal…** → **You're invested!** Pal gives a thumbs-up, his sprout grows into a plant: "Auto-invest is on. Watch this thing grow." Dates **Nov 15, Nov 30, Dec 15, Dec 30**. | "She's invested, and Pal grows with her. Slow money, strong money." |
| 2:15 | Ask Pal: "Can I put all my money into one stock?" → pushback card | "And if she asks for something risky, Pal pushes back kindly, offers a safer option, and respects her decision." |
| 2:30 | Tap **See my portfolio** → **Invest** (donut, $440.00 invested). Switch to **Desktop** → **Activity** (AG Grid, PayPal tag) | "Her portfolio, and every movement in one place." |
| 2:45 | Back to Mobile Home, Pal in the corner | "Finpal: a wallet with an investing buddy that helps idle savings start working, safely, funded with PayPal." |

## Notes

- If Pal words a question differently, keep answering with the quick replies; the cards and amounts are always the same.
- Auto-invest dates are calculated from the recording date (the 15th and 30th after today).
- End card text: "Finpal is an independent hackathon concept. Not affiliated with or endorsed by PayPal. Payments run on the PayPal Sandbox."
