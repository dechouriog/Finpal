import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../lib/demo/seed";

const prisma = new PrismaClient();

seedDemo(prisma)
  .then(({ transactions }) => {
    console.log(`Seeded Finpal demo data: 3 users, 8 assets, ${transactions} transactions.`);
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
