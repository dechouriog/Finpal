// Deletes demo spaces ("Try the demo" accounts and their Maria/Sam contacts) older than 7 days.
//
// DO NOT RUN BEFORE DEC 16, 2026: judging runs until Dec 15 and judges must keep their demo data.
// The script refuses to run before that date unless you pass --force.
//
//   npm run cleanup:demo            # delete demo spaces older than 7 days
//   npm run cleanup:demo -- --dry   # only report what would be deleted
import { PrismaClient } from "@prisma/client";
import { deleteSpace } from "../lib/demo/seed";

const NOT_BEFORE = new Date("2026-12-16T00:00:00Z");
const MAX_AGE_DAYS = 7;

const prisma = new PrismaClient();
const args = new Set(process.argv.slice(2));

(async () => {
  const now = new Date();
  if (now < NOT_BEFORE && !args.has("--force")) {
    console.error(`Refusing to run before ${NOT_BEFORE.toISOString().slice(0, 10)} (judging period). Use --force to override.`);
    process.exitCode = 1;
    return;
  }
  const cutoff = new Date(now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  // A space is identified by its main user (spaceId === id).
  const mains = await prisma.user.findMany({
    where: { isDemo: true, createdAt: { lt: cutoff } },
    select: { id: true, spaceId: true },
  });
  const spaces = [...new Set(mains.filter((u) => u.id === u.spaceId).map((u) => u.spaceId))];
  console.log(`${spaces.length} demo spaces older than ${MAX_AGE_DAYS} days.`);
  if (args.has("--dry")) return;

  let users = 0;
  for (const spaceId of spaces) {
    users += await prisma.$transaction((tx) => deleteSpace(tx, spaceId));
  }
  console.log(`Deleted ${spaces.length} spaces (${users} users).`);
})()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
