"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { buyAsset, sellAsset } from "@/app/actions/invest";
import { SuccessCheck } from "@/components/common/SuccessCheck";
import { Button } from "@/components/ui/button";
import { arrowKeyNav } from "@/lib/a11y";
import { amountToCents, centsToInput, isAmountInput } from "@/lib/money";
import { cn, formatCents } from "@/lib/utils";
import { AmountCents } from "@/lib/validation";

type Side = "buy" | "sell";

export function TradePanel({
  assetId,
  assetName,
  priceCents,
  cashCents,
  positionValueCents,
}: {
  assetId: string;
  assetName: string;
  priceCents: number;
  cashCents: number;
  positionValueCents: number;
}) {
  const router = useRouter();
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const [sellAll, setSellAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ side: Side; cents: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const inputId = useId();

  const cents = sellAll ? positionValueCents : amountToCents(amount);
  const limit = side === "buy" ? cashCents : positionValueCents;
  const shares = cents / priceCents;

  const submit = () => {
    const check = AmountCents.safeParse(cents);
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Enter an amount.");
    if (cents > limit) {
      return setError(
        side === "buy" ? `You only have ${formatCents(cashCents)} in cash.` : `You own ${formatCents(positionValueCents)} of this asset.`,
      );
    }
    setError(null);
    startTransition(async () => {
      const input = { assetId, amountCents: cents, all: side === "sell" && sellAll };
      const res = side === "buy" ? await buyAsset(input) : await sellAsset(input);
      if (!res.ok) return setError(res.error);
      setDone({ side, cents });
      setAmount("");
      setSellAll(false);
      router.refresh();
    });
  };

  return (
    <section aria-label="Buy or sell" className="rounded-3xl bg-surface p-5 ring-1 ring-line">
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-4 text-center"
            role="status"
          >
            <SuccessCheck size={72} />
            <p className="mt-4 font-display text-xl font-extrabold text-ink">
              {done.side === "buy" ? "Order filled" : "Sold"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {done.side === "buy" ? "You bought" : "You sold"} {formatCents(done.cents)} of {assetName}.
            </p>
            <Button variant="outline" className="mt-5" onClick={() => setDone(null)}>
              New order
            </Button>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }} className="space-y-4">
            <div
              role="tablist"
              aria-label="Order side"
              onKeyDown={arrowKeyNav(["buy", "sell"] as const, side, (s) => {
                setSide(s);
                setError(null);
                setSellAll(false);
              })}
              className="grid grid-cols-2 rounded-full bg-bg p-1 ring-1 ring-line">
              {(["buy", "sell"] as const).map((s) => (
                <button
                  key={s}
                  role="tab"
                  type="button"
                  aria-selected={side === s}
                  tabIndex={side === s ? 0 : -1}
                  disabled={s === "sell" && positionValueCents === 0}
                  onClick={() => {
                    setSide(s);
                    setError(null);
                    setSellAll(false);
                  }}
                  className={cn(
                    "h-9 rounded-full text-sm font-semibold transition-colors disabled:opacity-40",
                    side === s ? (s === "buy" ? "bg-teal text-deep" : "bg-navy text-white") : "text-muted hover:text-ink",
                  )}
                >
                  {s === "buy" ? "Buy" : "Sell"}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor={inputId} className="text-sm font-semibold text-ink">
                Amount (USD)
              </label>
              <div className="mt-1 flex h-12 items-center rounded-xl bg-bg px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-teal">
                <span className="font-display text-lg font-bold text-muted">$</span>
                <input
                  id={inputId}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={sellAll ? centsToInput(positionValueCents) : amount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, "");
                    if (isAmountInput(v)) setAmount(v);
                    setSellAll(false);
                    setError(null);
                  }}
                  className="ml-1 w-full bg-transparent font-display text-lg font-bold text-ink tabular focus:outline-none"
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted">
                <span>{side === "buy" ? `Cash available ${formatCents(cashCents)}` : `You own ${formatCents(positionValueCents)}`}</span>
                {side === "sell" && positionValueCents > 0 && (
                  <button type="button" onClick={() => setSellAll(true)} className="font-semibold text-teal-ink hover:underline">
                    Sell all
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between rounded-xl bg-bg px-3 py-2.5 text-sm">
              <span className="text-muted">Estimated shares</span>
              <span className="font-semibold text-ink tabular">{cents > 0 ? shares.toFixed(4) : "—"}</span>
            </div>

            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}

            <Button size="lg" variant={side === "buy" ? "primary" : "navy"} className="w-full" onClick={submit} disabled={pending || cents === 0}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {side === "buy" ? "Buy" : "Sell"} {cents > 0 ? formatCents(cents) : ""}
            </Button>
            <p className="text-center text-xs text-muted">Orders fill instantly at the fixed demo price.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
