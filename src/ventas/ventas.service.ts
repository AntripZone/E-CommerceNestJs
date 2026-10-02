import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import {
  CanalVenta,
  EstadoPago,
  EstadoVenta,
  MetodoPago,
  TipoMovimiento,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { AbrirVentaDto } from './dto/abrir-venta.dto.js';
import { ActualizarItemDto, AgregarItemDto } from './dto/item-venta.dto.js';
import { CobrarVentaDto } from './dto/cobrar-venta.dto.js';
import { FiltrosVentaDto } from './dto/filtro-venta.dto.js';

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventario: InventarioService,
  ) {}

  private async obtenerPendiente(
    transaction: Prisma.TransactionClient,
    ventaId: number,
  ) {
    const venta = await transaction.venta.findUnique({
      where: { id: ventaId },
    });
    if (!venta)
      throw new NotFoundException(`Venta con ID: ${ventaId} no encontrada.`);
    if (venta.estado !== EstadoVenta.PENDIENTE)
      throw new ConflictException(
        `La venta ${venta.folio} está ${venta.estado} y ya no se puede modificar`,
      );

    return venta;
  }

  private async obtenerItem(
    transaction: Prisma.TransactionClient,
    ventaId: number,
    productoId: number,
  ) {
    const item = await transaction.ventaDetalle.findUnique({
      where: { ventaId_productoId: { ventaId, productoId } },
    });
    if (!item)
      throw new NotFoundException(
        `El producto ${productoId} no está en el carrito`,
      );

    return item;
  }

  private async guardarItem(
    transaction: Prisma.TransactionClient,
    ventaId: number,
    productoId: number,
    cantidad: number,
  ) {
    const producto = await transaction.producto.findUnique({
      where: { id: productoId },
    });
    if (!producto || !producto.activo)
      throw new NotFoundException(
        `Producto con ID: ${productoId} no existe o está inactivo.`,
      );

    // Aviso temprano; la validación definitiva ocurre al cobrar
    if (producto.stock < cantidad)
      throw new ConflictException(
        `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, solicitado: ${cantidad}`,
      );

    const linea = {
      cantidad,
      precioUnitario: producto.precioVenta,
      costoUnitario: producto.precioCompra,
      subtotal: producto.precioVenta.mul(cantidad),
    };

    return transaction.ventaDetalle.upsert({
      where: { ventaId_productoId: { ventaId, productoId } },
      create: { ventaId, productoId, ...linea },
      update: linea,
    });
  }

  private async recalcularTotales(
    transaction: Prisma.TransactionClient,
    ventaId: number,
    descuento: Prisma.Decimal,
  ) {
    const { _sum } = await transaction.ventaDetalle.aggregate({
      where: { ventaId },
      _sum: { subtotal: true },
    });
    const subtotal = _sum.subtotal ?? new Prisma.Decimal(0);

    return transaction.venta.update({
      where: { id: ventaId },
      data: { subtotal, total: Prisma.Decimal.max(subtotal.sub(descuento), 0) },
    });
  }

  private aplicarCambio(cobrarVentaDto: CobrarVentaDto, total: Prisma.Decimal) {
    const recibido = cobrarVentaDto.pagos.reduce(
      (suma, pago) => suma.add(pago.monto),
      new Prisma.Decimal(0),
    );
    if (recibido.lessThan(total))
      throw new BadRequestException(
        `Pago insuficiente. Total: ${total.toFixed(2)}, recibido: ${recibido.toFixed(2)}`,
      );

    const cambio = recibido.sub(total);
    const efectivo = cobrarVentaDto.pagos
      .filter((pago) => pago.metodo === MetodoPago.EFECTIVO)
      .reduce((suma, pago) => suma.add(pago.monto), new Prisma.Decimal(0));
    if (cambio.greaterThan(efectivo))
      throw new BadRequestException(
        'Los pagos con tarjeta o transferencia no pueden exceder el total',
      );

    let porDescontar = cambio;
    const registrados = cobrarVentaDto.pagos
      .map((pago) => {
        let monto = new Prisma.Decimal(pago.monto);
        if (
          pago.metodo === MetodoPago.EFECTIVO &&
          porDescontar.greaterThan(0)
        ) {
          const quitar = Prisma.Decimal.min(monto, porDescontar);
          monto = monto.sub(quitar);
          porDescontar = porDescontar.sub(quitar);
        }
        return { ...pago, monto };
      })
      .filter((pago) => pago.monto.greaterThan(0));

    return { recibido, cambio, registrados };
  }

  private async construirComprobante(
    cliente: Prisma.TransactionClient,
    ventaId: number,
  ) {
    const venta = await cliente.venta.findUniqueOrThrow({
      where: { id: ventaId },
      include: {
        detalles: {
          include: { producto: { select: { nombre: true, sku: true } } },
          orderBy: { id: 'asc' },
        },
        pagos: { orderBy: { id: 'asc' } },
        cliente: { select: { nombre: true, telefono: true } },
        usuario: { select: { nombre: true } },
      },
    });

    return {
      folio: venta.folio,
      fecha: venta.updatedAt,
      canal: venta.canal,
      estado: venta.estado,
      cajero: venta.usuario?.nombre ?? 'Tienda en linea',
      cliente: venta.cliente,
      items: venta.detalles.map((detalle) => ({
        producto: detalle.producto.nombre,
        sku: detalle.producto.sku,
        cantidad: detalle.cantidad,
        precioUnitario: detalle.precioUnitario,
        subtotal: detalle.subtotal,
      })),
      subtotal: venta.subtotal,
      descuento: venta.descuento,
      total: venta.total,
      pagos: venta.pagos.map((pago) => ({
        metodo: pago.metodo,
        monto: pago.monto,
        referencia: pago.referencia,
      })),
    };
  }

  private hoy() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  /****************************************************** */

  async abrir(abrirVentaDto: AbrirVentaDto, usuarioId: number) {
    if (abrirVentaDto.clienteId !== undefined) {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: abrirVentaDto.clienteId },
      });
      if (!cliente)
        throw new NotFoundException(
          `Cliente con ID: ${abrirVentaDto.clienteId} no encontrado.`,
        );
    }

    return this.prisma.$transaction(async (transaction) => {
      const venta = await transaction.venta.create({
        data: {
          folio: randomUUID().slice(0, 20),
          canal: abrirVentaDto.canal ?? CanalVenta.MOSTRADOR,
          clienteId: abrirVentaDto.clienteId,
          usuarioId,
          subtotal: 0,
          total: 0,
        },
      });

      return transaction.venta.update({
        where: { id: venta.id },
        data: { folio: `V-${String(venta.id).padStart(6, '0')}` },
      });
    });
  }

  async agregarItem(ventaId: number, agregarItemDto: AgregarItemDto) {
    const { productoId, cantidad } = agregarItemDto;

    await this.prisma.$transaction(async (transaction) => {
      const venta = await this.obtenerPendiente(transaction, ventaId);
      const existente = await transaction.ventaDetalle.findUnique({
        where: { ventaId_productoId: { ventaId, productoId } },
      });

      await this.guardarItem(
        transaction,
        ventaId,
        productoId,
        (existente?.cantidad ?? 0) + cantidad,
      );
      await this.recalcularTotales(transaction, venta.id, venta.descuento);
    });

    return this.findOne(ventaId);
  }

  async actualizarItem(
    ventaId: number,
    productoId: number,
    actualizarItemDto: ActualizarItemDto,
  ) {
    await this.prisma.$transaction(async (transaction) => {
      const venta = await this.obtenerPendiente(transaction, ventaId);
      await this.obtenerItem(transaction, ventaId, productoId);

      await this.guardarItem(
        transaction,
        ventaId,
        productoId,
        actualizarItemDto.cantidad,
      );
      await this.recalcularTotales(transaction, venta.id, venta.descuento);
    });

    return this.findOne(ventaId);
  }

  async quitarItem(ventaId: number, productoId: number) {
    await this.prisma.$transaction(async (transaction) => {
      const venta = await this.obtenerPendiente(transaction, ventaId);
      await this.obtenerItem(transaction, ventaId, productoId);

      await transaction.ventaDetalle.delete({
        where: { ventaId_productoId: { ventaId, productoId } },
      });
      await this.recalcularTotales(transaction, venta.id, venta.descuento);
    });

    return this.findOne(ventaId);
  }

  async cobrar(
    ventaId: number,
    cobrarVentaDto: CobrarVentaDto,
    usuarioId: number,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const venta = await this.obtenerPendiente(transaction, ventaId);
      const detalles = await transaction.ventaDetalle.findMany({
        where: { ventaId },
        orderBy: { productoId: 'asc' },
      });
      if (detalles.length === 0)
        throw new BadRequestException('El carrito está vacío');

      const bloqueo = await transaction.venta.updateMany({
        where: { id: ventaId, estado: EstadoVenta.PENDIENTE },
        data: { estado: EstadoVenta.PAGADA },
      });
      if (bloqueo.count === 0)
        throw new ConflictException(`La venta ${venta.folio} ya fue procesada`);

      const subtotal = detalles.reduce(
        (suma, detalle) => suma.add(detalle.subtotal),
        new Prisma.Decimal(0),
      );
      const descuento = new Prisma.Decimal(cobrarVentaDto.descuento ?? 0);
      if (descuento.greaterThan(subtotal))
        throw new BadRequestException(
          'El descuento no puede ser mayor al subtotal',
        );
      const total = subtotal.sub(descuento);

      const pagos = this.aplicarCambio(cobrarVentaDto, total);

      for (const detalle of detalles) {
        await this.inventario.moverStock(transaction, {
          productoId: detalle.productoId,
          usuarioId,
          ventaId,
          cantidad: -detalle.cantidad,
          tipo: TipoMovimiento.VENTA,
        });
      }

      await transaction.pago.createMany({
        data: pagos.registrados.map((p) => ({
          ventaId,
          metodo: p.metodo,
          monto: p.monto,
          referencia: p.referencia,
          estado: EstadoPago.CONFIRMADO,
        })),
      });

      await transaction.venta.update({
        where: { id: ventaId },
        data: { subtotal, descuento, total },
      });

      return {
        comprobante: await this.construirComprobante(transaction, ventaId),
        recibido: pagos.recibido,
        cambio: pagos.cambio,
      };
    });
  }

  //Mi historial
  async findAll(filtros: FiltrosVentaDto) {
    const fecha = filtros.fecha ?? this.hoy();
    const inicio = new Date(`${fecha}T00:00:00`);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 1);

    const where: Prisma.VentaWhereInput = {
      createdAt: { gte: inicio, lt: fin },
      canal: filtros.canal,
      estado: filtros.estado,
    };

    const [ventas, resumen] = await Promise.all([
      this.prisma.venta.findMany({
        where,
        include: {
          cliente: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
          _count: { select: { detalles: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.venta.aggregate({
        where: { ...where, estado: EstadoVenta.PAGADA },
        _count: true,
        _sum: { total: true },
      }),
    ]);

    return {
      fecha,
      ventasPagadas: resumen._count,
      totalVendido: resumen._sum.total ?? new Prisma.Decimal(0),
      ventas,
    };
  }

  async comprobante(id: number) {
    await this.findOne(id);
    return this.construirComprobante(this.prisma, id);
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

      const descontado = await transaction.movimientoInventario.count({
        where: { ventaId: id, tipo: TipoMovimiento.VENTA },
      });
      const detalles =
        descontado > 0
          ? await transaction.ventaDetalle.findMany({
              where: { ventaId: id },
              orderBy: { productoId: 'asc' },
            })
          : [];

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
