-- Supports dashboard funded revenue series: CLOSED_FUNDED + closedFundedDate range
CREATE INDEX "Deal_status_closedFundedDate_idx" ON "Deal"("status", "closedFundedDate");
