"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { requestMoney, sendMoney } from "@/app/actions/payments";
import { Avatar } from "@/components/common/Avatar";
import { SuccessCheck } from "@/components/common/SuccessCheck";
import { AmountKeypad } from "@/components/payments/AmountKeypad";
import { Button } from "@/components/ui/button";
import { amountToCents, applyKey, isAmountInput } from "@/lib/money";
import { cn, formatCents } from "@/lib/utils";
import { AmountCents } from "@/lib/validation";

export type Contact = {
  id: "laura" | "maria" | "sam";
  name: string;
  fullName: string;
  handle: string;
  avatarColor: string;
};

type Mode = "send" | "request";
type Step = "contact" | "amount" | "review" | "done";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function PaymentFlow({
  initialMode,
  contacts,
  balanceCents,
}: {
  initialMode: Mode;
  contacts: Contact[];
  balanceCents: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>("contact");
  const [contact, setContact] = useState<Contact | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const amountId = useId();
  const noteId = useId();

  const cents = amountToCents(amount);
  const isSend = mode === "send";

  const validationError = (() => {
    const parsed = AmountCents.safeParse(cents);
    if (!parsed.success) return parsed.error.issues[0]?.message ?? "Enter an amount.";
    if (isSend && cents > balanceCents) return `You only have ${formatCents(balanceCents)} available.`;
    return null;
  })();

  const reset = () => {
    setStep("contact");
    setContact(null);
    setAmount("");
    setNote("");
    setError(null);
  };

  const switchMode = (next: Mode) => {
    if (step === "done") reset();
    setMode(next);
    setError(null);
    if (step === "review") setStep("amount");
  };

  const goReview = () => {
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep("review");
  };

  const confirm = () => {
    if (!contact) return;
    setError(null);
    startTransition(async () => {
      const payload = { amountCents: cents, note };
      const res = isSend
        ? await sendMoney({ ...payload, toUserId: contact.id })
        : await requestMoney({ ...payload, fromUserId: contact.id });
      if (res.ok) {
        setStep("done");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <section aria-label={isSend ? "Send money" : "Request money"} className="rounded-3xl bg-surface p-5 ring-1 ring-line @3xl/app:p-7">
      {/* Send | Request */}
      <div role="tablist" aria-label="Payment type" className="mb-5 grid grid-cols-2 rounded-full bg-bg p-1 ring-1 ring-line">
        {(["send", "request"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={cn(
              "relative h-9 rounded-full text-sm font-semibold transition-colors",
              mode === m ? "text-white" : "text-muted hover:text-ink",
            )}
          >
            {mode === m && (
              <motion.span
                layoutId="payment-mode-pill"
                className="absolute inset-0 rounded-full bg-navy"
                transition={{ duration: 0.3, ease: EASE_OUT }}
              />
            )}
            <span className="relative">{m === "send" ? "Send" : "Request"}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
          {step === "contact" && (
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                {isSend ? "Who are you paying?" : "Who are you requesting from?"}
              </h2>
              <ul className="mt-3 space-y-2">
                {contacts.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setContact(c);
                        setStep("amount");
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-line transition-colors hover:bg-bg"
                    >
                      <Avatar name={c.name} color={c.avatarColor} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">{c.fullName}</span>
                        <span className="block text-xs text-muted">{c.handle}</span>
                      </span>
                      <ChevronRight className="size-5 text-muted" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === "amount" && contact && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goReview();
              }}
              className="space-y-4"
            >
              <StepHeader onBack={() => setStep("contact")} contact={contact} label={isSend ? "Paying" : "Requesting from"} />

              <div className="text-center">
                <label htmlFor={amountId} className="text-sm font-medium text-muted">
                  Amount (USD)
                </label>
                <div className="mt-1 flex items-center justify-center font-display text-5xl font-extrabold tracking-tight text-ink">
                  <span aria-hidden className={cn(amount ? "text-ink" : "text-line")}>$</span>
                  <input
                    id={amountId}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, "");
                      if (isAmountInput(v)) setAmount(v);
                      setError(null);
                    }}
                    aria-invalid={!!error}
                    aria-describedby={`${amountId}-hint`}
                    className="min-w-0 bg-transparent text-center tabular placeholder:text-line focus:outline-none"
                    style={{ width: `${Math.max(1, amount.length) + 0.5}ch` }}
                  />
                </div>
                <p id={`${amountId}-hint`} className="mt-1 text-xs text-muted">
                  {isSend ? `Available ${formatCents(balanceCents)}` : `${contact.name} will get a request to pay you.`}
                </p>
              </div>

              <div className="@3xl/app:hidden">
                <AmountKeypad
                  onKey={(k) => {
                    setAmount((a) => applyKey(a, k));
                    setError(null);
                  }}
                />
              </div>

              <div>
                <label htmlFor={noteId} className="text-sm font-medium text-ink">
                  Note <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id={noteId}
                  value={note}
                  maxLength={80}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={isSend ? "What's it for?" : "e.g. Dinner last night"}
                  className="mt-1 h-11 w-full rounded-xl bg-bg px-3 text-sm text-ink ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>

              <ErrorText error={error} />

              <Button type="submit" size="lg" className="w-full" disabled={cents === 0}>
                Review
              </Button>
            </form>
          )}

          {step === "review" && contact && (
            <div className="space-y-5">
              <StepHeader onBack={() => setStep("amount")} contact={contact} label="Review" />

              <div className="rounded-2xl bg-bg p-5 text-center">
                <p className="text-sm text-muted">{isSend ? "You're sending" : "You're requesting"}</p>
                <p className="mt-1 font-display text-4xl font-extrabold tracking-tight text-ink tabular">
                  {formatCents(cents)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {isSend ? "to" : "from"} <span className="font-semibold text-ink">{contact.fullName}</span>
                </p>
              </div>

              <dl className="divide-y divide-line text-sm">
                <Row label={isSend ? "From" : "Paid into"} value="Finpal balance" />
                {isSend && <Row label="Balance after" value={formatCents(balanceCents - cents)} />}
                <Row label="Note" value={note.trim() || "None"} />
                <Row label="Fee" value="Free" />
              </dl>

              <ErrorText error={error} />

              <Button size="lg" className="w-full" onClick={confirm} disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {pending ? "Processing…" : `${isSend ? "Send" : "Request"} ${formatCents(cents)}`}
              </Button>
            </div>
          )}

          {step === "done" && contact && (
            <div className="flex flex-col items-center py-6 text-center" role="status">
              <SuccessCheck />
              <h2 className="mt-5 font-display text-2xl font-extrabold text-ink">
                {isSend ? "Money sent!" : "Request sent!"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {isSend
                  ? `${formatCents(cents)} is on its way to ${contact.name}.`
                  : `We'll let you know when ${contact.name} pays ${formatCents(cents)}.`}
              </p>
              <div className="mt-6 flex w-full flex-col gap-2 @md/app:flex-row @md/app:justify-center">
                <Button asChild variant="navy" size="lg">
                  <Link href="/">Done</Link>
                </Button>
                <Button variant="outline" size="lg" onClick={reset}>
                  New {isSend ? "payment" : "request"}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function StepHeader({ onBack, contact, label }: { onBack: () => void; contact: Contact; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="grid size-9 place-items-center rounded-full text-ink ring-1 ring-line hover:bg-bg"
      >
        <ArrowLeft className="size-4" aria-hidden />
      </button>
      <Avatar name={contact.name} color={contact.avatarColor} size={36} />
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-semibold text-ink">{contact.fullName}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function ErrorText({ error }: { error: string | null }) {
  return (
    <p role="alert" className={cn("text-center text-sm text-danger", !error && "sr-only")}>
      {error}
    </p>
  );
}
