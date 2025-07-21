-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paypalOrderId" TEXT,
ADD COLUMN     "paypalPayer" TEXT;
