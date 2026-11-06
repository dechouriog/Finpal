// Starts an isolated production server for Playwright E2E:
// fresh SQLite file (prisma/e2e.db), its own build folder (.next-e2e), port 3100.
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";

const env = { ...process.env };
const run = (cmd) => execSync(cmd, { stdio: "inherit", env, shell: true });

rmSync("prisma/e2e.db", { force: true });
rmSync("prisma/e2e.db-journal", { force: true });
run("npx prisma db push --skip-generate");
run("npx tsx scripts/seed-if-empty.ts");
if (!process.env.E2E_SKIP_BUILD) run("npx next build");
spawn("npx", ["next", "start", "-p", "3100"], { stdio: "inherit", env, shell: true });
