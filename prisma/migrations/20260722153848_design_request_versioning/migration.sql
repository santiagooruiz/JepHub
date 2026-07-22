-- AlterTable
ALTER TABLE "DesignRequest" ADD COLUMN     "previousRequestId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "DesignRequest_previousRequestId_key" ON "DesignRequest"("previousRequestId");

-- AddForeignKey
ALTER TABLE "DesignRequest" ADD CONSTRAINT "DesignRequest_previousRequestId_fkey" FOREIGN KEY ("previousRequestId") REFERENCES "DesignRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
