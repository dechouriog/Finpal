import { PaymentFlow, type Contact } from "@/components/payments/PaymentFlow";
import { RequestsPanel, type RequestItem } from "@/components/payments/RequestsPanel";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const personSelect = { name: true, fullName: true, avatarColor: true } as const;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const user = await getCurrentUser();

  const [others, incoming, outgoing] = await Promise.all([
    prisma.user.findMany({
      // Isolation: only users in the signed-in user's own space.
      where: { spaceId: user.spaceId, id: { not: user.id } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, fullName: true, handle: true, avatarColor: true },
    }),
    prisma.moneyRequest.findMany({
      where: { payerId: user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { requester: { select: personSelect } },
    }),
    prisma.moneyRequest.findMany({
      where: { requesterId: user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { payer: { select: personSelect } },
    }),
  ]);

  const contacts: Contact[] = others;

  const toItem = (
    r: { id: string; amountCents: number; note: string | null; createdAt: Date },
    person: RequestItem["person"],
  ): RequestItem => ({ id: r.id, amountCents: r.amountCents, note: r.note, createdAt: r.createdAt.toISOString(), person });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink @3xl/app:text-3xl">Payments</h1>
      <div className="grid items-start gap-6 @3xl/app:grid-cols-5">
        <div className="@3xl/app:col-span-3">
          <PaymentFlow
            // Remount when the user switches, so a half-finished flow doesn't leak across accounts.
            key={`${user.id}-${mode ?? "send"}`}
            initialMode={mode === "request" ? "request" : "send"}
            contacts={contacts}
            balanceCents={user.balanceCents}
          />
        </div>
        <div className="@3xl/app:col-span-2">
          <RequestsPanel
            incoming={incoming.map((r) => toItem(r, r.requester))}
            outgoing={outgoing.map((r) => toItem(r, r.payer))}
          />
        </div>
      </div>
    </div>
  );
}
