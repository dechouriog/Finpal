"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Inbox, Loader2 } from "lucide-react";
import { closeRequest, payRequest } from "@/app/actions/payments";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/utils";

export type RequestItem = {
  id: string;
  amountCents: number;
  note: string | null;
  createdAt: string; // ISO
  person: { name: string; fullName: string; avatarColor: string };
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function RequestsPanel({ incoming, outgoing }: { incoming: RequestItem[]; outgoing: RequestItem[] }) {
  return (
    <section aria-labelledby="requests-heading" className="space-y-4 rounded-3xl bg-surface p-5 ring-1 ring-line">
      <h2 id="requests-heading" className="font-display text-base font-bold text-ink">
        Requests
      </h2>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">For you to pay</h3>
        {incoming.length === 0 ? (
          <Empty text="No one is waiting on you." />
        ) : (
          <ul className="mt-2 space-y-2">
            <AnimatePresence initial={false}>
              {incoming.map((r) => (
                <RequestRow key={r.id} item={r} kind="incoming" />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">You requested</h3>
        {outgoing.length === 0 ? (
          <Empty text="No open requests." />
        ) : (
          <ul className="mt-2 space-y-2">
            <AnimatePresence initial={false}>
              {outgoing.map((r) => (
                <RequestRow key={r.id} item={r} kind="outgoing" />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}

function RequestRow({ item, kind }: { item: RequestItem; kind: "incoming" | "outgoing" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"pay" | "close" | null>(null);
  const [confirmPay, setConfirmPay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmPay) return;
    const t = setTimeout(() => setConfirmPay(false), 4000);
    return () => clearTimeout(t);
  }, [confirmPay]);

  const run = (which: "pay" | "close") => {
    setAction(which);
    setError(null);
    startTransition(async () => {
      const res = which === "pay" ? await payRequest(item.id) : await closeRequest(item.id);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-2xl bg-bg p-3"
    >
      <div className="flex items-center gap-3">
        <Avatar name={item.person.name} color={item.person.avatarColor} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {kind === "incoming" ? `${item.person.name} requested` : `To ${item.person.name}`}
          </p>
          <p className="truncate text-xs text-muted">
            {item.note ? `${item.note} · ` : ""}
            {dateFmt.format(new Date(item.createdAt))}
          </p>
        </div>
        <p className="font-display text-base font-extrabold text-ink tabular">{formatCents(item.amountCents)}</p>
      </div>

      <div className="mt-3 flex gap-2">
        {kind === "incoming" ? (
          <>
            <Button
              size="sm"
              variant={confirmPay ? "navy" : "primary"}
              className="flex-1"
              disabled={pending}
              onClick={() => (confirmPay ? (setConfirmPay(false), run("pay")) : setConfirmPay(true))}
            >
              {pending && action === "pay" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              {confirmPay ? `Confirm ${formatCents(item.amountCents)}` : "Pay"}
            </Button>
            <Button size="sm" variant="outline" className="flex-1" disabled={pending} onClick={() => run("close")}>
              {pending && action === "close" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Decline
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="flex-1" disabled={pending} onClick={() => run("close")}>
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Cancel request
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </motion.li>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="mt-2 flex items-center gap-2 rounded-2xl bg-bg px-3 py-3 text-sm text-muted">
      <Inbox className="size-4" aria-hidden />
      {text}
    </p>
  );
}
