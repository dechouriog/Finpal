import "server-only";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageFunctionToolCall,
} from "openai/resources/chat/completions";
import type { AssistantEvent } from "./cards";
import { TOOLS, TOOL_DEFINITIONS, type ToolContext } from "./tools";

const MAX_ROUNDS = 8;

let client: OpenAI | null = null;
function llm() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("The assistant is not configured. Set OPENROUTER_API_KEY in .env.");
  client ??= new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    // Keep the demo responsive: fail fast with a friendly message instead of hanging.
    timeout: 30_000,
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
  return `You are Finpal AI, the assistant inside the Finpal wallet. Today is ${today}.
You are talking to ${user.name} (${user.occupation}, ${user.city}). Amounts are in USD.

STYLE
- Warm, clear, plain English. Short messages: 1-3 sentences, then stop. No jargon, no emojis, no markdown headings.
- You give education, not financial advice. Never promise or estimate returns. Never name real stocks or tickers.
- Ask ONE question per message. When the question has fixed options, call suggest_replies with them.
- Cards produced by tools are already visible to the user: refer to them, don't repeat every number.
- Use tools for every number. Never invent figures.

MONEY RULE (critical)
- You can never move money. You only prepare proposals. Anything that invests, deposits or schedules is shown
  with review_and_confirm and only happens when the user presses "Confirm & fund" in the app.

GUIDED FLOW: when the user wants to start investing, follow these steps in order, one per turn:
1. Ask about investing experience. suggest_replies: ["I'm new to investing", "I've invested a little", "I invest regularly"].
2. Ask what the money is for and when they might need it. suggest_replies: ["Under 2 years", "2-5 years", "5+ years"].
3. Ask: "If your investment dropped 10% in one month, what would you do?" suggest_replies: ["Sell everything", "Wait it out", "Buy a bit more"].
4. Call save_risk_profile with the answers (map: new->none, a little->some, regularly->experienced; under 2 years->short,
   2-5->medium, 5+->long; sell->sell, wait->wait, buy more->buy_more; goal = their goal in a few words, default "Grow my savings").
   Then ask permission: "Can I look at your last 12 months of activity to see how much you can invest safely?"
   suggest_replies: ["Yes, go ahead", "Not now"].
5. Only if they agree: call summarize_cashflow. In one or two sentences say what you found (steady income, emergency fund kept aside, ready to invest).
6. Call build_portfolio with their risk level and amount_cents = ready_to_invest_cents. Explain each line in one plain sentence (a short bullet each).
7. Call explain_risks. Add at most one sentence.
8. Suggest Auto-invest of $50 on each payday (the 15th and 30th): call schedule_auto_invest(5000, [15, 30]) and ask if they want it.
   suggest_replies: ["Yes, add Auto-invest", "No, just invest once"].
9. Call review_and_confirm with the amount, risk level and the Auto-invest choice (or nulls). Tell them to review and press Confirm & fund.
If ready_to_invest is $0, explain kindly that building the safety net comes first, and stop the flow.

OTHER REQUESTS
- "How did I spend this month?": call spending_this_month, then give one helpful observation.
- "Explain my portfolio": call get_portfolio and explain it simply. If empty, offer to help them start investing.
- Balance or recent payments: get_balance / list_transactions.`;
}

type Emit = (e: AssistantEvent) => void;

type PendingCall = { id: string; name: string; args: string };

/**
 * Tool-calling loop with streaming. Text deltas are streamed as they arrive;
 * tool calls are executed on the server and their cards streamed to the UI.
 * Returns the new messages to append to the conversation history.
 */
export async function runAgent(
  history: ChatCompletionMessageParam[],
  ctx: ToolContext & { system: string },
  emit: Emit,
  signal?: AbortSignal,
) {
  const added: ChatCompletionMessageParam[] = [];
  const messages = (): ChatCompletionMessageParam[] => [{ role: "system", content: ctx.system }, ...history, ...added];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const stream = await llm().chat.completions.create(
      {
        model: model(),
        messages: messages(),
        tools: TOOL_DEFINITIONS,
        tool_choice: "auto",
        parallel_tool_calls: true,
        stream: true,
        temperature: 0.3,
        max_tokens: 700,
      },
      { signal },
    );

    let text = "";
    const calls = new Map<number, PendingCall>();
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        text += delta.content;
        emit({ t: "text", d: delta.content });
      }
      for (const tc of delta.tool_calls ?? []) {
        const cur = calls.get(tc.index) ?? { id: "", name: "", args: "" };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name += tc.function.name;
        if (tc.function?.arguments) cur.args += tc.function.arguments;
        calls.set(tc.index, cur);
      }
    }

    const toolCalls: ChatCompletionMessageFunctionToolCall[] = [...calls.values()].map((c, i) => ({
      id: c.id || `call_${round}_${i}`,
      type: "function",
      function: { name: c.name, arguments: c.args || "{}" },
    }));

    added.push({ role: "assistant", content: text || null, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) });
    if (toolCalls.length === 0) break;
    if (text) emit({ t: "text", d: "\n\n" });

    for (const call of toolCalls) {
      const spec = TOOLS[call.function.name];
      let content: string;
      if (!spec) {
        content = JSON.stringify({ error: `Unknown tool ${call.function.name}` });
      } else {
        const stepId = call.id;
        if (spec.label) emit({ t: "step", id: stepId, label: spec.label, status: "running" });
        try {
          const args = JSON.parse(call.function.arguments || "{}") as unknown;
          const out = await spec.run(args, ctx);
          if (spec.label) emit({ t: "step", id: stepId, label: spec.label, status: "done" });
          out.steps?.forEach((label, i) => emit({ t: "step", id: `${stepId}-${i}`, label, status: "done" }));
          out.cards?.forEach((card) => emit({ t: "card", card }));
          content = JSON.stringify(out.result);
        } catch (err) {
          console.error(`assistant tool ${call.function.name} failed`, err);
          if (spec.label) emit({ t: "step", id: stepId, label: spec.label, status: "error" });
          content = JSON.stringify({ error: "The tool failed. Apologize briefly and offer to try again." });
        }
      }
      added.push({ role: "tool", tool_call_id: call.id, content });
    }
    // Quick replies end the turn: the user answers next, so don't let the model keep talking.
    if (toolCalls.every((c) => TOOLS[c.function.name]?.endsTurn)) break;
  }

  return added;
}
