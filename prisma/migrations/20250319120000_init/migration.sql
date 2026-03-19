-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TeamCode" AS ENUM ('ACQUISITIONS', 'DISPOSITIONS', 'OPERATIONS');

-- CreateEnum
CREATE TYPE "UserRoleCode" AS ENUM ('ADMIN', 'ACQUISITIONS_MANAGER', 'DISPOSITIONS_MANAGER', 'TRANSACTION_COORDINATOR', 'REP');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('LEAD', 'UNDER_CONTRACT', 'MARKETED', 'BUYER_COMMITTED', 'EMD_RECEIVED', 'ASSIGNED', 'CLOSED_FUNDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DrawStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'RECOUPED', 'DENIED');

-- CreateEnum
CREATE TYPE "PointEventKind" AS ENUM ('AUTO_FUNDED_DEAL', 'MANUAL_ADJUSTMENT', 'CORRECTION');

-- CreateEnum
CREATE TYPE "ReportingPeriodKind" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" "UserRoleCode" NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "code" "TeamCode" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roleId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "sellerName" TEXT NOT NULL,
    "buyerName" TEXT,
    "acquisitionsRepId" TEXT NOT NULL,
    "dispoRepId" TEXT,
    "transactionCoordinatorId" TEXT,
    "contractDate" DATE NOT NULL,
    "assignedDate" DATE,
    "closedFundedDate" DATE,
    "inspectionEndDate" DATE,
    "contractPrice" DECIMAL(14,2) NOT NULL,
    "assignmentPrice" DECIMAL(14,2),
    "assignmentFee" DECIMAL(14,2),
    "buyerEmdAmount" DECIMAL(14,2),
    "buyerEmdReceived" BOOLEAN NOT NULL DEFAULT false,
    "titleCompany" TEXT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'LEAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealStatusHistory" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStatus" "DealStatus",
    "toStatus" "DealStatus" NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealNote" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingPeriod" (
    "id" TEXT NOT NULL,
    "kind" "ReportingPeriodKind" NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "label" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "reportingPeriodId" TEXT NOT NULL,
    "dials" INTEGER NOT NULL DEFAULT 0,
    "talkTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "falloutCount" INTEGER NOT NULL DEFAULT 0,
    "revenueFromFunded" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "leadsWorked" INTEGER,
    "offersMade" INTEGER,
    "contractsSigned" INTEGER,
    "buyerConversations" INTEGER,
    "propertiesMarketed" INTEGER,
    "emdsReceived" INTEGER,
    "assignmentsSecured" INTEGER,
    "avgAssignmentFee" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiTarget" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "reportingPeriodId" TEXT,
    "metricKey" TEXT NOT NULL,
    "targetValue" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draw" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "DrawStatus" NOT NULL DEFAULT 'PENDING',
    "eligible" BOOLEAN NOT NULL,
    "dateIssued" DATE,
    "approvedByUserId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "amountRecouped" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remainingBalance" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointAdjustment" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "dealId" TEXT,
    "points" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT,
    "points" DECIMAL(10,2) NOT NULL,
    "kind" "PointEventKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "pointAdjustmentId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Team_code_key" ON "Team"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "Deal_acquisitionsRepId_idx" ON "Deal"("acquisitionsRepId");

-- CreateIndex
CREATE INDEX "Deal_dispoRepId_idx" ON "Deal"("dispoRepId");

-- CreateIndex
CREATE INDEX "Deal_closedFundedDate_idx" ON "Deal"("closedFundedDate");

-- CreateIndex
CREATE INDEX "DealStatusHistory_dealId_changedAt_idx" ON "DealStatusHistory"("dealId", "changedAt");

-- CreateIndex
CREATE INDEX "DealNote_dealId_createdAt_idx" ON "DealNote"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportingPeriod_periodStart_periodEnd_idx" ON "ReportingPeriod"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingPeriod_kind_periodStart_key" ON "ReportingPeriod"("kind", "periodStart");

-- CreateIndex
CREATE INDEX "KpiEntry_teamId_reportingPeriodId_idx" ON "KpiEntry"("teamId", "reportingPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiEntry_userId_reportingPeriodId_key" ON "KpiEntry"("userId", "reportingPeriodId");

-- CreateIndex
CREATE INDEX "KpiTarget_teamId_metricKey_idx" ON "KpiTarget"("teamId", "metricKey");

-- CreateIndex
CREATE INDEX "KpiTarget_reportingPeriodId_idx" ON "KpiTarget"("reportingPeriodId");

-- CreateIndex
CREATE INDEX "Draw_dealId_idx" ON "Draw"("dealId");

-- CreateIndex
CREATE INDEX "Draw_repId_idx" ON "Draw"("repId");

-- CreateIndex
CREATE INDEX "Draw_status_idx" ON "Draw"("status");

-- CreateIndex
CREATE INDEX "PointAdjustment_recipientUserId_idx" ON "PointAdjustment"("recipientUserId");

-- CreateIndex
CREATE INDEX "PointAdjustment_dealId_idx" ON "PointAdjustment"("dealId");

-- CreateIndex
CREATE INDEX "PointEvent_userId_createdAt_idx" ON "PointEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointEvent_dealId_idx" ON "PointEvent"("dealId");

-- CreateIndex
CREATE INDEX "PointEvent_kind_idx" ON "PointEvent"("kind");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_acquisitionsRepId_fkey" FOREIGN KEY ("acquisitionsRepId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_dispoRepId_fkey" FOREIGN KEY ("dispoRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_transactionCoordinatorId_fkey" FOREIGN KEY ("transactionCoordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStatusHistory" ADD CONSTRAINT "DealStatusHistory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStatusHistory" ADD CONSTRAINT "DealStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealNote" ADD CONSTRAINT "DealNote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealNote" ADD CONSTRAINT "DealNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiEntry" ADD CONSTRAINT "KpiEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiEntry" ADD CONSTRAINT "KpiEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiEntry" ADD CONSTRAINT "KpiEntry_reportingPeriodId_fkey" FOREIGN KEY ("reportingPeriodId") REFERENCES "ReportingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiTarget" ADD CONSTRAINT "KpiTarget_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiTarget" ADD CONSTRAINT "KpiTarget_reportingPeriodId_fkey" FOREIGN KEY ("reportingPeriodId") REFERENCES "ReportingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draw" ADD CONSTRAINT "Draw_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draw" ADD CONSTRAINT "Draw_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draw" ADD CONSTRAINT "Draw_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointAdjustment" ADD CONSTRAINT "PointAdjustment_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointAdjustment" ADD CONSTRAINT "PointAdjustment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointAdjustment" ADD CONSTRAINT "PointAdjustment_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_pointAdjustmentId_fkey" FOREIGN KEY ("pointAdjustmentId") REFERENCES "PointAdjustment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

