import { describe, expect, it } from "vitest";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { runAgent, systemPrompt, type ChatClient } from "@/lib/assistant/agent";
import type { AssistantCard, AssistantEvent } from "@/lib/assistant/cards";
import { NumberGate, collectNumbers, sanitizeText } from "@/lib/assistant/numbers";
import { detectRiskyRequest } from "@/lib/assistant/risk";
import { newSpace } from "./helpers";

// ---- a scripted fake model: each round returns text and/or tool calls ----
type Round = { text?: string; tools?: { name: string; args?: Record<string, unknown> }[] };
function fakeModel(rounds: Round[]): ChatClient {
  let i = 0;
  const create = async () => {
    const r = rounds[Math.min(i++, rounds.length - 1)]!;
    return (async function* () {
      // Stream text in small pieces, like a real model.
      for (const piece of (r.text ?? "").match(/.{1,7}/gs) ?? []) yield { choices: [{ delta: { content: piece } }] };
      for (const [index, t] of (r.tools ?? []).entries()) {
        yield {
          choices: [
            { delta: { tool_calls: [{ index, id: `call_${i}_${index}`, function: { name: t.name, arguments: JSON.stringify(t.args ?? {}) } }] } },
          ],
        };
      }
    })();
  };
  return { chat: { completions: { create } } } as unknown as ChatClient;
}

async function run(userText: string, rounds: Round[]) {
  const ids = await newSpace();
  const user = { name: "Laura", occupation: "Freelance designer", city: "Bogota" };
  const now = new Date();
  const history: ChatCompletionMessageParam[] = [{ role: "user", content: userText }];
  const events: AssistantEvent[] = [];
  await runAgent(history, { userId: ids.laura, now, system: systemPrompt(user, now) }, (e) => events.push(e), undefined, {
    client: fakeModel(rounds),
  });
  const text = events.filter((e) => e.t === "text").map((e) => (e as { d: string }).d).join("");
  const cards = events.filter((e): e is Extract<AssistantEvent, { t: "card" }> => e.t === "card").map((e) => e.card);
  return { text, cards };
}
const kinds = (cards: AssistantCard[]) => cards.map((c) => c.kind);

describe("number guardrail", () => {
  it("never displays a model number that isn't in tool results", async () => {
    const { text } = await run("What could I make?", [
      { text: "Honestly? You could earn $5,000 next year, maybe 12% a year. Slow money, strong money." },
    ]);
    expect(text).not.toContain("5,000");
    expect(text).not.toContain("12%");
    expect(text).toContain("Slow money, strong money.");
  });

  it("keeps numbers that come from tool results", async () => {
    const { text, cards } = await run("Help me start investing", [
      { tools: [{ name: "summarize_cashflow" }] },
      { text: "Okay, I love this. You've got $440 ready, and your $2,760 safety net stays put. Invent: $9,999." },
    ]);
    expect(kinds(cards)).toContain("cashflow");
    expect(text).toContain("$440");
    expect(text).toContain("$2,760");
    expect(text).not.toContain("9,999");
  });

  it("strips emoji and handles numbers split across stream chunks", () => {
    const gate = new NumberGate("ready_to_invest: $440.00");
    const out = ["You have $4", "40.00 ready 🚀 and $1", "23 more"].map((d) => gate.push(d)).join("") + gate.flush();
    expect(out).toBe("You have $440.00 ready  and that amount more");
    expect(sanitizeText("Great 😀 job", collectNumbers("")).text).toBe("Great  job");
  });
});

describe("risky requests", () => {
  it("are detected in English, Spanish and Portuguese", () => {
    expect(detectRiskyRequest("I want to put all my money into one stock")).toBe("single_stock");
    expect(detectRiskyRequest("Can I invest my emergency fund?")).toBe("emergency_fund");
    expect(detectRiskyRequest("¿Puedo invertir mi fondo de emergencia?")).toBe("emergency_fund");
    expect(detectRiskyRequest("Should I buy bitcoin?")).toBe("crypto");
    expect(detectRiskyRequest("I want to borrow money to invest")).toBe("leverage");
    expect(detectRiskyRequest("quero ficar rico rápido")).toBe("quick_money");
    expect(detectRiskyRequest("Help me start investing")).toBeNull();
  });

  it("produce a pushback card, never an action, even if the model tries one", async () => {
    const { cards } = await run("I want to put all my money into one stock", [
      // The model ignores the instruction and tries to prepare an investment.
      { tools: [{ name: "review_and_confirm", args: { amount_cents: 320000, risk_level: "AGGRESSIVE" } }] },
      { text: "I get the temptation, I really do." },
    ]);
    expect(kinds(cards)).toContain("pushback");
    expect(kinds(cards)).not.toContain("review");
    const pushback = cards.find((c) => c.kind === "pushback");
    expect(pushback && "options" in pushback ? pushback.options : []).toEqual(["Show me the safer option", "I understand the risk"]);
  });

  it("show the pushback card even when the model only writes text", async () => {
    const { cards } = await run("Can I invest my emergency fund too?", [{ text: "Hmm, let me think about that." }]);
    expect(kinds(cards)).toEqual(["pushback"]);
  });
});

describe("chat hygiene", () => {
  it("asks the question when the model shows quick replies without text, and shows chips once", async () => {
    const options = ["Sell everything", "Wait it out", "Buy a bit more"];
    const { text, cards } = await run("5+ years", [
      { tools: [{ name: "suggest_replies", args: { options } }, { name: "suggest_replies", args: { options } }] },
    ]);
    expect(kinds(cards)).toEqual(["choices"]);
    expect(text).toContain("dropped 10% in one month");
  });
});
