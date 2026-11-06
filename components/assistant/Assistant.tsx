"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, RotateCcw, SendHorizontal, Square, X } from "lucide-react";
import { SparkleIcon } from "@/components/brand/SparkleIcon";
import { Sheet } from "@/components/common/Sheet";
import { OPEN_ASSISTANT_EVENT } from "@/components/home/AskAiBanner";
import { AppPortal } from "@/components/shell/AppPortal";
import type { AssistantCard, AssistantEvent, ReviewCard } from "@/lib/assistant/cards";
import { cn } from "@/lib/utils";
import { CardView } from "./Cards";
import { RichText } from "./RichText";
import { ReviewScreen } from "./ReviewScreen";

type Step = { id: string; label: string; status: "running" | "done" | "error" };
type Block = { type: "text"; text: string } | { type: "steps"; steps: Step[] } | { type: "card"; card: AssistantCard };
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
    out.push({ type: "text", text: e.message });
  }
  return out;
}

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<ReviewCard | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      else update({ t: "error", message: "I couldn't reach Finpal AI. Please try again." });
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

  const lastAssistantId = [...items].reverse().find((i) => i.role === "assistant")?.id;

  return (
    <>
      {/* Floating entry point on every screen */}
      <AppPortal>
        <AnimatePresence>
          {!open && (
            <motion.button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Ask Finpal AI"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute bottom-[84px] right-4 grid size-14 place-items-center rounded-full bg-navy text-teal shadow-[0_12px_30px_-8px_rgba(11,61,145,0.7)] ring-4 ring-white @3xl/app:bottom-16 @3xl/app:right-8"
            >
              <SparkleIcon size={26} />
            </motion.button>
          )}
        </AnimatePresence>
      </AppPortal>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Finpal AI"
        subtitle="Education, not financial advice"
        icon={
          <span className="grid size-10 place-items-center rounded-full bg-teal-soft text-teal">
            <SparkleIcon size={20} />
          </span>
        }
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
        <div className="relative flex h-full flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
            {items.length === 0 ? (
              <Welcome onPick={(t) => void send(t)} />
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
                    blocks={it.blocks}
                    pending={busy && it.id === lastAssistantId}
                    interactive={!busy && it.id === lastAssistantId}
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
              Message Finpal AI
            </label>
            <input
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
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

function Welcome({ onPick }: { onPick: (t: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-navy-soft px-4 py-3 text-sm text-ink">
        Hi! I&apos;m Finpal AI. I can explain your spending, your portfolio, and help you start investing step by step. I
        never move money without your confirmation.
      </div>
      <div className="flex flex-wrap gap-2">
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

function BotTurn({
  blocks,
  pending,
  interactive,
  onChoice,
  onReview,
}: {
  blocks: Block[];
  pending: boolean;
  interactive: boolean;
  onChoice: (t: string) => void;
  onReview: (c: ReviewCard) => void;
}) {
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
        >
          {b.type === "text" ? (
            <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-navy-soft px-4 py-3 text-sm text-ink">
              <RichText text={b.text} />
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
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid size-4 place-items-center rounded-full bg-success text-white">
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
      {pending && blocks.length === 0 && (
        <div className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-navy-soft px-4 py-3" aria-label="Finpal AI is typing">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-navy/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
