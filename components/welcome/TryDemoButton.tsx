"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { startDemo } from "@/app/actions/demo";
import { Button } from "@/components/ui/button";

export function TryDemoButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="w-full space-y-3">
      <Button
        size="lg"
        className="h-14 w-full text-base"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await startDemo();
            if (res && !res.ok) setError(res.error);
          });
        }}
      >
        {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
        {pending ? "Setting up your demo…" : "Try the demo"}
        {!pending && <ArrowRight className="size-5" aria-hidden />}
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
