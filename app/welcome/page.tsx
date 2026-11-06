import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, ShieldCheck, Sparkles } from "lucide-react";
import { FinpalLogo } from "@/components/brand/FinpalLogo";
import { TryDemoButton } from "@/components/welcome/TryDemoButton";
import { DISCLAIMER } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome" };

const POINTS = [
  { icon: Sparkles, title: "A guide, not a broker", body: "Pal, your investing buddy, learns your goals and explains every step in plain language." },
  { icon: ShieldCheck, title: "Safety net first", body: "Three months of expenses stay in cash before anything is invested." },
  { icon: CalendarClock, title: "Small and steady", body: "Start with what's ready today and add a little every payday." },
];

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ expired?: string; code?: string }> }) {
  const { expired, code } = await searchParams;
  const userId = await getSessionUserId();
  if (userId && (await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) redirect("/");

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center py-6 text-center @3xl/app:py-12">
      <FinpalLogo size={44} />
      <h1 className="mt-8 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink @3xl/app:text-4xl">
        Make your savings work, one safe step at a time
      </h1>
      <p className="mt-3 text-base text-muted">
        Finpal is a wallet with an AI guide that helps you invest idle savings, funded with PayPal.
      </p>

      {code === "rate_limited" && (
        <p role="alert" className="mt-5 w-full rounded-xl bg-danger/10 p-3 text-sm text-danger">
          You&apos;ve started several demos recently. Please try again in an hour.
        </p>
      )}

      {expired && (
        <p role="status" className="mt-5 w-full rounded-xl bg-navy-soft p-3 text-sm text-navy">
          Your previous demo has ended. Start a fresh one below.
        </p>
      )}

      <ul className="mt-8 w-full space-y-3 text-left">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-soft text-teal-ink">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">{title}</span>
              <span className="block text-sm text-muted">{body}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 w-full">
        <TryDemoButton />
        <p className="mt-3 text-xs text-muted">
          No sign-up. You get your own private demo account with Laura&apos;s story. Test money only, on the PayPal
          Sandbox.
        </p>
      </div>

      <p className="mt-10 text-[11px] leading-relaxed text-muted">{DISCLAIMER}</p>
    </div>
  );
}
