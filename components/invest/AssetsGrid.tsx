"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ChevronRight } from "lucide-react";
import { finpalGridTheme } from "@/components/grid/finpalGrid";
import { ASSET_CATEGORY_META } from "@/lib/domain";
import { cn, formatCents } from "@/lib/utils";
import type { AssetRow } from "./types";

function CategoryCell({ category }: { category: AssetRow["category"] }) {
  const meta = ASSET_CATEGORY_META[category];
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink">
      <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

/** Positions and available assets. Desktop: AG Grid. Mobile: compact list. */
export function AssetsGrid({ rows }: { rows: AssetRow[] }) {
  const router = useRouter();
  const columnDefs = useMemo<ColDef<AssetRow>[]>(
    () => [
      {
        headerName: "Asset",
        field: "name",
        flex: 1.4,
        minWidth: 220,
        filter: "agTextColumnFilter",
        cellClass: "font-semibold",
      },
      {
        headerName: "Category",
        field: "category",
        width: 180,
        cellRenderer: (p: ICellRendererParams<AssetRow>) => (p.data ? <CategoryCell category={p.data.category} /> : null),
        filter: "agTextColumnFilter",
        filterValueGetter: (p) => (p.data ? ASSET_CATEGORY_META[p.data.category].label : ""),
      },
      {
        headerName: "Price",
        field: "priceCents",
        width: 120,
        type: "rightAligned",
        valueFormatter: (p) => formatCents(p.value ?? 0),
        filter: "agNumberColumnFilter",
        filterValueGetter: (p) => (p.data ? p.data.priceCents / 100 : null),
        cellClass: "tabular",
      },
      {
        headerName: "Shares",
        field: "shares",
        width: 110,
        type: "rightAligned",
        valueFormatter: (p) => (p.value ? Number(p.value).toFixed(4) : "—"),
        filter: "agNumberColumnFilter",
        cellClass: "tabular",
      },
      {
        headerName: "Value",
        field: "valueCents",
        width: 130,
        type: "rightAligned",
        sort: "desc",
        valueFormatter: (p) => (p.value ? formatCents(p.value) : "—"),
        filter: "agNumberColumnFilter",
        filterValueGetter: (p) => (p.data ? p.data.valueCents / 100 : null),
        cellClass: "font-semibold tabular",
      },
      {
        headerName: "% of portfolio",
        field: "pct",
        width: 140,
        type: "rightAligned",
        valueFormatter: (p) => (p.value ? `${Number(p.value).toFixed(1)}%` : "—"),
        filter: "agNumberColumnFilter",
        cellClass: "tabular",
      },
    ],
    [],
  );

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl ring-1 ring-line @3xl/app:block">
        <AgGridReact<AssetRow>
          theme={finpalGridTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, resizable: true }}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          rowClass="cursor-pointer"
          onRowClicked={(e) => e.data && router.push(`/invest/${e.data.id}`)}
        />
      </div>

      <ul className="divide-y divide-line rounded-2xl bg-surface px-4 ring-1 ring-line @3xl/app:hidden">
        {[...rows]
          .sort((a, b) => b.valueCents - a.valueCents)
          .map((r) => (
            <li key={r.id}>
              <Link href={`/invest/${r.id}`} className="flex items-center gap-3 py-3">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: ASSET_CATEGORY_META[r.category].color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                  <span className="block text-xs text-muted">
                    {ASSET_CATEGORY_META[r.category].label} · {formatCents(r.priceCents)}
                  </span>
                </span>
                <span className="text-right">
                  <span className={cn("block text-sm font-bold tabular", r.valueCents ? "text-ink" : "text-muted")}>
                    {r.valueCents ? formatCents(r.valueCents) : "—"}
                  </span>
                  {r.pct > 0 && <span className="block text-xs text-muted tabular">{r.pct.toFixed(1)}%</span>}
                </span>
                <ChevronRight className="size-4 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
      </ul>
    </>
  );
}
