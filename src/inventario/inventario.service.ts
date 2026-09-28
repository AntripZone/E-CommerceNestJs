import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { CreateInventarioDto } from './dto/create-inventario.dto.js';
import { UpdateInventarioDto } from './dto/update-inventario.dto.js';
import { TipoMovimiento } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface MovimientoStock {
  productoId: number;
  usuarioId: number;
  cantidad: number; // + entra / - sale
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

  create(createInventarioDto: CreateInventarioDto) {
    return 'This action adds a new inventario';
  }

  findAll() {
    return `This action returns all inventario`;
  }

  findOne(id: number) {
    return `This action returns a #${id} inventario`;
  }

  update(id: number, updateInventarioDto: UpdateInventarioDto) {
    return `This action updates a #${id} inventario`;
  }

  remove(id: number) {
    return `This action removes a #${id} inventario`;
  }
}
