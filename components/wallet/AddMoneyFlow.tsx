"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { SuccessCheck } from "@/components/common/SuccessCheck";
import { PayPalCheckout, type CaptureResult } from "@/components/paypal/PayPalCheckout";
import { Button } from "@/components/ui/button";
import { amountToCents, isAmountInput } from "@/lib/money";
import { cn, formatCents } from "@/lib/utils";
import { AmountCents } from "@/lib/validation";

const PRESETS = [25_00, 50_00, 100_00];

type Status = "idle" | "processing" | "success";

export function AddMoneyFlow({ balanceCents }: { balanceCents: number }) {
  const router = useRouter();
  const [preset, setPreset] = useState<number | "custom">(50_00);
  const [custom, setCustom] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const customId = useId();

  const amountCents = preset === "custom" ? amountToCents(custom) : preset;
  const amountCheck = AmountCents.safeParse(amountCents);
  const amountError = preset === "custom" && custom !== "" && !amountCheck.success ? amountCheck.error.issues[0]?.message : null;

  const onSuccess = (r: CaptureResult) => {
    setResult(r);
    setStatus("success");
    router.refresh();
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-surface p-5 ring-1 ring-line @3xl/app:p-7">
      <AnimatePresence mode="wait" initial={false}>
        {status === "success" && result ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center py-6 text-center"
            role="status"
          >
            <SuccessCheck />
            <h2 className="mt-5 font-display text-2xl font-extrabold text-ink">Money added!</h2>
            <p className="mt-1 text-sm text-muted">
              {formatCents(result.amountCents)} from PayPal is in your Finpal balance.
            </p>
            <p className="mt-4 rounded-full bg-navy-soft px-4 py-1.5 text-sm font-semibold text-navy tabular">
              New balance {formatCents(result.balanceCents)}
            </p>
            <div className="mt-6 flex w-full flex-col gap-2 @md/app:flex-row @md/app:justify-center">
              <Button asChild variant="navy" size="lg">
                <Link href="/">Done</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setStatus("idle");
                  setResult(null);
                }}
              >
                Add more
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
            <div>
              <p className="text-sm text-muted">Current balance</p>
              <p className="font-display text-xl font-extrabold text-ink tabular">{formatCents(balanceCents)}</p>
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-ink">How much do you want to add?</legend>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <Chip key={p} active={preset === p} onClick={() => setPreset(p)}>
                    {formatCents(p).replace(".00", "")}
                  </Chip>
                ))}
                <Chip active={preset === "custom"} onClick={() => setPreset("custom")}>
                  Custom
                </Chip>
              </div>
            </fieldset>

            {preset === "custom" && (
              <div>
                <label htmlFor={customId} className="text-sm font-medium text-ink">
                  Custom amount (USD)
                </label>
                <div className="mt-1 flex h-12 items-center rounded-xl bg-bg px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-teal">
                  <span className="font-display text-lg font-bold text-muted">$</span>
                  <input
                    id={customId}
                    inputMode="decimal"
                    autoFocus
                    placeholder="0.00"
                    value={custom}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, "");
                      if (isAmountInput(v)) setCustom(v);
                    }}
                    aria-invalid={!!amountError}
                    className="ml-1 w-full bg-transparent font-display text-lg font-bold text-ink tabular focus:outline-none"
                  />
                </div>
                {amountError && <p className="mt-1 text-xs text-danger">{amountError}</p>}
              </div>
            )}

            <div className="rounded-2xl bg-bg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">You&apos;ll add</span>
                <span className="font-display text-lg font-extrabold text-ink tabular">
                  {amountCheck.success ? formatCents(amountCents) : "—"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">Pay with PayPal. You&apos;ll log in on PayPal&apos;s sandbox, never on Finpal.</p>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
                {error}
              </p>
            )}

            <PayPalCheckout
              amountCents={amountCents}
              disabled={!amountCheck.success || status === "processing"}
              onProcessing={() => {
                setError(null);
                setStatus("processing");
              }}
              onSuccess={onSuccess}
              onError={(m) => {
                setError(m);
                setStatus("idle");
              }}
              onCancel={() => setStatus("idle")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === "processing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 grid place-items-center bg-surface/90 backdrop-blur-sm"
            role="status"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="size-8 animate-spin text-teal" aria-hidden />
              <p className="font-display text-lg font-bold text-ink">Funding with PayPal…</p>
              <p className="text-sm text-muted">Confirming your payment with PayPal.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-11 rounded-full text-sm font-bold ring-1 transition-colors",
        active ? "bg-navy text-white ring-navy" : "bg-surface text-ink ring-line hover:bg-bg",
      )}
    >
      {children}
    </button>
  );
}
