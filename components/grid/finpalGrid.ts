"use client";

import { AllCommunityModule, ModuleRegistry, themeQuartz, type GridSizeChangedEvent } from "ag-grid-community";

// Register AG Grid Community features once for the whole app.
ModuleRegistry.registerModules([AllCommunityModule]);

/** AG Grid theme using Finpal brand tokens. */
export const finpalGridTheme = themeQuartz.withParams({
  accentColor: "#00C2A8",
  backgroundColor: "#FFFFFF",
  foregroundColor: "#0F172A",
  borderColor: "#E2E8F0",
  headerBackgroundColor: "#F6F8FB",
  headerTextColor: "#5C6B80",
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

/**
 * Responsive grid columns: below `minWidth` px the secondary columns are hidden and
 * the key column is pinned left, so the grid never needs horizontal scrolling.
 */
export function responsiveColumns(minWidth: number, secondary: string[], key: string) {
  return (e: GridSizeChangedEvent) => {
    const wide = e.clientWidth >= minWidth;
    e.api.setColumnsVisible(secondary, wide);
    e.api.setColumnsPinned([key], wide ? null : "left");
    e.api.sizeColumnsToFit();
  };
}
