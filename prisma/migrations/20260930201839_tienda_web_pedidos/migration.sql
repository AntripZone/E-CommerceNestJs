/*
  Warnings:

  - You are about to drop the column `costo_envio` on the `envios` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `envios` table. All the data in the column will be lost.
  - You are about to drop the column `numero_guia` on the `envios` table. All the data in the column will be lost.
  - Added the required column `destinatario` to the `envios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telefono_contacto` to the `envios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "password_hash" VARCHAR(255);

-- AlterTable
ALTER TABLE "envios" DROP COLUMN "costo_envio",
DROP COLUMN "estado",
DROP COLUMN "numero_guia",
ADD COLUMN     "destinatario" VARCHAR(150) NOT NULL,
ADD COLUMN     "referencias" VARCHAR(255),
ADD COLUMN     "telefono_contacto" VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE "movimientos_inventario" ALTER COLUMN "usuario_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ventas" ALTER COLUMN "usuario_id" DROP NOT NULL;

-- DropEnum
DROP TYPE "EstadoEnvio";

-- CreateTable
CREATE TABLE "carritos" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrito_items" (
    "id" SERIAL NOT NULL,
    "carrito_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "carrito_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carritos_cliente_id_key" ON "carritos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "carrito_items_carrito_id_producto_id_key" ON "carrito_items"("carrito_id", "producto_id");

-- AddForeignKey
ALTER TABLE "carritos" ADD CONSTRAINT "carritos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito_items" ADD CONSTRAINT "carrito_items_carrito_id_fkey" FOREIGN KEY ("carrito_id") REFERENCES "carritos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrito_items" ADD CONSTRAINT "carrito_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
