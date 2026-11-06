"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { resetDemoData } from "@/app/actions/demo";
import { Button } from "@/components/ui/button";

/** Two-tap reset: first tap asks for confirmation, second tap resets. */
export function ResetDemoButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  const onClick = () => {
    if (!confirming) {
      setConfirming(true);
      setMessage(null);
      return;
    }
    setConfirming(false);
    startTransition(async () => {
      const res = await resetDemoData();
      setMessage(res.ok ? { ok: true, text: "Demo data restored." } : { ok: false, text: res.error });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant={confirming ? "danger" : "outline"} onClick={onClick} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
        {pending ? "Resetting…" : confirming ? "Tap again to confirm" : "Reset demo data"}
      </Button>
      <p aria-live="polite" className={message?.ok === false ? "text-sm text-danger" : "text-sm text-success"}>
        {message?.text}
      </p>
    </div>
  );
}
