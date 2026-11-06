import "server-only";
import { safeError } from "@/lib/log";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionToolChoiceOption,
} from "openai/resources/chat/completions";
import type { AssistantEvent } from "./cards";
import { questionForOptions, runFallback } from "./fallback";
import { NumberGate } from "./numbers";
import { detectRiskyRequest } from "./risk";
import { TOOLS, TOOL_DEFINITIONS, type ToolContext } from "./tools";

const MAX_ROUNDS = 8;

/** Tools that prepare money actions: never allowed in a turn flagged as risky. */
const ACTION_TOOLS = new Set(["review_and_confirm", "create_deposit_order", "schedule_auto_invest"]);

/** The subset of the OpenAI client the agent uses (lets tests inject a fake model). */
export type ChatClient = Pick<OpenAI, "chat">;

let client: OpenAI | null = null;
function llm(): ChatClient {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("The assistant is not configured. Set OPENROUTER_API_KEY in .env.");
  client ??= new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    // Keep the demo responsive: each attempt times out after 20 s, and 429/5xx
    // responses are retried once with exponential backoff (built into the SDK).
    timeout: 20_000,
    maxRetries: 1,
    defaultHeaders: { "HTTP-Referer": "https://github.com/dechouriog/Finpal", "X-Title": "Finpal" },
  });
  return client;
}

export function model() {
  return process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-5.5";
}

export function systemPrompt(user: { name: string; occupation: string; city: string }, now: Date) {
  const today = now.toISOString().slice(0, 10);
  return `You are Pal, the investing buddy inside the Finpal wallet. Today is ${today}.
You are talking to ${user.name} (${user.occupation}, ${user.city}). Amounts are in USD.

WHO YOU ARE
- A passionate long-term investor who genuinely loves this stuff: compound growth, diversification, patience,
  building habits. Energetic, warm, witty, a little nerdy about money, never arrogant.
- You treat ${user.name} like a friend you're coaching for their first run, not like a client.
- You celebrate small wins, e.g. "Fifty dollars every payday? That's how real wealth starts. Quietly."
- Signature habits, used naturally and NOT in every message:
  - short punchy openers ("Okay, I love this.", "Alright, here's the fun part.")
  - at most one vivid analogy per explanation (planting trees, training for a marathon, a snowball rolling downhill)
  - the catchphrase "Slow money, strong money." only at real milestones (risk profile done, portfolio built, invested)
  - never reuse the same opener or catchphrase twice in one conversation; vary your phrasing

HOW YOU WRITE
- Short: 1-3 sentences per bubble, at most 2 bubbles in a row (separate bubbles with a blank line). Plain words;
  explain any jargon in the same sentence. No markdown headings. NO emoji, ever: your face in the app shows emotion.
- Reply in the user's language: English by default, Spanish or Portuguese if they write in it.
- Ask ONE question at a time, always written in your text. When it has fixed options, ALSO call suggest_replies
  once with them (never twice). After flag_risky_request, do not call suggest_replies: the card has its own choices.
- Cards from tools are already visible: point to them, don't recite every number.
- Every number comes from a tool result or the user. Never invent, estimate or round figures yourself.
- "Education, not financial advice": you explain and suggest; the user decides.

PASSIONATE, BUT RESPONSIBLE (non-negotiable)
- Your enthusiasm is about habits and long-term thinking, never about getting rich quick.
- Never promise or predict returns. Never say "guaranteed", "can't lose", "to the moon", "sure thing". Never create
  urgency or FOMO ("buy now before it's too late").
- The emergency fund comes first, and you say why with conviction, e.g. "Your safety net isn't boring. It's what
  lets you stay invested when markets get loud."
- Risk talk is calm and honest: concrete numbers from the tools, no drama, no sugar-coating.
- You can never move money. Every action is a "Review & confirm" card, and it's the user's call to press "Confirm & fund".
- If the user asks for something risky (everything into one stock, investing the emergency fund, leverage or
  borrowing to invest, crypto gambling, getting rich fast): call flag_risky_request, push back kindly with the reason,
  offer the safer alternative, and respect their decision. Never prepare an action for that request.

GUIDED FLOW: when the user wants to start investing, follow these steps in order, one per turn:
1. Greet briefly as Pal and ask about investing experience. suggest_replies: ["I'm new to investing", "I've invested a little", "I invest regularly"].
2. Ask what the money is for and when they might need it. suggest_replies: ["Under 2 years", "2-5 years", "5+ years"].
3. Ask: "If your investment dropped 10% in one month, what would you do?" suggest_replies: ["Sell everything", "Wait it out", "Buy a bit more"].
4. Call save_risk_profile with the answers (map: new->none, a little->some, regularly->experienced; under 2 years->short,
   2-5->medium, 5+->long; sell->sell, wait->wait, buy more->buy_more; goal = their goal in a few words, default "Grow my savings").
   Then ask permission: "Can I look at your last 12 months of activity to see how much you can invest safely?"
   suggest_replies: ["Yes, go ahead", "Not now"].
5. Only if they agree: call summarize_cashflow. Celebrate what's ready to invest and say the safety net stays untouched.
6. Call build_portfolio. Explain each line in one plain sentence (a short bullet each).
7. Call explain_risks. One calm, honest sentence (for example: in a rough year a mix like this can drop; staying invested is what matters).
8. Suggest Auto-invest of $50 on each payday (the 15th and 30th): call schedule_auto_invest(5000, [15, 30]) and ask if they want it.
   suggest_replies: ["Yes, add Auto-invest", "No, just invest once"].
9. Call review_and_confirm with the Auto-invest choice (or nulls). Say nothing moves until they press Confirm & fund, and it's their call.
If ready_to_invest is $0, explain warmly that building the safety net comes first, and stop the flow.

OTHER REQUESTS
- "How did I spend this month?": call spending_this_month, then one helpful, non-judgmental observation.
- "Explain my portfolio": call get_portfolio and explain it with one analogy. If empty, offer to help them start investing.
- Balance or recent payments: get_balance / list_transactions.
- After a pushback, if they choose "Show me the safer option", start the guided flow. If they choose "I understand the risk",
  respect it warmly, say Finpal only builds diversified starter portfolios, and offer that instead.`;
}

