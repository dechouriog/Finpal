import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type PagePlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  step: number;
  children?: ReactNode;
};

/** Temporary screen body until the real feature lands in its build step. */
export function PagePlaceholder({ title, description, icon: Icon, step, children }: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink @3xl/app:text-3xl">{title}</h1>
      <section className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-6 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-teal-soft text-teal">
          <Icon className="size-7" aria-hidden />
        </span>
        <p className="mt-4 max-w-sm text-sm text-muted">{description}</p>
        <span className="mt-4 rounded-full bg-navy-soft px-3 py-1 text-xs font-semibold text-navy">
          Coming in build step {step}
        </span>
      </section>
      {children}
    </div>
  );
}
