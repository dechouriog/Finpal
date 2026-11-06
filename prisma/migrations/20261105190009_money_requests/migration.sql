-- CreateTable
CREATE TABLE "MoneyRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "MoneyRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MoneyRequest_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MoneyRequest_payerId_status_idx" ON "MoneyRequest"("payerId", "status");

-- CreateIndex
CREATE INDEX "MoneyRequest_requesterId_status_idx" ON "MoneyRequest"("requesterId", "status");
