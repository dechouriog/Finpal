"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PAL_MOODS, PAL_STAGES, Pal, type PalStage } from "@/components/pal/Pal";

export function PalGallery() {
  const [stage, setStage] = useState<PalStage>("seed");
  const next = () => setStage((s) => PAL_STAGES[(PAL_STAGES.indexOf(s) + 1) % PAL_STAGES.length]!);
  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-extrabold text-ink">Pal moods</h1>

      <section aria-label="Growth stages" className="grid grid-cols-2 gap-4 @3xl/app:grid-cols-4">
        {PAL_STAGES.map((s) => (
          <figure key={s} data-testid={`pal-stage-${s}`} className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-4 ring-1 ring-line">
            <Pal stage={s} size={160} />
            <figcaption className="text-sm font-semibold text-ink">stage: {s}</figcaption>
          </figure>
        ))}
      </section>

      <section aria-label="Moods" className="grid grid-cols-2 gap-4 @3xl/app:grid-cols-4">
        {PAL_MOODS.map((m) => (
          <figure key={m} data-testid={`pal-${m}`} className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-4 ring-1 ring-line">
            <Pal mood={m} stage="sprout" size={160} />
            <figcaption className="text-sm font-semibold text-ink">{m}</figcaption>
          </figure>
        ))}
      </section>

      <section aria-label="Sizes and growth" className="flex flex-wrap items-end gap-6 rounded-2xl bg-surface p-4 ring-1 ring-line" data-testid="pal-sizes">
        <Pal size={160} stage={stage} mood="excited" />
        <Pal size={56} stage={stage} />
        <Pal size={24} stage={stage} />
        <div className="grid size-14 place-items-center rounded-full bg-navy">
          <Pal size={44} stage={stage} decorative />
        </div>
        <Button variant="outline" onClick={next} data-testid="pal-grow">
          Grow ({stage})
        </Button>
      </section>
    </div>
  );
}
