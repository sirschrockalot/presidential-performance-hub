-- CreateEnum
CREATE TYPE "KpiDataSource" AS ENUM ('AIRCALL', 'MANUAL', 'IMPORT', 'SYSTEM');

-- CreateTable
CREATE TABLE "DailyKpiEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "source" "KpiDataSource" NOT NULL,
    "dials" INTEGER NOT NULL DEFAULT 0,
    "talkTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "inboundTalkTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "outboundTalkTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "offersMade" INTEGER,
    "contractsSigned" INTEGER,
    "rawPayload" JSONB,
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyKpiEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyKpiEntry_entryDate_idx" ON "DailyKpiEntry"("entryDate");

-- CreateIndex
CREATE INDEX "DailyKpiEntry_teamId_entryDate_idx" ON "DailyKpiEntry"("teamId", "entryDate");

-- CreateIndex
CREATE INDEX "DailyKpiEntry_userId_entryDate_idx" ON "DailyKpiEntry"("userId", "entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyKpiEntry_userId_teamId_entryDate_source_key" ON "DailyKpiEntry"("userId", "teamId", "entryDate", "source");

-- AddForeignKey
ALTER TABLE "DailyKpiEntry" ADD CONSTRAINT "DailyKpiEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyKpiEntry" ADD CONSTRAINT "DailyKpiEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
