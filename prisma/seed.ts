import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { Rol, TipoMovimiento } from '../src/generated/prisma/enums.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@pos.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@pos.com',
      passwordHash: await bcrypt.hash('Admin12345', 10),
      rol: Rol.ADMIN,
    },
  });
  await prisma.usuario.upsert({
    where: { email: 'cajero@pos.com' },
    update: {},
    create: {
      nombre: 'Cajero Mostrador',
      email: 'cajero@pos.com',
      passwordHash: await bcrypt.hash('Cajero12345', 10),
      rol: Rol.CAJERO,
    },
  });

  await prisma.cliente.upsert({
    where: { email: 'cliente@pos.com' },
    update: {},
    create: {
      nombre: 'María López',
      telefono: '987654321',
      email: 'cliente@pos.com',
      direccion: 'Av. España 1234, Trujillo',
      passwordHash: await bcrypt.hash('Cliente12345', 10),
    },
  });

  await prisma.cliente.upsert({
    where: { email: 'luis.marketplace@gmail.com' },
    update: {},
    create: {
      nombre: 'Luis Ramírez',
      telefono: '912345678',
      email: 'luis.marketplace@gmail.com',
      direccion: 'Jr. Pizarro 456, Trujillo',
    },
  });

  const categorias = ['Ropa', 'Calzado', 'Accesorios', 'Electrónica'];
  const idCategoria: Record<string, number> = {};
  for (const nombre of categorias) {
    const slug = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const categoria = await prisma.categoria.upsert({
      where: { slug },
      update: {},
      create: { nombre, slug },
    });
    idCategoria[nombre] = categoria.id;
  }

  const productos: [
    string,
    string,
    string,
    number,
    number,
    number,
    number,
    boolean,
  ][] = [
    ['ROP-POLO-BLA-M', 'Polo algodón blanco M', 'Ropa', 18, 35, 25, 5, true],
    ['ROP-POLO-NEG-L', 'Polo algodón negro L', 'Ropa', 18, 35, 12, 5, true],
    ['ROP-JEAN-AZU-32', 'Jean clásico azul 32', 'Ropa', 55, 99.9, 8, 3, true],
    ['ROP-CASA-GRI-M', 'Casaca polar gris M', 'Ropa', 70, 129.9, 2, 3, true], // poco stock
    [
      'CAL-ZAP-URB-40',
      'Zapatilla urbana talla 40',
      'Calzado',
      90,
      169.9,
      6,
      2,
      true,
    ],
    [
      'CAL-SAN-PLA-38',
      'Sandalia de playa talla 38',
      'Calzado',
      15,
      29.9,
      0,
      2,
      true,
    ],
    [
      'ACC-GORRA-NEG',
      'Gorra negra ajustable',
      'Accesorios',
      12,
      25,
      1,
      2,
      true,
    ],
    ['ACC-MOCH-URB', 'Mochila urbana 20L', 'Accesorios', 45, 89.9, 10, 2, true],
    ['ELE-AUD-BT', 'Audífonos Bluetooth', 'Electrónica', 60, 119.9, 7, 2, true],
    [
      'ELE-CARG-20W',
      'Cargador rápido 20W',
      'Electrónica',
      20,
      45,
      15,
      5,
      false,
    ],
  ];

  for (const [
    sku,
    nombre,
    categoria,
    compra,
    venta,
    stock,
    minimo,
    web,
  ] of productos) {
    if (await prisma.producto.findUnique({ where: { sku } })) continue;

    await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: {
          sku,
          nombre,
          categoriaId: idCategoria[categoria],
          precioCompra: compra,
          precioVenta: venta,
          stock,
          stockMinimo: minimo,
          publicadoWeb: web,
        },
      });
      if (stock > 0)
        await tx.movimientoInventario.create({
          data: {
            productoId: producto.id,
            usuarioId: admin.id,
            tipo: TipoMovimiento.ENTRADA,
            cantidad: stock,
            stockAnterior: 0,
            stockResultante: stock,
            motivo: 'Inventario inicial (seed)',
          },
        });
    });
  }

  console.log('Seed completado ✔');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
