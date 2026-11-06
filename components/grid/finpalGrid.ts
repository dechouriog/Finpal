"use client";

import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

// Register AG Grid Community features once for the whole app.
ModuleRegistry.registerModules([AllCommunityModule]);

/** AG Grid theme using Finpal brand tokens. */
export const finpalGridTheme = themeQuartz.withParams({
  accentColor: "#00C2A8",
  backgroundColor: "#FFFFFF",
  foregroundColor: "#0F172A",
  borderColor: "#E2E8F0",
  headerBackgroundColor: "#F6F8FB",
  headerTextColor: "#64748B",
  headerFontWeight: 600,
  oddRowBackgroundColor: "#FFFFFF",
  fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  fontSize: 14,
  rowHeight: 52,
  headerHeight: 44,
  wrapperBorder: false,
  wrapperBorderRadius: 16,
  columnBorder: false,
  cellHorizontalPadding: 16,
});

export const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
