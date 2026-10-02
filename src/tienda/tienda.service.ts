import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { CanalVenta } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PedidosService } from '../pedidos/pedidos.service.js';
import { DatosEnvioDto } from '../pedidos/dto/datos-envio.dto.js';
import {
  ActualizarItemDto,
  AgregarItemDto,
} from '../ventas/dto/item-venta.dto.js';

@Injectable()
export class TiendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pedidosService: PedidosService,
  ) {}

  private async obtenerItem(clienteId: number, productoId: number) {
    const item = await this.prisma.carritoItem.findFirst({
      where: { productoId, carrito: { clienteId } },
    });
    if (!item)
      throw new NotFoundException(
        `El producto ${productoId} no está en tu carrito`,
      );

    return item;
  }

  private async validarDisponible(productoId: number, cantidad: number) {
    const producto = await this.prisma.producto.findFirst({
      where: { id: productoId, activo: true, publicadoWeb: true },
    });
    if (!producto)
      throw new NotFoundException(
        `Producto con ID: ${productoId} no disponible en la tienda.`,
      );
    if (producto.stock === 0)
      throw new ConflictException(`"${producto.nombre}" está agotado`);
    if (producto.stock < cantidad)
      throw new ConflictException(
        `Solo quedan ${producto.stock} unidades de "${producto.nombre}"`,
      );
  }

  async obtenerCarrito(clienteId: number) {
    const carrito = await this.prisma.carrito.upsert({
      where: { clienteId },
      create: { clienteId },
      update: {},
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                precioVenta: true,
                stock: true,
                activo: true,
                publicadoWeb: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    const items = carrito.items.map((item) => ({
      productoId: item.productoId,
      nombre: item.producto.nombre,
      precioUnitario: item.producto.precioVenta,
      cantidad: item.cantidad,
      subtotal: item.producto.precioVenta.mul(item.cantidad),
      // Pudo agotarse en mostrador después de añadirlo al carrito
      disponible:
        item.producto.activo &&
        item.producto.publicadoWeb &&
        item.producto.stock >= item.cantidad,
      stockDisponible: item.producto.stock,
    }));

    return {
      items,
      total: items.reduce(
        (suma, i) => suma.add(i.subtotal),
        new Prisma.Decimal(0),
      ),
      puedeConfirmar: items.length > 0 && items.every((i) => i.disponible),
    };
  }

  async agregarItem(clienteId: number, agregarItemDto: AgregarItemDto) {
    const { productoId, cantidad } = agregarItemDto;
    const carrito = await this.prisma.carrito.upsert({
      where: { clienteId },
      create: { clienteId },
      update: {},
    });
    const existente = await this.prisma.carritoItem.findUnique({
      where: { carritoId_productoId: { carritoId: carrito.id, productoId } },
    });
    const nuevaCantidad = (existente?.cantidad ?? 0) + cantidad;
    await this.validarDisponible(productoId, nuevaCantidad);

    await this.prisma.carritoItem.upsert({
      where: { carritoId_productoId: { carritoId: carrito.id, productoId } },
      create: { carritoId: carrito.id, productoId, cantidad: nuevaCantidad },
      update: { cantidad: nuevaCantidad },
    });

    return this.obtenerCarrito(clienteId);
  }

  async actualizarItem(
    clienteId: number,
    productoId: number,
    actualizarItemDto: ActualizarItemDto,
  ) {
    const item = await this.obtenerItem(clienteId, productoId);
    await this.validarDisponible(productoId, actualizarItemDto.cantidad);

    await this.prisma.carritoItem.update({
      where: { id: item.id },
      data: { cantidad: actualizarItemDto.cantidad },
    });

    return this.obtenerCarrito(clienteId);
  }

  async quitarItem(clienteId: number, productoId: number) {
    const item = await this.obtenerItem(clienteId, productoId);
    await this.prisma.carritoItem.delete({ where: { id: item.id } });

    return this.obtenerCarrito(clienteId);
  }

  async confirmar(clienteId: number, datosEnvioDto: DatosEnvioDto) {
    const pedido = await this.prisma.$transaction(async (transaction) => {
      const carrito = await transaction.carrito.findUnique({
        where: { clienteId },
        include: { items: true },
      });
      if (!carrito || carrito.items.length === 0)
        throw new BadRequestException('El carrito está vacío');

      const creado = await this.pedidosService.crearEnTransaccion(transaction, {
        canal: CanalVenta.WEB,
        clienteId,
        usuarioId: null,
        items: carrito.items.map((i) => ({
          productoId: i.productoId,
          cantidad: i.cantidad,
        })),
        envio: datosEnvioDto,
      });

      await transaction.carritoItem.deleteMany({
        where: { carritoId: carrito.id },
      });

      return creado;
    });

    return this.pedidosService.findOne(pedido.id, clienteId);
  }

  misPedidos(clienteId: number) {
    return this.pedidosService.findDeCliente(clienteId);
  }

  miPedido(clienteId: number, id: number) {
    return this.pedidosService.findOne(id, clienteId);
  }
}
