import "server-only";
import type {
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import type { AssistantCard, AssistantEvent, CashflowCard, PortfolioCard, SpendingCard } from "./cards";
import { TOOLS, type ToolContext } from "./tools";

/**
 * Deterministic fallback for Finpal AI. If the model is slow or down, the guided
 * "Help me start investing" flow still completes. All numbers come from tool
 * results (cards), never from model text. The fallback writes the same
 * tool-call messages the model would, so the model can take over again later.
 */

export const CHOICES = {
  experience: ["I'm new to investing", "I've invested a little", "I invest regularly"],
  horizon: ["Under 2 years", "2-5 years", "5+ years"],
  tolerance: ["Sell everything", "Wait it out", "Buy a bit more"],
  permission: ["Yes, go ahead", "Not now"],
  autoInvest: ["Yes, add Auto-invest", "No, just invest once"],
  start: ["Help me start investing"],
} as const;
type ChoiceSet = keyof typeof CHOICES;

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function textOf(m: ChatCompletionMessageParam): string {
  return typeof m.content === "string" ? m.content : "";
}

/** Which question set a suggest_replies call showed (matched by its first option). */
function setOf(options: string[]): ChoiceSet | null {
  for (const [name, opts] of Object.entries(CHOICES) as [ChoiceSet, readonly string[]][]) {
    if (options[0] && opts[0]?.toLowerCase() === options[0].toLowerCase()) return name;
  }
  // Model-written options: recognize by content.
  const joined = options.join(" ").toLowerCase();
  if (/new to investing|invested a little/.test(joined)) return "experience";
  if (/years/.test(joined)) return "horizon";
  if (/sell|wait|buy/.test(joined)) return "tolerance";
  if (/go ahead|not now/.test(joined)) return "permission";
  if (/auto-invest|invest once/.test(joined)) return "autoInvest";
  return null;
}

/** Read the conversation: answers given to each question set, and the question awaiting an answer. */
function readState(messages: ChatCompletionMessageParam[]) {
  const answers: Partial<Record<ChoiceSet, string>> = {};
  let pending: ChoiceSet | null = null;
  for (const m of messages) {
    if (m.role === "assistant" && "tool_calls" in m && m.tool_calls) {
      for (const tc of m.tool_calls) {
        if (tc.type === "function" && tc.function.name === "suggest_replies") {
          try {
            pending = setOf((JSON.parse(tc.function.arguments) as { options: string[] }).options ?? []);
          } catch {
            /* ignore malformed */
          }
        }
      }
    } else if (m.role === "user") {
      if (pending) answers[pending] = textOf(m);
      pending = null;
    }
  }
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  // The set the LAST user message answered (if any).
  let answered: ChoiceSet | null = null;
  const lastIdx = lastUser ? messages.lastIndexOf(lastUser) : -1;
  for (let i = lastIdx - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.role === "user") break;
    if (m.role === "assistant" && "tool_calls" in m && m.tool_calls) {
      const sr = m.tool_calls.find((t) => t.type === "function" && t.function.name === "suggest_replies");
      if (sr && sr.type === "function") {
        try {
          answered = setOf((JSON.parse(sr.function.arguments) as { options: string[] }).options ?? []);
        } catch {
          /* ignore */
        }
        break;
      }
    }
  }
  return { answers, answered, lastUser: lastUser ? textOf(lastUser) : "" };
}

const yes = (s: string | undefined) => !!s && /^\s*(yes|yeah|sure|ok|go ahead)/i.test(s);

export function mapExperience(s = "") {
  return /regular|often|experienced|a lot/i.test(s) ? "experienced" : /little|some|bit/i.test(s) ? "some" : "none";
}
export function mapHorizon(s = "") {
  return /under|less|short|1 year|< ?2/i.test(s)
    ? "short"
    : /5\+|more than 5|long|10|decade/i.test(s)
      ? "long"
      : /2.?5|medium/i.test(s)
        ? "medium"
        : "long";
}
export function mapTolerance(s = "") {
  return /sell/i.test(s) ? "sell" : /buy/i.test(s) ? "buy_more" : "wait";
}

type Emit = (e: AssistantEvent) => void;

class Turn {
  readonly messages: ChatCompletionMessageParam[] = [];
  private calls: ChatCompletionMessageFunctionToolCall[] = [];
  private results: ChatCompletionMessageParam[] = [];
  readonly cards: AssistantCard[] = [];
  private seq = 0;

  constructor(
    private ctx: ToolContext,
    private emit: Emit,
  ) {}

  async tool(name: string, args: Record<string, unknown> = {}) {
    const spec = TOOLS[name]!;
    const id = `fallback_${Date.now()}_${this.seq++}`;
    this.calls.push({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });
    if (spec.label) this.emit({ t: "step", id, label: spec.label, status: "running" });
    const out = await spec.run(args, this.ctx);
    if (spec.label) this.emit({ t: "step", id, label: spec.label, status: "done" });
    out.steps?.forEach((label, i) => this.emit({ t: "step", id: `${id}-${i}`, label, status: "done" }));
    out.cards?.forEach((card) => {
      this.cards.push(card);
      this.emit({ t: "card", card });
    });
    this.results.push({ role: "tool", tool_call_id: id, content: JSON.stringify(out.result) });
    return out;
  }

  card<K extends AssistantCard["kind"]>(kind: K) {
    return this.cards.find((c): c is Extract<AssistantCard, { kind: K }> => c.kind === kind);
  }

