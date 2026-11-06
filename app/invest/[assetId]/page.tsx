import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TradePanel } from "@/components/invest/TradePanel";
import { prisma } from "@/lib/db";
import { ASSET_CATEGORY_META, AssetCategory } from "@/lib/domain";
import { positionValueCents } from "@/lib/portfolio";
import { getCurrentUser } from "@/lib/session";
import { formatCents } from "@/lib/utils";
import { AssetId } from "@/lib/validation";

export async function generateMetadata({ params }: { params: Promise<{ assetId: string }> }): Promise<Metadata> {
  const parsed = AssetId.safeParse((await params).assetId);
  const asset = parsed.success ? await prisma.asset.findUnique({ where: { id: parsed.data }, select: { name: true } }) : null;
  return { title: asset?.name ?? "Asset" };
}

export default async function AssetPage({ params }: { params: Promise<{ assetId: string }> }) {
  const parsed = AssetId.safeParse((await params).assetId);
  if (!parsed.success) notFound();
  const user = await getCurrentUser();
  const asset = await prisma.asset.findUnique({ where: { id: parsed.data } });
  if (!asset) notFound();
  const position = await prisma.position.findUnique({
    where: { userId_assetId: { userId: user.id, assetId: asset.id } },
  });
  const valueCents = position ? positionValueCents(position, asset) : 0;
  const meta = ASSET_CATEGORY_META[AssetCategory.catch("INDEX").parse(asset.category)];

  return (
    <div className="space-y-6">
      <Link href="/invest" className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Invest
      </Link>

      <div className="grid grid-cols-1 items-start gap-6 @3xl/app:grid-cols-5">
        <section className="space-y-5 rounded-3xl bg-surface p-5 ring-1 ring-line @3xl/app:col-span-3 @3xl/app:p-7">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-bg px-3 py-1 text-xs font-semibold text-ink">
              <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
              {meta.label}
            </span>
            <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink @3xl/app:text-3xl">{asset.name}</h1>
            <p className="mt-2 text-sm text-muted">{asset.description}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Fact label="Price" value={formatCents(asset.priceCents)} />
            <Fact label="Shares" value={position && position.shares > 0 ? position.shares.toFixed(4) : "—"} />
            <Fact label="Value" value={formatCents(valueCents)} />
          </div>

          {/* TODO(prices): plug a real market data feed here (quote, daily change, price chart). */}
          <p className="text-xs text-muted">Demo price: fixed and illustrative. Not a real security.</p>
        </section>

        <div className="@3xl/app:col-span-2">
          <TradePanel
            key={`${user.id}-${asset.id}`}
            assetId={asset.id}
            assetName={asset.name}
            priceCents={asset.priceCents}
            cashCents={user.balanceCents}
            positionValueCents={valueCents}
          />
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-bg p-3">
      <p className="whitespace-nowrap text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-display text-sm font-extrabold text-ink tabular @md/app:text-base">{value}</p>
    </div>
  );
}
