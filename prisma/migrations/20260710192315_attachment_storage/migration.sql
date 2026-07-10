-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "nombre" TEXT,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "storageKey" TEXT;