  /** Finish the turn: text, then optional quick replies. */
  async say(text: string, choices?: ChoiceSet) {
    if (this.calls.length) {
      this.messages.push({ role: "assistant", content: null, tool_calls: this.calls }, ...this.results);
    }
    this.emit({ t: "text", d: text });
    if (choices) {
      const options = [...CHOICES[choices]];
      const id = `fallback_${Date.now()}_${this.seq++}`;
      this.messages.push(
        {
          role: "assistant",
          content: text,
          tool_calls: [
            { id, type: "function", function: { name: "suggest_replies", arguments: JSON.stringify({ options }) } },
          ],
        },
        { role: "tool", tool_call_id: id, content: JSON.stringify({ shown: options }) },
      );
      this.emit({ t: "card", card: { kind: "choices", options } });
    } else {
      this.messages.push({ role: "assistant", content: text });
    }
    return this.messages;
  }
}

/** Returns the messages to append, or null when the request isn't something the fallback can handle. */
export async function runFallback(
  messages: ChatCompletionMessageParam[],
  ctx: ToolContext,
  emit: Emit,
): Promise<ChatCompletionMessageParam[] | null> {
  const { answers, answered, lastUser } = readState(messages);
  const turn = new Turn(ctx, emit);

  switch (answered) {
    case "experience":
      return turn.say("Thanks. What is this money for, and when might you need it?", "horizon");
    case "horizon":
      return turn.say("Got it. If your investment dropped 10% in one month, what would you do?", "tolerance");
    case "tolerance": {
      await turn.tool("save_risk_profile", {
        experience: mapExperience(answers.experience),
        goal: "Grow my savings",
        horizon: mapHorizon(answers.horizon),
        tolerance: mapTolerance(answers.tolerance),
      });
      const p = turn.card("profile");
      return turn.say(
        `Your profile is saved: ${p ? `${p.levelLabel}, ${p.horizonLabel.toLowerCase()}` : "done"}. Can I look at your last 12 months of activity to see how much you can invest safely?`,
        "permission",
      );
    }
    case "permission": {
      if (!yes(answers.permission)) {
        return turn.say("No problem, I won't look at your activity. Ask me again whenever you're ready.");
      }
      await turn.tool("summarize_cashflow");
      const cf = turn.card("cashflow") as CashflowCard | undefined;
      if (!cf || cf.readyToInvestCents < 100) {
        return turn.say(
          "Right now your balance is best kept as your emergency fund, so I wouldn't invest yet. Building that safety net comes first.",
        );
      }
      await turn.tool("build_portfolio");
      await turn.tool("explain_risks");
      await turn.tool("schedule_auto_invest", { amount_cents: 5000, days: [15, 30] });
      const pf = turn.card("portfolio") as PortfolioCard | undefined;
      const steady = cf.steadyIncome
        ? `Your income is steady: ${cf.steadyIncome.counterparty} paid you in ${cf.steadyIncome.monthsPaid} of the last ${cf.months} months. `
        : "";
      const lines =
        pf?.lines.map((l) => `- **${l.weight}% ${l.label} (${usd(l.amountCents)}):** ${l.explanation}`).join("\n") ??
        "";
      return turn.say(
        `${steady}After keeping ${usd(cf.emergencyFundCents)} aside as your emergency fund, ${usd(cf.readyToInvestCents)} is ready to invest.\n\nHere's a starter mix for it:\n${lines}\n\nPrices can drop as well as rise, so think in years, not months. Would you like to add $50 on each payday, the 15th and 30th?`,
        "autoInvest",
      );
    }
    case "autoInvest": {
      const auto = yes(answers.autoInvest);
      await turn.tool("review_and_confirm", auto ? { auto_invest_amount_cents: 5000, auto_invest_days: [15, 30] } : {});
      const r = turn.card("review");
      if (!r) return turn.say("I couldn't prepare the review right now. Please try again.");
      return turn.say(
        `Your review is ready: ${usd(r.amountCents)} in a ${r.levelLabel.toLowerCase()} mix${auto ? ", plus $50 on the 15th and 30th of each month" : ""}. Nothing has been invested yet. Review it and press "Confirm & fund" when you're ready.`,
      );
    }
  }

  if (/start investing|invest/i.test(lastUser)) {
    return turn.say(
      "Happy to help you get started. First, how would you describe your investing experience?",
      "experience",
    );
  }
  if (/spen[dt]|spending|this month/i.test(lastUser)) {
    await turn.tool("spending_this_month");
    const sp = turn.card("spending") as SpendingCard | undefined;
    const top = sp?.categories[0];
    return turn.say(
      sp
        ? `So far in ${sp.month} you've received ${usd(sp.incomeCents)} and spent ${usd(sp.spendCents)}${top ? `, mostly on ${top.category.toLowerCase()} (${usd(top.cents)})` : ""}.`
        : "I couldn't add up this month's spending right now.",
    );
  }
  if (/portfolio|holdings|investments/i.test(lastUser)) {
    await turn.tool("get_portfolio");
    const pf = turn.card("portfolio") as PortfolioCard | undefined;
    if (!pf) return turn.say("You haven't invested yet. Want me to help you start?", "start");
    return turn.say(
      `You have ${usd(pf.totalCents)} invested: ${pf.lines.map((l) => `${l.weight}% ${l.label.toLowerCase()}`).join(", ")}. Index funds are the core, bonds soften drops, and growth stocks add upside with bigger swings.`,
    );
  }
  return null;
}
