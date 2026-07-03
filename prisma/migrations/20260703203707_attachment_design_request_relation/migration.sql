-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_designRequestId_fkey" FOREIGN KEY ("designRequestId") REFERENCES "DesignRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
