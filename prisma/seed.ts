import { PrismaClient } from "@prisma/client";
import { seedBase } from "../lib/demo/seed";

const prisma = new PrismaClient();

seedBase(prisma)
  .then(({ transactions }) => {
    console.log(`Seeded Finpal base data: 8 assets and the reserved Laura space (${transactions} transactions).`);
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
