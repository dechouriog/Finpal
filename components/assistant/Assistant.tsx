"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, RotateCcw, SendHorizontal, Square, X } from "lucide-react";
import { Sheet } from "@/components/common/Sheet";
import { OPEN_ASSISTANT_EVENT } from "@/components/home/AskAiBanner";
import { liveMood, moodForTurn } from "@/components/pal/mood";
import type { PalMood } from "@/components/pal/Pal";
import { PalAvatar, PalLauncher, PalThinking } from "@/components/pal/PalParts";
import { AppPortal } from "@/components/shell/AppPortal";
import type { AssistantCard, AssistantEvent, ReviewCard } from "@/lib/assistant/cards";
import { cn } from "@/lib/utils";
import { CardView } from "./Cards";
import { RichText } from "./RichText";
import { ReviewScreen } from "./ReviewScreen";

type Step = { id: string; label: string; status: "running" | "done" | "error" };
type Block =
  | { type: "text"; text: string }
  | { type: "error"; text: string }
  | { type: "steps"; steps: Step[] }
  | { type: "card"; card: AssistantCard };
type ChatItem = { id: string; role: "user"; text: string } | { id: string; role: "assistant"; blocks: Block[] };

const SHORTCUTS = ["How did I spend this month?", "Explain my portfolio", "Help me start investing"];

let idSeq = 0;
const nextId = () => `m${Date.now()}-${idSeq++}`;

function applyEvent(blocks: Block[], e: AssistantEvent): Block[] {
  const out = [...blocks];
  const last = out[out.length - 1];
  if (e.t === "text") {
    if (last?.type === "text") out[out.length - 1] = { type: "text", text: last.text + e.d };
    else if (e.d.trim()) out.push({ type: "text", text: e.d });
  } else if (e.t === "step") {
    const step: Step = { id: e.id, label: e.label, status: e.status };
    if (last?.type === "steps") {
      const i = last.steps.findIndex((s) => s.id === e.id);
      const steps = i >= 0 ? last.steps.map((s, j) => (j === i ? step : s)) : [...last.steps, step];
      out[out.length - 1] = { type: "steps", steps };
    } else out.push({ type: "steps", steps: [step] });
  } else if (e.t === "card") {
    out.push({ type: "card", card: e.card });
  } else if (e.t === "error") {
    out.push({ type: "error", text: e.message });
  }
  return out;
}

/** First name from the Auth.js session, for Pal's greeting. */
function useFirstName() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { user?: { name?: string } } | null) => alive && setName(s?.user?.name?.split(" ")[0] ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return name;
}

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<ReviewCard | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const firstName = useFirstName();

  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const prompt = (e as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (prompt) setTimeout(() => void send(prompt), 350);
    };
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  const historyRef = useRef(history);
  historyRef.current = history;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || busyRef.current) return;
    setInput("");
    setBusy(true);
    const botId = nextId();
    setItems((prev) => [...prev, { id: nextId(), role: "user", text: content }, { id: botId, role: "assistant", blocks: [] }]);
    const update = (e: AssistantEvent) =>
      setItems((prev) => prev.map((it) => (it.id === botId && it.role === "assistant" ? { ...it, blocks: applyEvent(it.blocks, e) } : it)));

    const outgoing = [...historyRef.current, { role: "user", content }];
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let gotHistory = false;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outgoing }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error("bad response");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const e = JSON.parse(line) as AssistantEvent;
          if (e.t === "history") {
            gotHistory = true;
            setHistory([...outgoing, ...e.messages]);
          } else update(e);
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") update({ t: "text", d: "\n\n(Stopped)" });
      else update({ t: "error", message: "Oops, I lost my train of thought for a second. Mind trying again?" });
    } finally {
      // Keep the user's message in history even if the reply failed, so context isn't lost.
      if (!gotHistory) setHistory(outgoing);
      setBusy(false);
      abortRef.current = null;
    }
  }, []);

  const reset = () => {
    abortRef.current?.abort();
    setItems([]);
    setHistory([]);
    setReview(null);
    setBusy(false);
  };

  const lastAssistant = [...items].reverse().find((i): i is Extract<ChatItem, { role: "assistant" }> => i.role === "assistant");
  const mood = liveMood({
    busy,
    typing: inputFocused && input.trim().length > 0,
    hasMessages: items.length > 0,
    lastTurn: lastAssistant?.blocks ?? null,
  });

  return (
    <>
      {/* Pal peeks from the corner on every screen */}
      <AppPortal>
        <AnimatePresence>{!open && <PalLauncher key="pal-launcher" onOpen={() => setOpen(true)} />}</AnimatePresence>
      </AppPortal>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Pal · your investing buddy"
        subtitle="Education, not financial advice"
        icon={<PalAvatar mood={mood} size={34} />}
        headerAction={
          items.length > 0 ? (
            <button
              type="button"
              onClick={reset}
              aria-label="New chat"
              title="New chat"
              className="grid size-9 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink"
            >
              <RotateCcw className="size-4" aria-hidden />
            </button>
          ) : null
        }
        panelWidth={440}
        mobileHeight="90%"
        backdropOnDesktop={false}
      >
        <div className="relative flex h-full flex-col" data-pal-mood={mood}>
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
            {items.length === 0 ? (
              <Welcome name={firstName} onPick={(t) => void send(t)} />
            ) : (
              items.map((it) =>
                it.role === "user" ? (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-sm text-white"
                  >
                    {it.text}
                  </motion.div>
                ) : (
                  <BotTurn
                    key={it.id}
                    mood={it.id === lastAssistant?.id ? mood : moodForTurn(it.blocks)}
                    live={it.id === lastAssistant?.id}
                    onRetry={() => {
                      const idx = items.indexOf(it);
                      const prev = items.slice(0, idx).reverse().find((x) => x.role === "user");
                      if (prev && prev.role === "user") void send(prev.text);
                    }}
                    blocks={it.blocks}
                    pending={busy && it.id === lastAssistant?.id}
                    interactive={!busy && it.id === lastAssistant?.id}
                    onChoice={(t) => void send(t)}
                    onReview={setReview}
                  />
                ),
              )
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex shrink-0 items-center gap-2 border-t border-line bg-surface p-3"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Message Pal
            </label>
            <input
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Ask anything about your money…"
              autoComplete="off"
              maxLength={2000}
              className="h-11 min-w-0 flex-1 rounded-full bg-bg px-4 text-sm text-ink ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                aria-label="Stop response"
                title="Stop"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-navy text-white"
              >
                <Square className="size-4 fill-current" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-teal text-deep transition-opacity disabled:opacity-40"
              >
                <SendHorizontal className="size-5" aria-hidden />
              </button>
            )}
          </form>

          <AnimatePresence>{review && <ReviewScreen key="review" card={review} onClose={() => setReview(null)} />}</AnimatePresence>
        </div>
      </Sheet>
    </>
  );
}

