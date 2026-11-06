// Deploy-time seed: idempotent and safe to re-run.
// Always upserts the asset catalog; creates the reserved Laura space only if it doesn't exist yet.
// Demo users created with "Try the demo" are never touched.
import { PrismaClient } from "@prisma/client";
import { DEMO_ASSETS, RESERVED_SPACE, seedBase } from "../lib/demo/seed";

const prisma = new PrismaClient();

(async () => {
  const reserved = await prisma.user.findUnique({ where: { id: RESERVED_SPACE.laura } });
  if (reserved) {
    for (const asset of DEMO_ASSETS) {
      await prisma.asset.upsert({ where: { id: asset.id }, create: asset, update: asset });
    }
    console.log("Assets up to date; reserved Laura space already exists.");
  } else {
    const { transactions } = await seedBase(prisma);
    console.log(`Created assets and the reserved Laura space (${transactions} transactions).`);
  }
})()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
