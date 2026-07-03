-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "aprobadoPor" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "estado" TEXT,
ADD COLUMN     "fechaAprobacion" TIMESTAMP(3),
ADD COLUMN     "firma" TEXT;
