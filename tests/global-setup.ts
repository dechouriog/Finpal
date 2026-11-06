import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

/** Fresh, isolated SQLite database for the test run (never touches dev.db). */
export default function setup() {
  const db = path.resolve(__dirname, "../prisma/test.db");
  rmSync(db, { force: true });
  rmSync(`${db}-journal`, { force: true });
  execSync("npx prisma db push --skip-generate", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
