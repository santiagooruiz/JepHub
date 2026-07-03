-- CreateTable
CREATE TABLE "DesignRequestMessage" (
    "id" TEXT NOT NULL,
    "designRequestId" TEXT NOT NULL,
    "userId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignRequestMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DesignRequestMessage" ADD CONSTRAINT "DesignRequestMessage_designRequestId_fkey" FOREIGN KEY ("designRequestId") REFERENCES "DesignRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignRequestMessage" ADD CONSTRAINT "DesignRequestMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