function Welcome({ name, onPick }: { name: string | null; onPick: (t: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-start gap-2">
        <PalAvatar mood="wave" size={26} />
        <div className="w-fit max-w-[88%] rounded-2xl rounded-tl-md bg-navy-soft px-4 py-3 text-sm text-ink">
          Hey{name ? ` ${name}` : ""}, I&apos;m Pal. I get way too excited about long-term investing, so fair warning.
          Want to see what your savings could be doing?
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-[42px]">
        {SHORTCUTS.map((s, i) => (
          <motion.button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className={cn(
              "rounded-full px-3.5 py-2 text-sm font-semibold ring-1 transition-colors",
              i === 2 ? "bg-teal text-deep ring-teal" : "bg-surface text-navy ring-navy/30 hover:bg-navy-soft",
            )}
          >
            {s}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/** Pal writes in short bubbles: a blank line starts a new one. */
function splitBubbles(text: string) {
  return text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function BotTurn({
  blocks,
  mood,
  live,
  pending,
  interactive,
  onChoice,
  onReview,
  onRetry,
}: {
  blocks: Block[];
  mood: PalMood;
  live: boolean;
  pending: boolean;
  interactive: boolean;
  onChoice: (t: string) => void;
  onReview: (c: ReviewCard) => void;
  onRetry: () => void;
}) {
  const last = blocks[blocks.length - 1];
  // Pal is "thinking" until text starts streaming, and again while tools run.
  const thinking = pending && (!last || last.type !== "text");

  return (
    <div className="flex items-start gap-2">
      <div className="sticky top-0 pt-0.5">
        <PalAvatar mood={mood} size={26} animated={live} />
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {blocks.map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
          >
            {b.type === "error" ? (
              <div role="alert" className="w-fit max-w-[95%] rounded-2xl rounded-tl-md bg-danger-soft px-4 py-3 text-sm text-danger-ink">
                <p>{b.text}</p>
                {interactive && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-bg"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Try again
                  </button>
                )}
              </div>
            ) : b.type === "text" ? (
              <div className="space-y-1.5">
                {splitBubbles(b.text).map((chunk, j) => (
                  <div key={j} className="w-fit max-w-[95%] rounded-2xl rounded-tl-md bg-navy-soft px-4 py-3 text-sm text-ink">
                    <RichText text={chunk} />
                  </div>
                ))}
              </div>
            ) : b.type === "steps" ? (
              <ul className="space-y-1.5 rounded-2xl bg-surface p-3 ring-1 ring-line">
                {b.steps.map((s) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    {s.status === "running" ? (
                      <Loader2 className="size-4 animate-spin text-muted" aria-hidden />
                    ) : s.status === "done" ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="grid size-4 place-items-center rounded-full bg-success text-white"
                      >
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </motion.span>
                    ) : (
                      <span className="grid size-4 place-items-center rounded-full bg-danger text-white">
                        <X className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                    {s.label}
                  </motion.li>
                ))}
              </ul>
            ) : (
              <CardView card={b.card} interactive={interactive} onChoice={onChoice} onReview={onReview} />
            )}
          </motion.div>
        ))}
        {thinking && <PalThinking compact />}
      </div>
    </div>
  );
}
