"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams, ValueFormatterParams } from "ag-grid-community";
import { finpalGridTheme } from "@/components/grid/finpalGrid";
import { Sheet } from "@/components/common/Sheet";
import { STATUS_BADGE, TYPE_BADGE, statusLabel, type ActivityRow } from "@/lib/activity";
import { TX_TYPES, TX_TYPE_LABEL, type TxType } from "@/lib/domain";
import { txIcon } from "@/lib/tx-display";
import { cn, formatCents } from "@/lib/utils";

const RANGES = [
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "3 months", days: 90 },
  { id: "1y", label: "12 months", days: 365 },
  { id: "all", label: "All time", days: null },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const fullFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function ActivityView({ rows }: { rows: ActivityRow[] }) {
  const [types, setTypes] = useState<Set<TxType>>(new Set());
  const [range, setRange] = useState<RangeId>("all");
  const [selected, setSelected] = useState<ActivityRow | null>(null);

  const filtered = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)?.days ?? null;
    const since = days ? Date.now() - days * 86_400_000 : 0;
    return rows.filter((r) => (types.size === 0 || types.has(r.type)) && new Date(r.createdAt).getTime() >= since);
  }, [rows, types, range]);

  const totals = useMemo(() => {
    let inC = 0;
    let outC = 0;
    for (const r of filtered) {
      if (r.status !== "COMPLETED") continue;
      if (r.amountCents > 0) inC += r.amountCents;
      else outC -= r.amountCents;
    }
    return { inC, outC };
  }, [filtered]);

  const toggleType = (t: TxType) =>
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          <FilterChip active={types.size === 0} onClick={() => setTypes(new Set())}>
            All types
          </FilterChip>
          {TX_TYPES.map((t) => (
            <FilterChip key={t} active={types.has(t)} onClick={() => toggleType(t)}>
              {TX_TYPE_LABEL[t]}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full bg-bg p-1 ring-1 ring-line" role="group" aria-label="Filter by date">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={range === r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  "h-8 rounded-full px-3 text-xs font-semibold transition-colors",
                  range === r.id ? "bg-navy text-white" : "text-muted hover:text-ink",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted tabular">
            {filtered.length} transactions · <span className="font-semibold text-success">In {formatCents(totals.inC)}</span> ·{" "}
            <span className="font-semibold text-ink">Out {formatCents(totals.outC)}</span>
          </p>
        </div>
      </div>

      {/* Desktop: AG Grid */}
      <div className="hidden @3xl/app:block">
        <ActivityGrid rows={filtered} onSelect={setSelected} />
      </div>

      {/* Mobile: list grouped by day */}
      <div className="@3xl/app:hidden">
        <ActivityList rows={filtered} onSelect={setSelected} />
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Transaction details" panelWidth={400}>
        {selected && <TxDetail tx={selected} />}
      </Sheet>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full px-3 text-xs font-semibold ring-1 transition-colors",
        active ? "bg-teal-soft text-teal-ink ring-teal" : "bg-surface text-muted ring-line hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

const PAYPAL_TYPES = new Set(["DEPOSIT", "WITHDRAW", "REFUND"]);
/** Movements that went through the PayPal Sandbox (orders, payouts, refunds). */
const isPayPal = (r: ActivityRow) => PAYPAL_TYPES.has(r.type) && !r.isSeed;

const PAYPAL_ID_LABEL: Record<string, string> = {
  DEPOSIT: "PayPal order ID",
  WITHDRAW: "PayPal payout ID",
  REFUND: "PayPal refund ID",
};

function PayPalTag() {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-navy-soft px-2 text-[10px] font-bold uppercase tracking-wide text-navy">
      PayPal
    </span>
  );
}

/** Marks seeded history so it's never mistaken for a real movement. */
function DemoTag() {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-bg px-2 text-[10px] font-semibold uppercase tracking-wide text-muted ring-1 ring-line">
      Demo data
    </span>
  );
}

function TypeBadge({ type }: { type: TxType }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold", TYPE_BADGE[type])}>
      {TX_TYPE_LABEL[type]}
    </span>
  );
}

function StatusBadge({ status }: { status: ActivityRow["status"] }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold", STATUS_BADGE[status])}>
      {statusLabel(status)}
    </span>
  );
}

