-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CLIENT', 'OPPORTUNITY', 'QUOTE', 'ORDER');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "clientId" TEXT,
    "opportunityId" TEXT,
    "quoteId" TEXT,
    "orderId" TEXT,
    "accion" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "observaciones" TEXT,
    "userId" TEXT,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "clientId" TEXT,
    "opportunityId" TEXT,
    "quoteId" TEXT,
    "orderId" TEXT,
    "tipoArchivo" TEXT,
    "bucket" TEXT NOT NULL DEFAULT 'archivos',
    "observaciones" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_entityType_clientId_idx" ON "Activity"("entityType", "clientId");

-- CreateIndex
CREATE INDEX "Attachment_entityType_clientId_idx" ON "Attachment"("entityType", "clientId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
