-- CreateEnum
CREATE TYPE "ClientOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClientOrderPaymentStatus" AS ENUM ('PAID', 'PENDING', 'PARTIALLY_PAID', 'REFUNDED');

-- CreateTable
CREATE TABLE "ClientOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "ClientOrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "ClientOrderPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "assignedStaffId" TEXT,
    "assignedStaffName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientOrder_tenantId_orderNumber_key" ON "ClientOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "ClientOrder_tenantId_status_idx" ON "ClientOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ClientOrder_tenantId_paymentStatus_idx" ON "ClientOrder"("tenantId", "paymentStatus");

-- CreateIndex
CREATE INDEX "ClientOrder_tenantId_orderDate_idx" ON "ClientOrder"("tenantId", "orderDate");

-- CreateIndex
CREATE INDEX "ClientOrder_tenantId_customerId_idx" ON "ClientOrder"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "ClientOrder_tenantId_productId_idx" ON "ClientOrder"("tenantId", "productId");

-- AddForeignKey
ALTER TABLE "ClientOrder" ADD CONSTRAINT "ClientOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientOrder" ADD CONSTRAINT "ClientOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientOrder" ADD CONSTRAINT "ClientOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
