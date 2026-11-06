import "server-only";
import type {
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import type { AssistantCard, AssistantEvent, CashflowCard, PortfolioCard, SpendingCard } from "./cards";
import { formatCents } from "@/lib/utils";
import { detectRiskyRequest } from "./risk";
import { TOOLS, type ToolContext } from "./tools";

/**
 * Deterministic fallback for Pal. If the model is slow or down, the guided
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

const usd = (cents: number) => formatCents(cents);

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

/** Pal's question for each quick-reply set, used when the model shows chips without the question. */
const QUESTION: Record<ChoiceSet, string> = {
  experience: "First things first: how much investing have you done so far?",
  horizon: "What's this money for, and when might you need it?",
  tolerance: "Honest question: if your investment dropped 10% in one month, what would you do?",
  permission: "Can I look at your last 12 months of activity to see how much you can invest safely?",
  autoInvest: "Want to add $50 every payday, on the 15th and 30th?",
  start: "Want to start your first investment together?",
};

export function questionForOptions(options: string[]): string {
  const set = setOf(options);
  return set ? QUESTION[set] : "Which one sounds right to you?";
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

/**
 * Returns the messages to append, or null when the request isn't something the fallback can handle.
 * Copy is written in Pal's voice: warm and energetic about habits, honest and calm about risk.
 */
export async function runFallback(
  messages: ChatCompletionMessageParam[],
  ctx: ToolContext,
  emit: Emit,
): Promise<ChatCompletionMessageParam[] | null> {
  const { answers, answered, lastUser } = readState(messages);
  const turn = new Turn(ctx, emit);

  // Guardrail first: risky requests get a kind pushback card, never an action.
  const risky = ctx.riskyKind ?? detectRiskyRequest(lastUser);
  if (risky) {
    await turn.tool("flag_risky_request", { kind: risky });
    return turn.say("I get the temptation, I really do. Here's my honest take, and then it's your call.");
  }
  if (/^\s*I understand the risk/i.test(lastUser)) {
    return turn.say(
      "Fair enough, it's your money and your call. Here in Finpal I only build diversified starter portfolios, so whenever you want, I'll set one up with you.",
      "start",
    );
  }

  switch (answered) {
    case "experience":
      return turn.say("Love it. What's this money for, and when might you need it?", "horizon");
    case "horizon":
      return turn.say("Okay, honest question: if your investment dropped 10% in one month, what would you do?", "tolerance");
    case "tolerance": {
      await turn.tool("save_risk_profile", {
        experience: mapExperience(answers.experience),
        goal: "Grow my savings",
        horizon: mapHorizon(answers.horizon),
        tolerance: mapTolerance(answers.tolerance),
      });
      const p = turn.card("profile");
      return turn.say(
        `Got it: ${p ? `${p.levelLabel.toLowerCase()}, ${p.horizonLabel.toLowerCase()}` : "profile saved"}. That's a great place to start.\n\nCan I look at your last 12 months of activity to see how much you can invest safely?`,
        "permission",
      );
    }
    case "permission": {
      if (!yes(answers.permission)) {
        return turn.say("Totally fair. Your data, your call. I'm right here whenever you're ready.");
      }
      await turn.tool("summarize_cashflow");
      const cf = turn.card("cashflow") as CashflowCard | undefined;
      if (!cf || cf.readyToInvestCents < 100) {
        return turn.say(
          "Here's my honest take: right now your balance is doing its most important job, being your safety net. Let's build that first, then we invest. Slow money, strong money.",
        );
      }
      await turn.tool("build_portfolio");
      await turn.tool("explain_risks");
      await turn.tool("schedule_auto_invest", { amount_cents: 5000, days: [15, 30] });
      const pf = turn.card("portfolio") as PortfolioCard | undefined;
      const steady = cf.steadyIncome
        ? ` ${cf.steadyIncome.counterparty} paid you in ${cf.steadyIncome.monthsPaid} of the last ${cf.months} months, which is a rock-solid base.`
        : "";
      const lines =
        pf?.lines.map((l) => `- **${l.weight}% ${l.label} (${usd(l.amountCents)}):** ${l.explanation}`).join("\n") ??
        "";
      return turn.say(
        `Okay, I love this. You've got ${usd(cf.readyToInvestCents)} that can start working today, and your ${usd(cf.emergencyFundCents)} safety net stays untouched.${steady}\n\nHere's the mix I'd start with:\n${lines}\n\nReal talk: in a rough year a mix like this could drop around 15%. That's normal, and the people who do well are the ones who don't panic-sell. Want to add $50 every payday, on the 15th and 30th?`,
        "autoInvest",
      );
    }
    case "autoInvest": {
      const auto = yes(answers.autoInvest);
      await turn.tool("review_and_confirm", auto ? { auto_invest_amount_cents: 5000, auto_invest_days: [15, 30] } : {});
      const r = turn.card("review");
      if (!r) return turn.say("Hmm, I couldn't prepare the review just now. Mind trying again?");
      return turn.say(
        `${auto ? "Fifty dollars every payday? That's how real wealth starts. Quietly. " : ""}Everything's in one place: ${usd(r.amountCents)} in a ${r.levelLabel.toLowerCase()} mix${auto ? ", plus $50 on the 15th and 30th" : ""}.\n\nNothing moves until you press "Confirm & fund". Your call, always.`,
      );
    }
  }

  if (/start investing|invest|safer option/i.test(lastUser)) {
    return turn.say(
      "Hey, I'm Pal. Fair warning: I get way too excited about long-term investing. First things first, how much investing have you done so far?",
      "experience",
    );
  }
  if (/spen[dt]|spending|this month/i.test(lastUser)) {
    await turn.tool("spending_this_month");
    const sp = turn.card("spending") as SpendingCard | undefined;
    const top = sp?.categories[0];
    return turn.say(
      sp
        ? `Here's ${sp.month} so far: ${usd(sp.incomeCents)} in and ${usd(sp.spendCents)} out${top ? `, with ${top.category.toLowerCase()} as the biggest piece (${usd(top.cents)})` : ""}. Knowing where it goes is step one of every good plan.`
        : "Hmm, I couldn't add up this month's spending just now. Mind trying again?",
    );
  }
  if (/portfolio|holdings|investments/i.test(lastUser)) {
    await turn.tool("get_portfolio");
    const pf = turn.card("portfolio") as PortfolioCard | undefined;
    if (!pf) return turn.say("Nothing invested yet, which honestly makes this the fun part. Want to start?", "start");
    return turn.say(
      `You've got ${usd(pf.totalCents)} working for you: ${pf.lines.map((l) => `${l.weight}% ${l.label.toLowerCase()}`).join(", ")}. Think of it like a team: index funds are the engine, bonds are the shock absorbers, and growth stocks are the turbo.`,
    );
  }
  return null;
}
