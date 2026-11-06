-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "palStage" TEXT NOT NULL DEFAULT 'seed',
    "balanceCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("age", "avatarColor", "balanceCents", "city", "createdAt", "email", "fullName", "handle", "id", "isDemo", "name", "occupation", "spaceId") SELECT "age", "avatarColor", "balanceCents", "city", "createdAt", "email", "fullName", "handle", "id", "isDemo", "name", "occupation", "spaceId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
CREATE INDEX "User_spaceId_idx" ON "User"("spaceId");
CREATE INDEX "User_isDemo_createdAt_idx" ON "User"("isDemo", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
