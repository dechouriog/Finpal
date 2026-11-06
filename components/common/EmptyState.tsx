import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Friendly empty state: one message, one clear action. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-10 text-center ring-1 ring-line">
      <span className="grid size-12 place-items-center rounded-2xl bg-teal-soft text-teal-ink">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="mt-4 font-display text-base font-bold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
