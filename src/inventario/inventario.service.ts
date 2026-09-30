import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { EntradaInventarioDto } from './dto/entrada-inventario.dto.js';
import { AjusteInventarioDto } from './dto/ajuste-inventario.dto.js';
import { FiltrosMovimientoDto } from './dto/filtros-movimiento.dto.js';
import { TipoMovimiento } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface MovimientoStock {
  productoId: number;
  usuarioId: number;
  cantidad: number;
  tipo: TipoMovimiento;
  ventaId?: number;
  motivo?: string;
}

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  async moverStock(
    transaction: Prisma.TransactionClient,
    movimiento: MovimientoStock,
  ) {
    const { productoId, cantidad } = movimiento;
    const res = await transaction.producto.updateMany({
      where: {
        id: productoId,
        ...(cantidad < 0 && { activo: true, stock: { gte: -cantidad } }),
      },
      data: { stock: { increment: cantidad }, version: { increment: 1 } },
    });

    if (res.count === 0) {
      const prod = await transaction.producto.findUnique({
        where: { id: productoId },
      });
      if (!prod)
        throw new NotFoundException(
          `Producto con ID: ${productoId} no encontrado.`,
        );
      if (!prod.activo)
        throw new BadRequestException(
          `El producto "${prod.nombre}" está inactivo.`,
        );
      throw new ConflictException(
        `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}`,
      );
    }

    const { stock } = await transaction.producto.findUniqueOrThrow({
      where: { id: productoId },
      select: { stock: true },
    });
    return transaction.movimientoInventario.create({
      data: {
        ...movimiento,
        stockAnterior: stock - cantidad,
        stockResultante: stock,
      },
    });
  }

  async registrarEntrada(
    entradaInventarioDto: EntradaInventarioDto,
    usuarioId: number,
  ) {
    const { productoId, cantidad, costoUnitario, motivo } =
      entradaInventarioDto;

    return this.prisma.$transaction(async (transaction) => {
      const movimiento = await this.moverStock(transaction, {
        productoId,
        usuarioId,
        cantidad,
        tipo: TipoMovimiento.ENTRADA,
        motivo,
      });

      if (costoUnitario !== undefined)
        await transaction.producto.update({
          where: { id: productoId },
          data: { precioCompra: costoUnitario },
        });

      return movimiento;
    });
  }

  async registrarAjuste(
    ajusteInventarioDto: AjusteInventarioDto,
    usuarioId: number,
  ) {
    return this.prisma.$transaction((transaction) =>
      this.moverStock(transaction, {
        ...ajusteInventarioDto,
        usuarioId,
        tipo: TipoMovimiento.AJUSTE,
      }),
    );
  }

  async findAll(filtros: FiltrosMovimientoDto) {
    const { productoId, tipo, desde, hasta } = filtros;

    return this.prisma.movimientoInventario.findMany({
      where: {
        productoId,
        tipo,
        ...((desde || hasta) && {
          createdAt: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(`${hasta}T23:59:59.999`) }),
          },
        }),
      },
      include: {
        producto: { select: { id: true, nombre: true, sku: true } },
        usuario: { select: { id: true, nombre: true } },
        venta: { select: { id: true, folio: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async historialProducto(productoId: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
      select: { id: true, nombre: true, sku: true, stock: true },
    });
    if (!producto)
      throw new NotFoundException(
        `Producto con ID: ${productoId} no encontrado.`,
      );
    const movimiento = await this.prisma.movimientoInventario.findMany({
      where: { producto },
      include: {
        usuario: { select: { id: true, nombre: true } },
        venta: { select: { id: true, folio: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { producto, movimiento };
  }

  async findOne(id: number) {
    const movimiento = await this.prisma.movimientoInventario.findUnique({
      where: { id },
      include: {
        producto: { select: { id: true, nombre: true, sku: true } },
        usuario: { select: { id: true, nombre: true } },
        venta: { select: { id: true, folio: true } },
      },
    });
    if (!movimiento)
      throw new NotFoundException(`Movimiento con ID: ${id} no encontrado.`);

    return movimiento;
  }
}
