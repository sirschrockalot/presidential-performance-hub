-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN "mockScopeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_mockScopeId_key" ON "User"("mockScopeId");
