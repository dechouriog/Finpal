// Seeds the demo data on first deploy only. Use Profile > Reset demo data to reset later.
import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../lib/demo/seed";

const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.count();
  if (users > 0) {
    console.log(`Database already has ${users} users; skipping seed.`);
  } else {
    const { transactions } = await seedDemo(prisma);
    console.log(`Seeded demo data (${transactions} transactions).`);
  }
})()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
