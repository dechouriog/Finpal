"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { withdrawToPayPal } from "@/app/actions/wallet";
import { SuccessCheck } from "@/components/common/SuccessCheck";
import { Button } from "@/components/ui/button";
import { amountToCents, isAmountInput } from "@/lib/money";
import { formatCents } from "@/lib/utils";
import { WithdrawInput } from "@/lib/validation";

type Step = "form" | "review" | "done";

export function WithdrawFlow({ balanceCents }: { balanceCents: number }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ batchId: string; status: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const amountId = useId();
  const emailId = useId();

  const cents = amountToCents(amount);

  const review = () => {
    const parsed = WithdrawInput.safeParse({ amountCents: cents, receiverEmail: email.trim() });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the form.");
    if (cents > balanceCents) return setError(`You only have ${formatCents(balanceCents)} available.`);
    setError(null);
    setStep("review");
  };

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await withdrawToPayPal({ amountCents: cents, receiverEmail: email.trim() });
      if (res.ok) {
        setBatch({ batchId: res.batchId, status: res.status });
        setStep("done");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-line @3xl/app:p-7">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {step === "form" && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                review();
              }}
            >
              <div>
                <label htmlFor={amountId} className="text-sm font-semibold text-ink">
                  Amount (USD)
                </label>
                <div className="mt-1 flex h-14 items-center rounded-xl bg-bg px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-teal">
                  <span className="font-display text-2xl font-bold text-muted">$</span>
                  <input
                    id={amountId}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, "");
                      if (isAmountInput(v)) setAmount(v);
                      setError(null);
                    }}
                    className="ml-1 w-full bg-transparent font-display text-2xl font-extrabold text-ink tabular focus:outline-none"
                  />
                </div>
                <p className="mt-1 flex justify-between text-xs text-muted">
                  <span>Available {formatCents(balanceCents)}</span>
                  <button
                    type="button"
                    className="font-semibold text-teal-ink hover:underline"
                    onClick={() => setAmount((balanceCents / 100).toFixed(2))}
                  >
                    Withdraw all
                  </button>
                </p>
              </div>

              <div>
                <label htmlFor={emailId} className="text-sm font-semibold text-ink">
                  PayPal sandbox account email
                </label>
                <input
                  id={emailId}
                  type="email"
                  autoComplete="off"
                  placeholder="sb-xxxxx@personal.example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="mt-1 h-12 w-full rounded-xl bg-bg px-3 text-sm text-ink ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal"
                />
                <p className="mt-1 text-xs text-muted">Money is sent with PayPal Payouts on the sandbox.</p>
              </div>

              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={cents === 0 || !email}>
                Review
              </Button>
            </form>
          )}

          {step === "review" && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-bg p-5 text-center">
                <p className="text-sm text-muted">You&apos;re withdrawing</p>
                <p className="mt-1 font-display text-4xl font-extrabold tracking-tight text-ink tabular">
                  {formatCents(cents)}
                </p>
                <p className="mt-1 truncate text-sm text-muted">
                  to <span className="font-semibold text-ink">{email.trim()}</span>
                </p>
              </div>
              <dl className="divide-y divide-line text-sm">
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted">From</dt>
                  <dd className="font-medium text-ink">Finpal balance</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted">Balance after</dt>
                  <dd className="font-medium text-ink tabular">{formatCents(balanceCents - cents)}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted">Sent with</dt>
                  <dd className="font-medium text-ink">PayPal Payouts (sandbox)</dd>
                </div>
              </dl>
              {error && (
                <p role="alert" className="text-center text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="lg" onClick={() => setStep("form")} disabled={pending}>
                  Back
                </Button>
                <Button size="lg" className="flex-1" onClick={confirm} disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  {pending ? "Sending…" : `Withdraw ${formatCents(cents)}`}
                </Button>
              </div>
            </div>
          )}

          {step === "done" && batch && (
            <div className="flex flex-col items-center py-6 text-center" role="status">
              <SuccessCheck />
              <h2 className="mt-5 font-display text-2xl font-extrabold text-ink">Withdrawal sent!</h2>
              <p className="mt-1 text-sm text-muted">
                {formatCents(cents)} is on its way to {email.trim()}.
              </p>
              <p className="mt-3 text-xs text-muted">
                PayPal payout batch <span className="font-mono">{batch.batchId}</span> ·{" "}
                {batch.status === "COMPLETED" ? "completed" : "processing"}
              </p>
              <Button asChild variant="navy" size="lg" className="mt-6">
                <Link href="/">Done</Link>
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
