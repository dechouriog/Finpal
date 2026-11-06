import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { buyWithinTx } from "@/lib/invest";
import { stageFromProgress } from "@/lib/pal";
import { syncPalStage } from "@/lib/pal-stage";
import { newSpace } from "./helpers";

describe("Pal growth stages", () => {
  it("map progress to stages", () => {
    expect(stageFromProgress({ contributions: 0, autoInvestActive: false })).toBe("seed");
    expect(stageFromProgress({ contributions: 1, autoInvestActive: false })).toBe("sprout");
    expect(stageFromProgress({ contributions: 1, autoInvestActive: true })).toBe("plant");
    expect(stageFromProgress({ contributions: 3, autoInvestActive: false })).toBe("tree");
  });

  it("grow with real progress, count one investing moment once, and never shrink", async () => {
    const s = await newSpace();
    expect((await syncPalStage(s.laura)).stage).toBe("seed");

    // Starter portfolio: three buys placed together = one contribution.
    const at = new Date("2026-11-06T15:00:10Z");
    for (const assetId of ["total-market-index", "short-term-bond", "aurora-cloud"]) {
      await prisma.$transaction((tx) => buyWithinTx(tx, { userId: s.laura, assetId, amountCents: 1000 }));
    }
    await prisma.transaction.updateMany({ where: { userId: s.laura, type: "BUY" }, data: { createdAt: at } });
    expect(await syncPalStage(s.laura)).toMatchObject({ stage: "sprout", previous: "seed", grew: true });

    // Auto-invest activated.
    await prisma.autoInvestEvent.create({
      data: { userId: s.laura, name: "Auto-invest", amountCents: 5000, startDate: at, endDate: at, recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=15,30" },
    });
    expect((await syncPalStage(s.laura)).stage).toBe("plant");

    // Removing the plan doesn't shrink Pal.
    await prisma.autoInvestEvent.deleteMany({ where: { userId: s.laura } });
    expect(await syncPalStage(s.laura)).toMatchObject({ stage: "plant", grew: false });

    // Two more contributions at different moments -> tree.
    for (const [i, minute] of [5, 9].entries()) {
      await prisma.$transaction((tx) => buyWithinTx(tx, { userId: s.laura, assetId: "aggregate-bond", amountCents: 500 + i }));
      await prisma.transaction.updateMany({
        where: { userId: s.laura, amountCents: -(500 + i) },
        data: { createdAt: new Date(`2026-11-06T15:${String(minute).padStart(2, "0")}:00Z`) },
      });
    }
    expect((await syncPalStage(s.laura)).stage).toBe("tree");
  });
});
