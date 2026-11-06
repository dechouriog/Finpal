// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MotionConfig } from "framer-motion";
import { PAL_LABEL, PAL_MOODS, PAL_STAGES, Pal } from "@/components/pal/Pal";
import { liveMood, moodForTurn } from "@/components/pal/mood";

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => cleanup());

describe("Pal character", () => {
  it("renders every mood at every growth stage, with an accessible label", () => {
    mockReducedMotion(false);
    for (const stage of PAL_STAGES) {
      for (const mood of PAL_MOODS) {
        const { container, unmount } = render(<Pal mood={mood} stage={stage} size={56} />);
        const svg = container.querySelector("svg")!;
        expect(svg.getAttribute("data-mood")).toBe(mood);
        expect(svg.getAttribute("data-stage")).toBe(stage);
        expect(svg.getAttribute("aria-label")).toBe(PAL_LABEL);
        unmount();
      }
    }
  });

  it("decorative copies are hidden from assistive tech", () => {
    mockReducedMotion(false);
    const { container } = render(<Pal decorative />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("aria-label")).toBeNull();
  });

  it("reduced motion disables animation", () => {
    // The app wraps everything in <MotionConfig reducedMotion="user">, which follows the OS setting.
    const reduced = render(
      <MotionConfig reducedMotion="always">
        <Pal mood="excited" />
      </MotionConfig>,
    );
    expect(reduced.container.querySelector("svg")!.getAttribute("data-animated")).toBe("false");
    cleanup();
    const full = render(
      <MotionConfig reducedMotion="never">
        <Pal mood="excited" />
      </MotionConfig>,
    );
    expect(full.container.querySelector("svg")!.getAttribute("data-animated")).toBe("true");
  });

  it("gestures only appear for the moods that use them", () => {
    mockReducedMotion(false);
    const arms = (mood: (typeof PAL_MOODS)[number]) => {
      const { container, unmount } = render(<Pal mood={mood} />);
      const n = container.querySelectorAll("path[stroke-width='7']").length;
      unmount();
      return n;
    };
    expect(arms("idle")).toBe(0);
    expect(arms("serious")).toBe(0);
    expect(arms("wave")).toBeGreaterThan(0);
    expect(arms("proud")).toBeGreaterThan(0);
  });
});

describe("Pal's mood follows the conversation", () => {
  it("error path shows oops", () => {
    expect(liveMood({ busy: false, typing: false, hasMessages: true, lastTurn: [{ type: "error" }] })).toBe("oops");
    expect(moodForTurn([{ type: "steps", steps: [{ status: "error" }] }])).toBe("oops");
  });

  it("thinking while waiting or running tools, listening while typing, wave before the first message", () => {
    expect(liveMood({ busy: true, typing: false, hasMessages: true, lastTurn: [] })).toBe("thinking");
    expect(
      liveMood({ busy: true, typing: false, hasMessages: true, lastTurn: [{ type: "steps", steps: [{ status: "running" }] }] }),
    ).toBe("thinking");
    expect(liveMood({ busy: false, typing: true, hasMessages: true, lastTurn: [{ type: "text" }] })).toBe("listening");
    expect(liveMood({ busy: false, typing: false, hasMessages: false, lastTurn: null })).toBe("wave");
  });

  it("excited on found money and portfolios, serious on risks and pushback", () => {
    expect(moodForTurn([{ type: "card", card: { kind: "cashflow" } }])).toBe("excited");
    expect(moodForTurn([{ type: "card", card: { kind: "portfolio" } }])).toBe("excited");
    expect(moodForTurn([{ type: "card", card: { kind: "portfolio" } }, { type: "card", card: { kind: "risks" } }])).toBe("serious");
    expect(moodForTurn([{ type: "card", card: { kind: "pushback" } }])).toBe("serious");
  });
});
