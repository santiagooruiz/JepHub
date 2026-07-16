-- CreateEnum
CREATE TYPE "LineItemTipo" AS ENUM ('PRODUCTO', 'CARATULA');

-- AlterTable
ALTER TABLE "LineItem" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "posicion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tipo" "LineItemTipo" NOT NULL DEFAULT 'PRODUCTO';

-- AddForeignKey
ALTER TABLE "LineItem" ADD CONSTRAINT "LineItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
