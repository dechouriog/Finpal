import type { Metadata } from "next";
import Link from "next/link";
import { FinpalMark } from "@/components/brand/FinpalLogo";
import { Avatar } from "@/components/common/Avatar";
import { AskAiBanner } from "@/components/home/AskAiBanner";
import { BalanceCard } from "@/components/home/BalanceCard";
import { Greeting } from "@/components/home/Greeting";
import { InvestCard } from "@/components/home/InvestCard";
import { PalWelcomeCard } from "@/components/pal/PalWelcomeCard";
import { QuickActions } from "@/components/home/QuickActions";
import { RecentActivity } from "@/components/home/RecentActivity";
import { getPortfolioSummary, getRecentTransactions } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const user = await getCurrentUser();
  const [recent, portfolio] = await Promise.all([getRecentTransactions(user.id, 5), getPortfolioSummary(user.id)]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/profile" aria-label="Open profile" className="rounded-full">
          <Avatar name={user.name} color={user.avatarColor} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            <Greeting />
          </p>
          <h1 className="truncate font-display text-xl font-extrabold tracking-tight text-ink @3xl/app:text-2xl">
            {user.name}
          </h1>
        </div>
        <FinpalMark size={36} className="@3xl/app:hidden" />
      </header>

      <PalWelcomeCard userId={user.id} name={user.name} />

      <div className="grid grid-cols-1 gap-6 @3xl/app:grid-cols-5">
        <div className="space-y-6 @3xl/app:col-span-3">
          <BalanceCard balanceCents={user.balanceCents} />
          <QuickActions />
          <AskAiBanner />
        </div>
        <div className="space-y-6 @3xl/app:col-span-2">
          <InvestCard valueCents={portfolio.valueCents} positionCount={portfolio.positionCount} />
          <RecentActivity transactions={recent} />
        </div>
      </div>
    </div>
  );
}
