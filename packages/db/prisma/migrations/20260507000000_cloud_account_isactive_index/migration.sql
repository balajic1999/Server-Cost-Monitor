-- Background cost-fetch worker scans `WHERE isActive = true` every 6 hours.
-- Without this index the query is a sequential scan over all CloudAccount rows.
-- CreateIndex
CREATE INDEX "CloudAccount_isActive_idx" ON "CloudAccount"("isActive");
