import type { AssistantCard } from "@/lib/assistant/cards";
import type { PalMood } from "./Pal";

/** Minimal view of a bot turn's content, enough to pick Pal's mood. */
export type MoodBlock =
  | { type: "text" }
  | { type: "error" }
  | { type: "steps"; steps: { status: "running" | "done" | "error" }[] }
  | { type: "card"; card: Pick<AssistantCard, "kind"> };

const CARD_MOOD: Partial<Record<AssistantCard["kind"], PalMood>> = {
  cashflow: "excited", // found money he can put to work
  portfolio: "excited", // portfolio built
  risks: "serious", // honest risk talk
  pushback: "serious", // kind but firm
  profile: "excited",
  review: "excited",
};

/** Mood that a finished bot turn ends on (used for past avatars). */
export function moodForTurn(blocks: MoodBlock[]): PalMood {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i]!;
    if (b.type === "error") return "oops";
    if (b.type === "steps" && b.steps.some((s) => s.status === "error")) return "oops";
    if (b.type === "card") {
      // Risk talk wins over excitement within the same turn: honest first.
      if (blocks.some((x) => x.type === "card" && (x.card.kind === "risks" || x.card.kind === "pushback"))) return "serious";
      const m = CARD_MOOD[b.card.kind];
      if (m) return m;
    }
  }
  return "idle";
}

/**
 * Pal's live mood, following the conversation:
 * error -> oops, waiting/tools -> thinking, user typing -> listening,
 * otherwise the mood of the latest turn (or a wave before the first message).
 */
export function liveMood(state: {
  busy: boolean;
  typing: boolean;
  hasMessages: boolean;
  lastTurn: MoodBlock[] | null;
}): PalMood {
  const turn = state.lastTurn ?? [];
  const errored = turn.some((b) => b.type === "error");
  if (errored && !state.busy) return "oops";
  if (state.busy) {
    const streamingText = turn.length > 0 && turn[turn.length - 1]!.type === "text";
    const runningTool = turn.some((b) => b.type === "steps" && b.steps.some((s) => s.status === "running"));
    if (!streamingText || runningTool) return "thinking";
    return moodForTurn(turn) === "idle" ? "idle" : moodForTurn(turn);
  }
  if (state.typing) return "listening";
  if (!state.hasMessages) return "wave";
  return moodForTurn(turn);
}

/** Short lines Pal rotates through while he thinks. */
export const THINKING_LINES = [
  "Crunching your cash flow…",
  "Checking your safety net…",
  "Building your mix…",
  "Doing the math, carefully…",
];
