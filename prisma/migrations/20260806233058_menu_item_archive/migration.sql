-- DropIndex
DROP INDEX "menu_items_restaurantId_isAvailable_idx";

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "menu_items_restaurantId_isArchived_isAvailable_idx" ON "menu_items"("restaurantId", "isArchived", "isAvailable");
