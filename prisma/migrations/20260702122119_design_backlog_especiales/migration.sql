-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityType" ADD VALUE 'DESIGN';
ALTER TYPE "EntityType" ADD VALUE 'SPECIAL';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "designRequestId" TEXT,
ADD COLUMN     "specialDesignId" TEXT;

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "designRequestId" TEXT,
ADD COLUMN     "specialDesignId" TEXT;

-- CreateTable
CREATE TABLE "DesignRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "quoteId" TEXT,
    "clientId" TEXT,
    "interno" BOOLEAN NOT NULL DEFAULT false,
    "designerId" TEXT,
    "imagen" TEXT,
    "descripcion" TEXT,
    "datosEntrada" TEXT,
    "requisitosTecnicos" TEXT,
    "requisitosFuncionales" TEXT,
    "posiblesFallos" TEXT,
    "requisitosLegales" TEXT,
    "disenosPrevios" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PT precio comercial',
    "despiece" TEXT,
    "armadoGeneral" TEXT,
    "planosTecnicos" TEXT,
    "nPedidoOfimatica" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DesignRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialDesign" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "designRequestId" TEXT,
    "orderId" TEXT,
    "creadorId" TEXT,
    "tipo" TEXT,
    "descripcion" TEXT,
    "imagen" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'EN DISEÑO',
    "precioVentaPublico" DECIMAL(15,2),
    "precioVentaDto" DECIMAL(15,2),
    "cantRequerida" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialDesignMessage" (
    "id" TEXT NOT NULL,
    "specialDesignId" TEXT NOT NULL,
    "userId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialDesignMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesignRequest_companyId_estado_idx" ON "DesignRequest"("companyId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "DesignRequest_companyId_numero_key" ON "DesignRequest"("companyId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialDesign_designRequestId_key" ON "SpecialDesign"("designRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialDesign_companyId_codigo_key" ON "SpecialDesign"("companyId", "codigo");

-- AddForeignKey
ALTER TABLE "DesignRequest" ADD CONSTRAINT "DesignRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignRequest" ADD CONSTRAINT "DesignRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignRequest" ADD CONSTRAINT "DesignRequest_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDesign" ADD CONSTRAINT "SpecialDesign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDesign" ADD CONSTRAINT "SpecialDesign_designRequestId_fkey" FOREIGN KEY ("designRequestId") REFERENCES "DesignRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDesign" ADD CONSTRAINT "SpecialDesign_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDesign" ADD CONSTRAINT "SpecialDesign_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDesignMessage" ADD CONSTRAINT "SpecialDesignMessage_specialDesignId_fkey" FOREIGN KEY ("specialDesignId") REFERENCES "SpecialDesign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDesignMessage" ADD CONSTRAINT "SpecialDesignMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
