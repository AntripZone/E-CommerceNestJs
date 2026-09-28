import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateVentaDto } from './dto/create-venta.dto.js';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import { EstadoVenta, TipoMovimiento } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventarioService } from '../inventario/inventario.service.js';

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventario: InventarioService,
  ) {}

  async create(createVentaDto: CreateVentaDto, usuarioId: number) {
    const itemsId = createVentaDto.items.map((i) => i.productoId);

    if (new Set(itemsId).size !== itemsId.length)
      throw new BadRequestException('Hay productos repetidos en la venta');

    return this.prisma.$transaction(async (transaction) => {
      const productos = await transaction.producto.findMany({
        where: {
          id: {
            in: itemsId,
          },
          activo: true,
        },
      });

      if (productos.length !== itemsId.length)
        throw new NotFoundException(
          'Uno o más productos no existen o están inactivos',
        );

      const detalles = createVentaDto.items.map((item) => {
        const prod = productos.find((p) => p.id === item.productoId)!;

        return {
          productoId: prod.id,
          cantidad: item.cantidad,
          precioUnitario: prod.precioVenta,
          costoUnitario: prod.precioCompra,
          subtotal: prod.precioVenta.mul(item.cantidad),
        };
      });

      const subtotal = detalles.reduce(
        (cuenta, desc) => cuenta.add(desc.subtotal),
        new Prisma.Decimal(0),
      );
      const descuento = new Prisma.Decimal(createVentaDto.descuento ?? 0);
      if (descuento.greaterThan(subtotal))
        throw new BadRequestException(
          'El descuento no puede ser mayor al subtotal',
        );

      const venta = await transaction.venta.create({
        data: {
          folio: randomUUID().slice(0, 20),
          canal: createVentaDto.canal,
          clienteId: createVentaDto.clienteId,
          usuarioId,
          subtotal,
          descuento,
          total: subtotal.sub(descuento),
          detalles: { create: detalles },
        },
      });

      for (const detalle of [...detalles].sort(
        (a, b) => a.productoId - b.productoId,
      )) {
        await this.inventario.moverStock(transaction, {
          productoId: detalle.productoId,
          usuarioId,
          ventaId: venta.id,
          cantidad: -detalle.cantidad,
          tipo: TipoMovimiento.VENTA,
        });
      }

      return transaction.venta.update({
        where: { id: venta.id },
        data: { folio: `V-${String(venta.id).padStart(6, '0')}` },
        include: { detalles: true },
      });
    });
  }

  async findAll() {
    return this.prisma.venta.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: true,
        usuario: {
          select: {
            nombre: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: {
        detalles: {
          include: { producto: { select: { nombre: true, sku: true } } },
        },
        pagos: true,
        envio: true,
        cliente: true,
        usuario: { select: { nombre: true } },
      },
    });

    if (!venta)
      throw new NotFoundException(`Venta con ID: ${id} no encontrada. `);

    return venta;
  }

  async cancelar(id: number, usuarioId: number) {
    return this.prisma.$transaction(async (transaction) => {
      const res = await transaction.venta.updateMany({
        where: {
          id,
          estado: {
            in: [EstadoVenta.PENDIENTE, EstadoVenta.PAGADA],
          },
        },
        data: { estado: EstadoVenta.CANCELADA },
      });

      if (res.count === 0)
        throw new ConflictException(
          `La venta ${id} no existe o ya fue enviada/cancelada`,
        );

      const detalles = await transaction.ventaDetalle.findMany({
        where: { ventaId: id },
        orderBy: { productoId: 'asc' },
      });

      for (const detalle of detalles) {
        await this.inventario.moverStock(transaction, {
          productoId: detalle.productoId,
          usuarioId,
          ventaId: id,
          cantidad: detalle.cantidad,
          tipo: TipoMovimiento.CANCELACION,
          motivo: 'Cancelacion de venta',
        });
      }
      return transaction.venta.findUnique({ where: { id } });
    });
  }
}
