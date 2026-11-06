import { cn } from "@/lib/utils";

/** Shimmering placeholder block. Decorative: screen readers get the page-level "Loading" label. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-xl", className)} />;
}

function Page({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-6">
      {children}
    </div>
  );
}

function Title() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64 max-w-full" />
    </div>
  );
}

function ListCard({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl bg-surface px-5 py-4 ring-1 ring-line">
      <Skeleton className="mb-3 h-5 w-32" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <Page label="Loading home">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 @3xl/app:grid-cols-5">
        <div className="space-y-6 @3xl/app:col-span-3">
          <Skeleton className="h-[188px] rounded-3xl" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
          <Skeleton className="h-[76px] rounded-2xl" />
        </div>
        <div className="space-y-6 @3xl/app:col-span-2">
          <Skeleton className="h-[104px] rounded-2xl" />
          <ListCard />
        </div>
      </div>
    </Page>
  );
}

export function ListPageSkeleton({ label }: { label: string }) {
  return (
    <Page label={label}>
      <Title />
      <Skeleton className="h-[108px] rounded-2xl" />
      <ListCard rows={7} />
    </Page>
  );
}

export function InvestSkeleton() {
  return (
    <Page label="Loading invest">
      <Title />
      <div className="grid grid-cols-2 gap-3 @3xl/app:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className={i === 0 ? "col-span-2 h-[80px] rounded-2xl @3xl/app:col-span-1 @3xl/app:h-[88px]" : "h-[80px] rounded-2xl @3xl/app:h-[88px]"} />
        ))}
      </div>
      <Skeleton className="h-11 w-56 rounded-full" />
      <div className="grid grid-cols-1 gap-6 @3xl/app:grid-cols-3">
        <Skeleton className="h-[360px] rounded-2xl" />
        <div className="@3xl/app:col-span-2">
          <ListCard rows={8} />
        </div>
      </div>
    </Page>
  );
}

export function FlowSkeleton({ label }: { label: string }) {
  return (
    <Page label={label}>
      <Title />
      <div className="grid grid-cols-1 items-start gap-6 @3xl/app:grid-cols-5">
        <Skeleton className="h-[420px] rounded-3xl @3xl/app:col-span-3" />
        <Skeleton className="h-[240px] rounded-3xl @3xl/app:col-span-2" />
      </div>
    </Page>
  );
}

export function FormSkeleton({ label }: { label: string }) {
  return (
    <Page label={label}>
      <div className="mx-auto max-w-xl space-y-6">
        <Title />
        <Skeleton className="h-[420px] rounded-3xl" />
      </div>
    </Page>
  );
}