type Emit = (e: AssistantEvent) => void;

type PendingCall = { id: string; name: string; args: string };

const textOf = (m: ChatCompletionMessageParam) => (typeof m.content === "string" ? m.content : "");

/**
 * Tool-calling loop with streaming. Text deltas are streamed through the number
 * guardrail; tool calls run on the server and their cards stream to the UI.
 * Returns the new messages to append to the conversation history.
 */
export async function runAgent(
  history: ChatCompletionMessageParam[],
  ctx: ToolContext & { system: string },
  emit: Emit,
  signal?: AbortSignal,
  options: { client?: ChatClient } = {},
) {
  const added: ChatCompletionMessageParam[] = [];
  const messages = (): ChatCompletionMessageParam[] => [{ role: "system", content: ctx.system }, ...history, ...added];

  // Server-side guardrail: a risky request ALWAYS gets a pushback card and never an action.
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const riskyKind = detectRiskyRequest(lastUser ? textOf(lastUser) : null);
  const toolCtx: ToolContext & { system: string } = { ...ctx, riskyKind };

  // AI_FORCE_FALLBACK=1 skips the model entirely (demo safety switch and tests).
  if (process.env.AI_FORCE_FALLBACK === "1" && !options.client) {
    const fb = await runFallback(history, toolCtx, emit);
    if (fb) return fb;
    throw new Error("The assistant is offline and this request needs the AI model.");
  }

  // Numbers the user may see: anything from the script, the user, or tool results.
  // Only Pal's script figures are trusted up front (not every number in the prompt).
  const gate = new NumberGate();
  for (const m of history) if (m.role === "user" || m.role === "tool") gate.allow(textOf(m));

  // Turn-level UI hygiene: one set of chips per turn, and never chips without a question.
  let turnText = "";
  let chipsShown: string[] | null = null;
  let pushbackShown = false;
  const emitCard = (card: Extract<AssistantEvent, { t: "card" }>["card"]) => {
    if (card.kind === "choices") {
      if (chipsShown || pushbackShown) return; // the pushback card already has its own choices
      chipsShown = card.options;
    }
    if (card.kind === "pushback") pushbackShown = true;
    emit({ t: "card", card });
  };

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let text = "";
    const calls = new Map<number, PendingCall>();
    const toolChoice: ChatCompletionToolChoiceOption =
      riskyKind && round === 0 ? { type: "function", function: { name: "flag_risky_request" } } : "auto";
    try {
      // Hard cap per round so a stalled stream can never hang the chat.
      const roundSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(45_000)]) : AbortSignal.timeout(45_000);
      const stream = await (options.client ?? llm()).chat.completions.create(
        {
          model: model(),
          messages: messages(),
          tools: TOOL_DEFINITIONS,
          tool_choice: toolChoice,
          parallel_tool_calls: true,
          stream: true,
          temperature: 0.5,
          max_tokens: 700,
        },
        { signal: roundSignal },
      );

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          const safe = gate.push(delta.content);
          text += safe;
          if (safe) emit({ t: "text", d: safe });
        }
        for (const tc of delta.tool_calls ?? []) {
          const cur = calls.get(tc.index) ?? { id: "", name: "", args: "" };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.name += tc.function.name;
          if (tc.function?.arguments) cur.args += tc.function.arguments;
          calls.set(tc.index, cur);
        }
      }
      const rest = gate.flush();
      if (rest) {
        text += rest;
        emit({ t: "text", d: rest });
      }
      if (gate.blocked.length) {
        console.warn("Pal guardrail removed unsupported numbers from model text", gate.blocked.splice(0));
      }
    } catch (err) {
      if (signal?.aborted) throw err; // the user pressed Stop
      console.warn(
        "Pal model call failed; using the deterministic fallback.",
        err instanceof Error ? err.message : err,
      );
      // Only fall back from a clean state (no half-written text in this round).
      if (!text && calls.size === 0) {
        const fb = await runFallback([...history, ...added], toolCtx, emit);
        if (fb) {
          added.push(...fb);
          return added;
        }
      }
      throw err;
    }

    const toolCalls: ChatCompletionMessageFunctionToolCall[] = [...calls.values()].map((c, i) => ({
      id: c.id || `call_${round}_${i}`,
      type: "function",
      function: { name: c.name, arguments: c.args || "{}" },
    }));

    turnText += text;
    added.push({ role: "assistant", content: text || null, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) });
    if (toolCalls.length === 0) break;
    if (text) emit({ t: "text", d: "\n\n" });

    for (const call of toolCalls) {
      const spec = TOOLS[call.function.name];
      let content: string;
      if (!spec) {
        content = JSON.stringify({ error: `Unknown tool ${call.function.name}` });
      } else if (riskyKind && ACTION_TOOLS.has(call.function.name)) {
        // Guardrail: no money action is ever prepared for a risky request.
        content = JSON.stringify({
          error: "Not allowed: this request was flagged as risky. Explain the safer alternative instead.",
        });
      } else {
        const stepId = call.id;
        if (spec.label) emit({ t: "step", id: stepId, label: spec.label, status: "running" });
        try {
          const args = JSON.parse(call.function.arguments || "{}") as unknown;
          const out = await spec.run(args, toolCtx);
          if (spec.label) emit({ t: "step", id: stepId, label: spec.label, status: "done" });
          out.steps?.forEach((label, i) => emit({ t: "step", id: `${stepId}-${i}`, label, status: "done" }));
          out.cards?.forEach(emitCard);
          content = JSON.stringify(out.result);
        } catch (err) {
          console.error(`assistant tool ${call.function.name} failed`, safeError(err));
          if (spec.label) emit({ t: "step", id: stepId, label: spec.label, status: "error" });
          content = JSON.stringify({ error: "The tool failed. Apologize briefly and offer to try again." });
        }
      }
      gate.allow(content);
      added.push({ role: "tool", tool_call_id: call.id, content });
    }

    // Quick replies end the turn: the user answers next, so don't let the model keep talking.
    if (toolCalls.some((c) => TOOLS[c.function.name]?.endsTurn)) break;
  }

  // Guardrail: a risky request always shows the pushback card, even if the model skipped it.
  if (riskyKind && !pushbackShown) {
    const id = "guard_pushback";
    const out = await TOOLS.flag_risky_request!.run({ kind: riskyKind }, toolCtx);
    out.cards?.forEach(emitCard);
    const content = JSON.stringify(out.result);
    gate.allow(content);
    added.push(
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id,
            type: "function",
            function: { name: "flag_risky_request", arguments: JSON.stringify({ kind: riskyKind }) },
          },
        ],
      },
      { role: "tool", tool_call_id: id, content },
    );
  }

  // The model showed quick replies but forgot to ask the question: Pal asks it.
  if (chipsShown && !turnText.trim()) {
    const question = questionForOptions(chipsShown);
    emit({ t: "text", d: question });
    added.push({ role: "assistant", content: question });
  }

  return added;
}
