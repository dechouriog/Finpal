import type { KeyboardEvent } from "react";

/**
 * Keyboard support for tablists and radio groups (WAI-ARIA pattern):
 * Arrow keys move and select, Home/End jump to the ends. Disabled options are skipped.
 * Pair with roving tabindex: tabIndex={selected ? 0 : -1} on each option.
 */
export function arrowKeyNav<T extends string>(values: readonly T[], current: T, select: (v: T) => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    const options = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"],[role="radio"]'));
    const enabled = values.filter((_, i) => !options[i]?.disabled);
    const i = enabled.indexOf(current);
    let next: T | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = enabled[(i + 1) % enabled.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = enabled[(i - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (next === undefined) return;
    e.preventDefault();
    select(next);
    options[values.indexOf(next)]?.focus();
  };
}
