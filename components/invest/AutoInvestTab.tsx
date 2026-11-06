"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteAutoInvestPlan, saveAutoInvestPlan } from "@/app/actions/invest";
import { Sheet } from "@/components/common/Sheet";
import { Button } from "@/components/ui/button";
import { amountToCents, isAmountInput } from "@/lib/money";
import { ordinal, shortDate } from "@/lib/schedule";
import { cn, formatCents } from "@/lib/utils";
import { AutoInvestPlanInput } from "@/lib/validation";
import type { PlanRow } from "./types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Auto-invest schedule. Plans are stored as iCal RRULEs (AutoInvestEvent), the
 * same format Bryntum Calendar uses, so the calendar view can be swapped for
 * Bryntum without touching the data. See README > Auto-invest.
 */
export function AutoInvestTab({ plans }: { plans: PlanRow[] }) {
  const [editing, setEditing] = useState<PlanRow | "new" | null>(null);

  return (
    <div className="grid items-start gap-6 @3xl/app:grid-cols-5">
      <div className="@3xl/app:col-span-3">
        <MonthCalendar plans={plans} />
      </div>
      <section aria-labelledby="plans-heading" className="space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-line @3xl/app:col-span-2">
        <div className="flex items-center justify-between">
          <h2 id="plans-heading" className="font-display text-base font-bold text-ink">
            Your plans
          </h2>
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden /> New plan
          </Button>
        </div>
        {plans.length === 0 ? (
          <p className="rounded-xl bg-bg p-4 text-sm text-muted">
            No recurring investments yet. Ask Finpal AI to set one up, or create a plan.
          </p>
        ) : (
          <ul className="space-y-2">
            {plans.map((p) => (
              <li key={p.id} className="rounded-xl bg-bg p-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-teal-soft text-teal-ink">
                    <CalendarClock className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{formatCents(p.amountCents)} · {p.description}</p>
                    <p className="text-xs text-muted">
                      Next: {p.nextRuns.slice(0, 2).map((d) => shortDate.format(new Date(d))).join(", ") || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    aria-label={`Edit ${p.name}`}
                    className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">Each run buys your current mix from your Finpal balance.</p>
      </section>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New Auto-invest plan" : "Edit plan"}
        panelWidth={400}
      >
        {editing !== null && (
          <PlanEditor key={editing === "new" ? "new" : editing.id} plan={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
        )}
      </Sheet>
    </div>
  );
}

function MonthCalendar({ plans }: { plans: PlanRow[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => ({ y: today.getUTCFullYear(), m: today.getUTCMonth() }));

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
    const dim = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
    const lead = first.getUTCDay();
    const todayKey = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const out: ({ day: number; amountCents: number; isToday: boolean; past: boolean } | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= dim; d++) {
      const key = Date.UTC(cursor.y, cursor.m, d);
      let amount = 0;
      if (key >= todayKey) {
        for (const p of plans) {
          const hits = new Set(p.days.map((x) => Math.min(x, dim)));
          if (hits.has(d)) amount += p.amountCents;
        }
      }
      out.push({ day: d, amountCents: amount, isToday: key === todayKey, past: key < todayKey });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, plans]);

  const monthTotal = cells.reduce((s, c) => s + (c?.amountCents ?? 0), 0);
  const shift = (delta: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(Date.UTC(y, m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });

  return (
    <section aria-label="Auto-invest calendar" className="rounded-2xl bg-surface p-5 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">{monthFmt.format(new Date(Date.UTC(cursor.y, cursor.m, 1)))}</h2>
          <p className="text-xs text-muted tabular">Scheduled this month: {formatCents(monthTotal)}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="grid size-9 place-items-center rounded-full ring-1 ring-line hover:bg-bg">
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="grid size-9 place-items-center rounded-full ring-1 ring-line hover:bg-bg">
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[11px] font-semibold uppercase text-muted">
            {w}
          </div>
        ))}
        {cells.map((c, i) =>
          c ? (
            <div
              key={i}
              className={cn(
                "flex aspect-square flex-col items-center justify-start rounded-xl p-1 text-xs",
                c.amountCents ? "bg-teal-soft" : "bg-bg",
                c.past && "opacity-50",
                c.isToday && "ring-2 ring-navy",
              )}
            >
              <span className={cn("font-semibold", c.isToday ? "text-navy" : "text-ink")}>{c.day}</span>
              {c.amountCents > 0 && (
                <span className="mt-auto w-full truncate rounded-md bg-teal px-0.5 text-[10px] font-bold text-deep tabular">
                  {formatCents(c.amountCents).replace(".00", "")}
                </span>
              )}
            </div>
          ) : (
            <div key={i} />
          ),
        )}
      </div>
    </section>
  );
}

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

function PlanEditor({ plan, onDone }: { plan: PlanRow | null; onDone: () => void }) {
  const router = useRouter();
  const [amount, setAmount] = useState(plan ? (plan.amountCents / 100).toFixed(2) : "50");
  const [days, setDays] = useState<number[]>(plan?.days ?? [15, 30]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));

  const save = () => {
    const input = { id: plan?.id, amountCents: amountToCents(amount), days };
    const parsed = AutoInvestPlanInput.safeParse(input);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the form.");
    setError(null);
    startTransition(async () => {
      const res = await saveAutoInvestPlan(input);
      if (!res.ok) return setError(res.error);
      router.refresh();
      onDone();
    });
  };

  const remove = () => {
    if (!plan) return;
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => {
      const res = await deleteAutoInvestPlan(plan.id);
      if (!res.ok) return setError(res.error);
      router.refresh();
      onDone();
    });
  };

  return (
    <div className="space-y-5 p-5">
      <div>
        <label htmlFor="plan-amount" className="text-sm font-semibold text-ink">
          Amount each time (USD)
        </label>
        <div className="mt-1 flex h-12 items-center rounded-xl bg-bg px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-teal">
          <span className="font-display text-lg font-bold text-muted">$</span>
          <input
            id="plan-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d.]/g, "");
              if (isAmountInput(v)) setAmount(v);
            }}
            className="ml-1 w-full bg-transparent font-display text-lg font-bold text-ink tabular focus:outline-none"
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-ink">Days of the month</legend>
        <p className="text-xs text-muted">
          {days.length ? `Runs on the ${days.map(ordinal).join(", ")}` : "Pick up to 4 days, e.g. your paydays."}
        </p>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days.includes(d)}
              onClick={() => toggleDay(d)}
              className={cn(
                "h-9 rounded-lg text-xs font-semibold ring-1 transition-colors",
                days.includes(d) ? "bg-teal text-deep ring-teal" : "bg-surface text-ink ring-line hover:bg-bg",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {plan && (
          <Button variant={confirmDelete ? "danger" : "outline"} onClick={remove} disabled={pending}>
            <Trash2 className="size-4" aria-hidden />
            {confirmDelete ? "Confirm" : "Delete"}
          </Button>
        )}
        <Button className="flex-1" onClick={save} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save plan
        </Button>
      </div>
    </div>
  );
}
