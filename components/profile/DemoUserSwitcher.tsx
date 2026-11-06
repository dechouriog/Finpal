"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { switchDemoUser } from "@/app/actions/demo";
import { Avatar } from "@/components/common/Avatar";
import { cn, formatCents } from "@/lib/utils";

type DemoUser = {
  id: string;
  name: string;
  occupation: string;
  avatarColor: string;
  balanceCents: number;
};

export function DemoUserSwitcher({ users, currentId }: { users: DemoUser[]; currentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const select = (id: string) => {
    if (id === currentId) return;
    setTarget(id);
    setError(null);
    startTransition(async () => {
      const res = await switchDemoUser(id);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  };

  return (
    <div>
      <div role="radiogroup" aria-label="Demo user" className="grid gap-2 @lg/app:grid-cols-3">
        {users.map((u) => {
          const active = u.id === currentId;
          const loading = pending && target === u.id;
          return (
            <button
              key={u.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => select(u.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl p-3 text-left ring-1 transition-colors disabled:cursor-wait",
                active ? "bg-teal-soft ring-teal" : "bg-surface ring-line hover:bg-bg",
              )}
            >
              <Avatar name={u.name} color={u.avatarColor} size={38} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{u.name}</span>
                <span className="block truncate text-xs text-muted">
                  {u.occupation} · {formatCents(u.balanceCents)}
                </span>
              </span>
              {loading ? (
                <Loader2 className="size-4 animate-spin text-muted" aria-hidden />
              ) : active ? (
                <Check className="size-4 text-teal-ink" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
