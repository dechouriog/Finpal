import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { prisma } from "../lib/db";
import { runAgent, systemPrompt } from "../lib/assistant/agent";

const turns = [
  "Help me start investing",
  "I'm new to investing",
  "I want to grow my savings, 5+ years",
  "Wait it out",
  "Yes, go ahead",
  "Yes, add Auto-invest",
];

(async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: "laura" } });
  const now = new Date();
  const history: ChatCompletionMessageParam[] = [];
  let cost = 0;
  for (const turn of turns) {
    console.log(`\n>>> USER: ${turn}`);
    history.push({ role: "user", content: turn });
    let text = "";
    const t0 = Date.now();
    const added = await runAgent(history, { userId: user.id, now, system: systemPrompt(user, now) }, (e) => {
      if (e.t === "text") text += e.d;
      if (e.t === "step") console.log(`   [step ${e.status}] ${e.label}`);
      if (e.t === "card") {
        const c = e.card;
        const extra =
          c.kind === "choices" ? c.options.join(" | ")
          : c.kind === "cashflow" ? `ready=${c.readyToInvestCents} income=${c.avgIncomeCents} spend=${c.avgSpendCents}`
          : c.kind === "portfolio" ? c.lines.map((l) => `${l.weight}%=${l.amountCents}`).join(" ")
          : c.kind === "review" ? `amount=${c.amountCents} level=${c.level} auto=${JSON.stringify(c.autoInvest?.days)} next=${c.autoInvest?.nextRuns.map((d) => d.slice(5, 10)).join(",")}`
          : c.kind === "profile" ? `${c.levelLabel} · ${c.horizonLabel}`
          : "";
        console.log(`   [card ${c.kind}] ${extra}`);
      }
    });
    history.push(...added);
    console.log(`<<< AI (${Date.now() - t0}ms): ${text.trim()}`);
  }
  console.log("\nrisk profile:", await prisma.riskProfile.findUnique({ where: { userId: "laura" } }).then((r) => r?.level));
  void cost;
  await prisma.$disconnect();
})().catch((e) => {
  console.error("FAILED", e);
  process.exit(1);
});
