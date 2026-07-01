-- CreateEnum
CREATE TYPE "ApprovalKind" AS ENUM ('INGRESO', 'FABRICACION', 'INSTALACION', 'FACTURACION');

-- AlterTable
ALTER TABLE "LineItem" ADD COLUMN     "orderId" TEXT;

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "quoteId" TEXT,
    "advisorId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente Ingreso',
    "tipoProducto" TEXT NOT NULL DEFAULT 'Estándar',
    "requiereInstalacion" BOOLEAN NOT NULL DEFAULT false,
    "formaPago" TEXT,
    "ordenCompra" TEXT,
    "direccionEnvio" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "impuesto" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderApproval" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "ApprovalKind" NOT NULL,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "observacion" TEXT,
    "fecha" TIMESTAMP(3),

    CONSTRAINT "OrderApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpSync" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "nPedidoOfimatica" TEXT,
    "estadoEnvio" TEXT,
    "fechaEnvio" TIMESTAMP(3),
    "fechaTapiceria" TIMESTAMP(3),
    "fechaListo" TIMESTAMP(3),
    "fechaDespacho" TIMESTAMP(3),
    "notasGenerales" TEXT,

    CONSTRAINT "ErpSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_quoteId_key" ON "Order"("quoteId");

-- CreateIndex
CREATE INDEX "Order_companyId_estado_idx" ON "Order"("companyId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Order_companyId_numero_key" ON "Order"("companyId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "OrderApproval_orderId_kind_key" ON "OrderApproval"("orderId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ErpSync_orderId_key" ON "ErpSync"("orderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderApproval" ADD CONSTRAINT "OrderApproval_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderApproval" ADD CONSTRAINT "OrderApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpSync" ADD CONSTRAINT "ErpSync_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineItem" ADD CONSTRAINT "LineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
