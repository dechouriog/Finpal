import { afterAll } from "vitest";

// jsdom lacks ResizeObserver (used by the Sheet to pick mobile vs desktop layout).
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

afterAll(async () => {
  if (typeof window === "undefined") {
    const { prisma } = await import("@/lib/db");
    await prisma.$disconnect();
  }
});
