"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Friendly recovery screen for any error inside a page. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-navy-soft text-navy">
        <RotateCcw className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-2xl font-extrabold text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        Your money is safe: nothing moves without your confirmation. Try again, or go back to Home.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted">Error ID: {error.digest}</p>}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
