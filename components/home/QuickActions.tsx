import Link from "next/link";
import { ArrowDownLeft, ArrowUpFromLine, ArrowUpRight, Plus, type LucideIcon } from "lucide-react";

const ACTIONS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/payments?mode=send", label: "Send", icon: ArrowUpRight },
  { href: "/payments?mode=request", label: "Request", icon: ArrowDownLeft },
  { href: "/add-money", label: "Add", icon: Plus },
  { href: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
];

export function QuickActions() {
  return (
    <nav aria-label="Quick actions">
      <ul className="grid grid-cols-4 gap-2">
        {ACTIONS.map(({ href, label, icon: Icon }) => (
          <li key={label}>
            <Link href={href} className="group flex flex-col items-center gap-2 rounded-2xl py-1">
              <span className="grid size-14 place-items-center rounded-full bg-surface text-navy shadow-sm ring-1 ring-line transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:ring-teal">
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="text-xs font-semibold text-ink">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
