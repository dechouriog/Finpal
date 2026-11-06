"use client";

import { useTransition } from "react";
import { Loader2, LogOut } from "lucide-react";
import { logOut } from "@/app/actions/demo";
import { Button } from "@/components/ui/button";

export function LogOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-1">
      <Button variant="ghost" disabled={pending} onClick={() => startTransition(() => logOut())}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogOut className="size-4" aria-hidden />}
        Log out
      </Button>
      <p className="text-xs text-muted">Logging out ends this demo. You can start a new one anytime.</p>
    </div>
  );
}
