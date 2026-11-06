/*
  Warnings:

  - Added the required column `spaceId` to the `User` table; existing users are backfilled into the reserved "laura" space.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "counterparty" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "externalRef" TEXT,
    "assetId" TEXT,
    "shares" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amountCents", "assetId", "category", "counterparty", "createdAt", "externalRef", "id", "note", "shares", "status", "type", "userId") SELECT "amountCents", "assetId", "category", "counterparty", "createdAt", "externalRef", "id", "note", "shares", "status", "type", "userId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spaceId" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "occupation" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Backfill: every user that existed before spaces belongs to the reserved "laura" space.
INSERT INTO "new_User" ("age", "avatarColor", "balanceCents", "city", "createdAt", "email", "fullName", "handle", "id", "name", "occupation", "spaceId") SELECT "age", "avatarColor", "balanceCents", "city", "createdAt", "email", "fullName", "handle", "id", "name", "occupation", 'laura' FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
CREATE INDEX "User_spaceId_idx" ON "User"("spaceId");
CREATE INDEX "User_isDemo_createdAt_idx" ON "User"("isDemo", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
