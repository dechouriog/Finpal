import { Briefcase, Cake, Mail, MapPin, type LucideIcon } from "lucide-react";
import { FinpalLogo } from "@/components/brand/FinpalLogo";
import { Avatar } from "@/components/common/Avatar";
import { DemoUserSwitcher } from "@/components/profile/DemoUserSwitcher";
import { ResetDemoButton } from "@/components/profile/ResetDemoButton";
import { DISCLAIMER } from "@/lib/brand";
import { listDemoUsers } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { formatCents } from "@/lib/utils";

export default async function ProfilePage() {
  const [user, users] = await Promise.all([getCurrentUser(), listDemoUsers()]);

  const details: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Mail, label: "Email", value: user.email },
    { icon: Briefcase, label: "Work", value: user.occupation },
    { icon: MapPin, label: "City", value: user.city },
    { icon: Cake, label: "Age", value: String(user.age) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink @3xl/app:text-3xl">Profile</h1>

      <section className="flex items-center gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
        <Avatar name={user.name} color={user.avatarColor} size={64} />
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-extrabold text-ink">{user.fullName}</p>
          <p className="text-sm text-muted">{user.handle}</p>
          <p className="mt-1 text-sm font-semibold text-navy tabular">Balance {formatCents(user.balanceCents)}</p>
        </div>
      </section>

      <div className="grid gap-6 @3xl/app:grid-cols-2">
        <section aria-labelledby="details-heading" className="rounded-2xl bg-surface p-5 ring-1 ring-line">
          <h2 id="details-heading" className="font-display text-base font-bold">
            Your details
          </h2>
          <dl className="mt-2 divide-y divide-line">
            {details.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-3">
                <Icon className="size-4 text-muted" aria-hidden />
                <dt className="w-16 text-sm text-muted">{label}</dt>
                <dd className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="demo-heading" className="space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
          <div>
            <h2 id="demo-heading" className="font-display text-base font-bold">
              Demo user
            </h2>
            <p className="mt-1 text-sm text-muted">Switch accounts to try sending and requesting money.</p>
          </div>
          <DemoUserSwitcher users={users} currentId={user.id} />
          <div className="border-t border-line pt-4">
            <ResetDemoButton />
          </div>
        </section>
      </div>

      <section aria-labelledby="about-heading" className="rounded-2xl bg-surface p-5 ring-1 ring-line">
        <div className="flex items-center justify-between gap-4">
          <h2 id="about-heading" className="font-display text-base font-bold">
            About
          </h2>
          <FinpalLogo size={22} />
        </div>
        <p className="mt-2 text-sm text-muted">{DISCLAIMER}</p>
      </section>
    </div>
  );
}
