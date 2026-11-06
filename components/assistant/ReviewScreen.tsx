"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CalendarClock, Loader2 } from "lucide-react";
import { confirmStarterPortfolio } from "@/app/actions/invest";
import { Pal } from "@/components/pal/Pal";
import { usePalStage } from "@/components/pal/PalStageContext";
import type { PalStage } from "@/lib/pal";
import { Donut } from "@/components/invest/Donut";
import { PayPalCheckout } from "@/components/paypal/PayPalCheckout";
import { Button } from "@/components/ui/button";
import type { ReviewCard } from "@/lib/assistant/cards";
import { shortDate } from "@/lib/schedule";
import { cn, formatCents } from "@/lib/utils";
import { AllocationLegend } from "./Cards";

type Phase = "review" | "paypal" | "working" | "done";

/**
 * Final human-in-the-loop step. The assistant only prepared this proposal; money
 * moves only when the user presses "Confirm & fund" here.
 */
export function ReviewScreen({ card, onClose }: { card: ReviewCard; onClose: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("review");
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase === "done") bodyRef.current?.scrollTo({ top: 0 });
  }, [phase]);
  const [workingLabel, setWorkingLabel] = useState("Placing your investment…");
  const [error, setError] = useState<string | null>(null);
  const [nextRuns, setNextRuns] = useState<string[]>(card.autoInvest?.nextRuns ?? []);
  const currentStage = usePalStage();
  // Stage after this investment; Pal grows right on the success screen.
  const [grown, setGrown] = useState<PalStage | null>(null);
  // Default funding is PayPal. If the balance is short, PayPal covers the difference.
  const [fundWith, setFundWith] = useState<"paypal" | "balance">("paypal");
  const short = card.shortfallCents > 0;
  const paypalCents = short ? card.shortfallCents : fundWith === "paypal" ? card.amountCents : 0;
  // The assistant pre-created an order only for the shortfall case.
  const paypalOrderId = short ? (card.depositOrderId ?? undefined) : undefined;

  const invest = async () => {
    setPhase("working");
    setWorkingLabel("Placing your investment…");
    const res = await confirmStarterPortfolio({
      amountCents: card.amountCents,
      level: card.level,
      autoInvest: card.autoInvest ? { amountCents: card.autoInvest.amountCents, days: card.autoInvest.days } : null,
    });
    if (!res.ok) {
      setError(res.error);
      setPhase("review");
      return;
    }
    if (res.nextRuns.length) setNextRuns(res.nextRuns);
    setGrown(res.stage);
    setPhase("done");
    router.refresh();
  };

  const confirm = () => {
    setError(null);
    if (paypalCents > 0) setPhase("paypal");
    else void invest();
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-10 flex flex-col bg-bg"
      role="dialog"
      aria-label="Review and confirm"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-4 py-3">
        {phase !== "done" && (
          <button
            type="button"
            onClick={onClose}
            disabled={phase === "working"}
            aria-label="Back to chat"
            className="grid size-9 place-items-center rounded-full ring-1 ring-line hover:bg-bg disabled:opacity-40"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </button>
        )}
        <p className="font-display text-base font-extrabold text-ink">{phase === "done" ? "All set" : "Review & confirm"}</p>
      </div>

      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        {phase === "done" ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center pt-4 text-center" role="status">
            <Pal mood="proud" size={160} stage={grown ?? currentStage} />
            <h2 className="mt-2 font-display text-2xl font-extrabold text-ink">You&apos;re invested!</h2>
            <p className="mt-1 text-sm text-muted">
              {formatCents(card.amountCents)} is now in your {card.levelLabel.toLowerCase()} starter portfolio.
            </p>
            <p className="mt-2 text-sm font-semibold text-teal-ink">You&apos;re officially an investor. Slow money, strong money.</p>
            {card.autoInvest && (
              <div className="mt-5 w-full rounded-2xl bg-surface p-4 text-left ring-1 ring-line">
                <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
                  <CalendarClock className="size-4 text-teal-ink" aria-hidden />
                  Auto-invest {formatCents(card.autoInvest.amountCents)} every payday
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {nextRuns.map((d) => (
                    <li key={d} className="rounded-xl bg-teal-soft px-3 py-2 text-sm font-semibold text-teal-ink">
                      {shortDate.format(new Date(d))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 flex w-full flex-col gap-2">
              <Button asChild variant="navy" size="lg" onClick={onClose}>
                <Link href="/invest">See my portfolio</Link>
              </Button>
              <Button variant="outline" size="lg" onClick={onClose}>
                Back to chat
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface p-4 text-center ring-1 ring-line">
              <p className="text-sm text-muted">You&apos;re investing</p>
              <p className="font-display text-4xl font-extrabold tracking-tight text-ink tabular">{formatCents(card.amountCents)}</p>
              <span className="mt-2 inline-block rounded-full bg-navy-soft px-3 py-1 text-xs font-bold text-navy">{card.chip}</span>
            </div>

            <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-line">
              <Donut
                size={140}
                thickness={18}
                segments={card.lines.map((l) => ({ label: l.label, color: l.color, value: l.amountCents }))}
                ariaLabel={card.lines.map((l) => `${l.label} ${l.weight}%`).join(", ")}
              />
              <AllocationLegend lines={card.lines} />
            </div>

            <fieldset className="space-y-2 rounded-2xl bg-surface p-4 ring-1 ring-line" disabled={phase !== "review"}>
              <legend className="sr-only">Funding source</legend>
              <p className="text-sm font-semibold text-ink">Funding source</p>
              <FundingOption
                checked={short || fundWith === "paypal"}
                onSelect={() => setFundWith("paypal")}
                title="Pay with PayPal"
                detail={
                  short
                    ? `${formatCents(card.shortfallCents)} with PayPal + ${formatCents(card.amountCents - card.shortfallCents)} from your balance`
                    : `${formatCents(card.amountCents)} through the PayPal Sandbox`
                }
              />
              <FundingOption
                checked={!short && fundWith === "balance"}
                disabled={short}
                onSelect={() => setFundWith("balance")}
                title="Finpal balance"
                detail={short ? "Not enough balance for the full amount" : `Available ${formatCents(card.balanceCents)} · funded with PayPal`}
              />
            </fieldset>

            <dl className="divide-y divide-line rounded-2xl bg-surface px-4 text-sm ring-1 ring-line">
              <div className="flex justify-between gap-3 py-3">
                <dt className="text-muted">Auto-invest</dt>
                <dd className="text-right font-medium text-ink">
                  {card.autoInvest ? (
                    <>
                      {formatCents(card.autoInvest.amountCents)} every payday
                      <span className="block text-xs text-muted">
                        {card.autoInvest.nextRuns.slice(0, 2).map((d) => shortDate.format(new Date(d))).join(", ")}, …
                      </span>
                    </>
                  ) : (
                    "Off"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-3">
                <dt className="text-muted">Fees</dt>
                <dd className="font-medium text-ink">None in this demo</dd>
              </div>
            </dl>

            <p className="text-xs text-muted">
              Investing involves risk, including loss of money. Pal offers education, not financial advice.
            </p>

            {error && (
              <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
                {error}
              </p>
            )}

            {phase === "paypal" ? (
              <div className="space-y-2 rounded-2xl bg-surface p-4 ring-1 ring-line">
                <p className="text-sm font-semibold text-ink">Pay {formatCents(paypalCents)} with PayPal to continue</p>
                <PayPalCheckout
                  amountCents={paypalCents}
                  orderId={paypalOrderId}
                  onProcessing={() => {
                    setWorkingLabel("Funding with PayPal…");
                    setPhase("working");
                  }}
                  onSuccess={() => void invest()}
                  onError={(m) => {
                    setError(m);
                    setPhase("paypal");
                  }}
                  onCancel={() => {
                    setPhase("review");
                    setError("Payment cancelled. Nothing was invested and no money was moved.");
                  }}
                  onDeclined={() => {
                    setPhase("paypal");
                    setError("PayPal declined that payment method. Choose another one in the PayPal window.");
                  }}
                  onPending={(m) => {
                    setPhase("review");
                    setError(`${m} You can invest once it shows in your balance.`);
                  }}
                />
              </div>
            ) : (
              <Button size="lg" className="w-full" onClick={confirm} disabled={phase === "working"}>
                Confirm &amp; fund
              </Button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {phase === "working" && (
          // Shown while PayPal captures the payment and the portfolio is placed.
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 grid place-items-center bg-surface/90 backdrop-blur-sm"
            role="status"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 animate-spin text-teal" aria-hidden />
              <p className="font-display text-lg font-bold text-ink">{workingLabel}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FundingOption({
  checked,
  disabled,
  onSelect,
  title,
  detail,
}: {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition-colors",
        checked ? "bg-teal-soft ring-teal" : "bg-bg ring-line hover:bg-navy-soft",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input type="radio" name="funding" checked={checked} disabled={disabled} onChange={onSelect} className="mt-1 accent-[#00806F]" />
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-muted">{detail}</span>
      </span>
    </label>
  );
}
