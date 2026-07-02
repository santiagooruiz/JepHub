-- AlterTable
ALTER TABLE "ErpSync" ADD COLUMN     "fechaCreacion" TIMESTAMP(3),
ADD COLUMN     "identificadorCotizacion" TEXT,
ADD COLUMN     "intentos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ultimoError" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT,
    "href" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_companyId_userId_leida_idx" ON "Notification"("companyId", "userId", "leida");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