function ActivityGrid({ rows, onSelect }: { rows: ActivityRow[]; onSelect: (r: ActivityRow) => void }) {
  const columnDefs = useMemo<ColDef<ActivityRow>[]>(
    () => [
      {
        headerName: "Date",
        field: "createdAt",
        sort: "desc",
        width: 150,
        valueGetter: (p) => (p.data ? new Date(p.data.createdAt) : null),
        valueFormatter: (p: ValueFormatterParams<ActivityRow, Date | null>) => (p.value ? dayFmt.format(p.value) : ""),
        filter: "agDateColumnFilter",
        filterParams: {
          comparator: (filterDate: Date, cellValue: Date) => {
            const cell = Date.UTC(cellValue.getUTCFullYear(), cellValue.getUTCMonth(), cellValue.getUTCDate());
            const f = Date.UTC(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
            return cell === f ? 0 : cell < f ? -1 : 1;
          },
        },
      },
      {
        headerName: "Type",
        field: "type",
        width: 140,
        cellRenderer: (p: ICellRendererParams<ActivityRow>) => (p.data ? <TypeBadge type={p.data.type} /> : null),
        filter: "agTextColumnFilter",
        filterValueGetter: (p) => (p.data ? TX_TYPE_LABEL[p.data.type] : ""),
      },
      {
        headerName: "Counterparty",
        field: "title",
        flex: 1,
        minWidth: 200,
        filter: "agTextColumnFilter",
        cellRenderer: (p: ICellRendererParams<ActivityRow>) =>
          p.data ? (
            <span className="flex items-center gap-2">
              <span className="truncate">{p.data.title}</span>
              {p.data.isSeed && <DemoTag />}
              {isPayPal(p.data) && <PayPalTag />}
            </span>
          ) : null,
      },
      {
        headerName: "Amount",
        field: "amountCents",
        width: 150,
        type: "rightAligned",
        valueFormatter: (p) => (typeof p.value === "number" ? formatCents(p.value, { signed: true }) : ""),
        cellClass: (p) => cn("font-semibold tabular", (p.value ?? 0) > 0 ? "text-success" : "text-ink"),
        filter: "agNumberColumnFilter",
        filterValueGetter: (p) => (p.data ? p.data.amountCents / 100 : null),
      },
      {
        headerName: "Status",
        field: "status",
        width: 130,
        cellRenderer: (p: ICellRendererParams<ActivityRow>) => (p.data ? <StatusBadge status={p.data.status} /> : null),
        filter: "agTextColumnFilter",
      },
    ],
    [],
  );

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-line">
      <AgGridReact<ActivityRow>
        theme={finpalGridTheme}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: false }}
        getRowId={(p) => p.data.id}
        domLayout="autoHeight"
        pagination
        paginationPageSize={15}
        paginationPageSizeSelector={[15, 30, 60]}
        rowClass="cursor-pointer"
        onRowClicked={(e) => e.data && onSelect(e.data)}
        overlayNoRowsTemplate="<span style='color:#64748B'>No transactions match these filters.</span>"
      />
    </div>
  );
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const key = (x: Date) => `${x.getUTCFullYear()}-${x.getUTCMonth()}-${x.getUTCDate()}`;
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (key(d) === key(today)) return "Today";
  if (key(d) === key(yesterday)) return "Yesterday";
  return dayFmt.format(d);
}

function ActivityList({ rows, onSelect }: { rows: ActivityRow[]; onSelect: (r: ActivityRow) => void }) {
  const groups = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const out: { label: string; items: ActivityRow[] }[] = [];
    for (const r of sorted) {
      const label = dayLabel(r.createdAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(r);
      else out.push({ label, items: [r] });
    }
    return out;
  }, [rows]);

  if (groups.length === 0) {
    return <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted ring-1 ring-line">No transactions match these filters.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.label} aria-label={g.label}>
          <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h2>
          <ul className="divide-y divide-line rounded-2xl bg-surface px-4 ring-1 ring-line">
            {g.items.map((r) => {
              const Icon = txIcon(r);
              const incoming = r.amountCents > 0;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => onSelect(r)} className="flex w-full items-center gap-3 py-3 text-left">
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full",
                        incoming ? "bg-teal-soft text-teal-ink" : "bg-bg text-navy",
                      )}
                    >
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{r.title}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        {r.isSeed && <DemoTag />}
                        {isPayPal(r) && <PayPalTag />}
                        {TX_TYPE_LABEL[r.type]}
                        {r.status !== "COMPLETED" && ` · ${statusLabel(r.status)}`}
                      </span>
                    </span>
                    <span className={cn("shrink-0 text-sm font-bold tabular", incoming ? "text-success" : "text-ink")}>
                      {formatCents(r.amountCents, { signed: true })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TxDetail({ tx }: { tx: ActivityRow }) {
  const Icon = txIcon(tx);
  const incoming = tx.amountCents > 0;
  const rows: [string, React.ReactNode][] = [
    ["Type", <TypeBadge key="t" type={tx.type} />],
    ["Status", <StatusBadge key="s" status={tx.status} />],
    ["Date", fullFmt.format(new Date(tx.createdAt)) + " UTC"],
    ["Counterparty", tx.counterparty],
  ];
  if (tx.isSeed) rows.push(["Source", <DemoTag key="d" />]);
  if (tx.note) rows.push(["Note", tx.note]);
  if (tx.shares) rows.push(["Shares", tx.shares.toFixed(4)]);
  if (isPayPal(tx)) rows.push(["Processed by", <PayPalTag key="p" />]);
  if (tx.externalRef) {
    rows.push([
      PAYPAL_ID_LABEL[tx.type] ?? "PayPal reference",
      <span key="r" className="font-mono text-xs">
        {tx.externalRef}
      </span>,
    ]);
  }
  rows.push(["Finpal ID", <span key="i" className="font-mono text-xs">{tx.id}</span>]);

  return (
    <div className="p-5">
      <div className="flex flex-col items-center text-center">
        <span
          className={cn("grid size-14 place-items-center rounded-full", incoming ? "bg-teal-soft text-teal-ink" : "bg-bg text-navy")}
        >
          <Icon className="size-6" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-semibold text-ink">{tx.title}</p>
        <p className={cn("mt-1 font-display text-3xl font-extrabold tabular", incoming ? "text-success" : "text-ink")}>
          {formatCents(tx.amountCents, { signed: true })}
        </p>
      </div>
      <dl className="mt-6 divide-y divide-line text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted">{label}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
