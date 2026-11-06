// Render build step: switch the Prisma datasource from SQLite (local) to PostgreSQL.
// Runs only in the build environment, which has its own fresh checkout.
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../prisma/schema.prisma", import.meta.url);
const schema = readFileSync(file, "utf8");
const next = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
if (next === schema && !schema.includes('provider = "postgresql"')) {
  console.error("Could not find the sqlite provider in prisma/schema.prisma");
  process.exit(1);
}
writeFileSync(file, next);
console.log("Prisma datasource set to PostgreSQL.");
