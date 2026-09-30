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
  TipoMovimiento,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { CrearPedidoDto } from './dto/crear-pedido.dto.js';
import { CambiarEstadoPedidoDto } from './dto/cambiar-estado.dto.js';
import { FiltrosPedidoDto } from './dto/filtros-pedido.dto.js';
import { DatosEnvioDto } from './dto/datos-envio.dto.js';

export interface DatosPedido {
  canal: CanalVenta;
  clienteId: number;
  usuarioId: number | null;
  items: { productoId: number; cantidad: number }[];
  envio: DatosEnvioDto;
}

const TRANSICIONES: Record<EstadoVenta, EstadoVenta[]> = {
  PENDIENTE: [EstadoVenta.PAGADA, EstadoVenta.ENVIADA, EstadoVenta.CANCELADA],
  PAGADA: [EstadoVenta.ENVIADA, EstadoVenta.CANCELADA],
  ENVIADA: [EstadoVenta.ENTREGADA, EstadoVenta.CANCELADA],
  ENTREGADA: [],
  CANCELADA: [],
};

const CANALES_PEDIDO = [CanalVenta.WEB, CanalVenta.MARKETPLACE];

const COLA_ACTIVA = [
  EstadoVenta.PENDIENTE,
  EstadoVenta.PAGADA,
  EstadoVenta.ENVIADA,
];

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventario: InventarioService,
  ) {}

  async crear(crearPedidoDto: CrearPedidoDto, usuarioId: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: crearPedidoDto.clienteId },
    });
    if (!cliente)
      throw new NotFoundException(
        `Cliente con ID: ${crearPedidoDto.clienteId} no encontrado.`,
      );

    const pedido = await this.prisma.$transaction((transaction) =>
      this.crearEnTransaccion(transaction, {
        canal: crearPedidoDto.canal ?? CanalVenta.MARKETPLACE,
        clienteId: crearPedidoDto.clienteId,
        usuarioId,
        items: crearPedidoDto.items,
        envio: crearPedidoDto.envio,
      }),
    );

    return this.findOne(pedido.id);
  }

  async crearEnTransaccion(
    transaction: Prisma.TransactionClient,
    datos: DatosPedido,
  ) {
    const ids = datos.items.map((i) => i.productoId);
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('Hay productos repetidos en el pedido');

    const productos = await transaction.producto.findMany({
      where: {
        id: { in: ids },
        activo: true,
        ...(datos.canal === CanalVenta.WEB && { publicadoWeb: true }),
      },
    });
    if (productos.length !== ids.length)
      throw new NotFoundException(
        'Uno o más productos no existen o no están disponibles',
      );

    const detalles = datos.items.map((item) => {
      const producto = productos.find((p) => p.id === item.productoId)!;
      return {
        productoId: producto.id,
        cantidad: item.cantidad,
        precioUnitario: producto.precioVenta,
        costoUnitario: producto.precioCompra,
        subtotal: producto.precioVenta.mul(item.cantidad),
      };
    });

    const total = detalles.reduce(
      (suma, d) => suma.add(d.subtotal),
      new Prisma.Decimal(0),
    );

    const venta = await transaction.venta.create({
      data: {
        folio: randomUUID().slice(0, 20),
        canal: datos.canal,
        estado: EstadoVenta.PENDIENTE,
        clienteId: datos.clienteId,
        usuarioId: datos.usuarioId,
        subtotal: total,
        total,
        detalles: { create: detalles },
        envio: { create: datos.envio },
      },
    });

    for (const detalle of [...detalles].sort(
      (a, b) => a.productoId - b.productoId,
    )) {
      await this.inventario.moverStock(transaction, {
        productoId: detalle.productoId,
        usuarioId: datos.usuarioId,
        ventaId: venta.id,
        cantidad: -detalle.cantidad,
        tipo: TipoMovimiento.VENTA,
        motivo: `Pedido ${datos.canal}`,
      });
    }

    return transaction.venta.update({
      where: { id: venta.id },
      data: { folio: `P-${String(venta.id).padStart(6, '0')}` },
    });
  }

  async findCola(filtros: FiltrosPedidoDto) {
    return this.prisma.venta.findMany({
      where: {
        canal: filtros.canal ?? { in: CANALES_PEDIDO },
        estado: filtros.estado ?? { in: COLA_ACTIVA },
      },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true } },
        envio: true,
        _count: { select: { detalles: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: number, clienteId?: number) {
    const pedido = await this.prisma.venta.findFirst({
      where: {
        id,
        canal: { in: CANALES_PEDIDO },
        ...(clienteId !== undefined && { clienteId }),
      },
      include: {
        detalles: {
          omit: { costoUnitario: true },
          include: { producto: { select: { nombre: true, sku: true } } },
          orderBy: { id: 'asc' },
        },
        pagos: true,
        envio: true,
        cliente: { omit: { passwordHash: true } },
        usuario: { select: { nombre: true } },
      },
    });
    if (!pedido)
      throw new NotFoundException(`Pedido con ID: ${id} no encontrado.`);

    return pedido;
  }

  async findDeCliente(clienteId: number) {
    return this.prisma.venta.findMany({
      where: { clienteId, canal: { in: CANALES_PEDIDO } },
      include: { envio: true, _count: { select: { detalles: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cambiarEstado(
    id: number,
    cambiarEstadoDto: CambiarEstadoPedidoDto,
    usuarioId: number,
  ) {
    const { estado: nuevo, metodoPago, referenciaPago } = cambiarEstadoDto;

    await this.prisma.$transaction(async (transaction) => {
      const pedido = await transaction.venta.findFirst({
        where: { id, canal: { in: CANALES_PEDIDO } },
        include: { pagos: true, detalles: { orderBy: { productoId: 'asc' } } },
      });
      if (!pedido)
        throw new NotFoundException(`Pedido con ID: ${id} no encontrado.`);

      if (!TRANSICIONES[pedido.estado].includes(nuevo))
        throw new BadRequestException(
          `No se puede pasar de ${pedido.estado} a ${nuevo}. Permitidos: ${
            TRANSICIONES[pedido.estado].join(', ') || 'ninguno'
          }`,
        );

      const res = await transaction.venta.updateMany({
        where: { id, estado: pedido.estado },
        data: { estado: nuevo },
      });
      if (res.count === 0)
        throw new ConflictException(
          `El pedido ${pedido.folio} cambió de estado, vuelve a consultarlo`,
        );

      const yaPagado = pedido.pagos.some(
        (p) => p.estado === EstadoPago.CONFIRMADO,
      );
      if (
        nuevo === EstadoVenta.PAGADA ||
        (nuevo === EstadoVenta.ENTREGADA && !yaPagado)
      ) {
        if (!metodoPago)
          throw new BadRequestException(
            'Indica metodoPago para registrar el pago del pedido',
          );
        await transaction.pago.create({
          data: {
            ventaId: id,
            metodo: metodoPago,
            monto: pedido.total,
            referencia: referenciaPago,
            estado: EstadoPago.CONFIRMADO,
          },
        });
      }

      if (nuevo === EstadoVenta.ENTREGADA)
        await transaction.envio.update({
          where: { ventaId: id },
          data: { fechaEntrega: new Date() },
        });

      if (nuevo === EstadoVenta.CANCELADA)
        for (const detalle of pedido.detalles) {
          await this.inventario.moverStock(transaction, {
            productoId: detalle.productoId,
            usuarioId,
            ventaId: id,
            cantidad: detalle.cantidad,
            tipo: TipoMovimiento.CANCELACION,
            motivo: `Cancelación de pedido ${pedido.folio}`,
          });
        }
    });

    return this.findOne(id);
  }
}
