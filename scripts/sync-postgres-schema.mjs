// Generates prisma/postgres/schema.prisma from prisma/schema.prisma (SQLite -> PostgreSQL).
// Production (Render) uses the PostgreSQL schema and its own migrations in prisma/postgres/migrations.
//   node scripts/sync-postgres-schema.mjs          # write the file
//   node scripts/sync-postgres-schema.mjs --check  # CI: fail if it is out of date
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const SRC = "prisma/schema.prisma";
const OUT = "prisma/postgres/schema.prisma";
const header =
  "// GENERATED from prisma/schema.prisma by scripts/sync-postgres-schema.mjs. Do not edit by hand.\n" +
  "// After changing the schema: run this script, then create a migration against a PostgreSQL database:\n" +
  "//   npx prisma migrate dev --schema prisma/postgres/schema.prisma\n\n";

const src = readFileSync(SRC, "utf8");
if (!/provider\s*=\s*"sqlite"/.test(src)) throw new Error("Expected the sqlite provider in prisma/schema.prisma");
const out = header + src.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');

if (process.argv.includes("--check")) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== out) {
    console.error(`${OUT} is out of date. Run: node scripts/sync-postgres-schema.mjs`);
    process.exit(1);
  }
  console.log(`${OUT} is up to date.`);
} else {
  mkdirSync("prisma/postgres", { recursive: true });
  writeFileSync(OUT, out);
  console.log(`Wrote ${OUT}`);
}
