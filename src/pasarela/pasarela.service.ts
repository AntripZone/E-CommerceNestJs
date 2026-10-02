import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CanalVenta,
  EstadoPago,
  EstadoVenta,
  MetodoPago,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface IntencionMockPay {
  id_transaccion: string;
  checkout_url: string;
}

interface TransaccionMockPay {
  id: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  amount: number;
  currency: string;
  failureReason?: string | null;
}

@Injectable()
export class PasarelaService {
  private readonly logger = new Logger(PasarelaService.name);
  private readonly apiUrl: string;
  private readonly secretKey: string;
  private readonly moneda: string;

  private async llamarMockPay<T>(
    method: 'GET' | 'POST',
    ruta: string,
    body?: unknown,
  ): Promise<T> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.apiUrl}${ruta}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),

        signal: AbortSignal.timeout(70_000),
      });
    } catch {
      throw new BadGatewayException('No se pudo conectar con MockPay');
    }

    const data = (await respuesta.json().catch(() => ({}))) as {
      message?: string;
    };
    if (!respuesta.ok)
      throw new BadGatewayException(
        `MockPay respondió ${respuesta.status}: ${data.message ?? 'sin detalle'}`,
      );

    return data as T;
  }

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.apiUrl = config
      .getOrThrow<string>('MOCKPAY_API_URL')
      .replace(/\/+$/, '');
    this.secretKey = config.getOrThrow<string>('MOCKPAY_SECRET_KEY');
    this.moneda = config.get<string>('MOCKPAY_CURRENCY') ?? 'PEN';
  }

  async iniciarPago(ventaId: number, clienteId: number) {
    const pedido = await this.prisma.venta.findFirst({
      where: { id: ventaId, clienteId, canal: CanalVenta.WEB },
      include: { pagos: true },
    });
    if (!pedido)
      throw new NotFoundException(`Pedido con ID: ${ventaId} no encontrado.`);
    if (pedido.estado !== EstadoVenta.PENDIENTE)
      throw new ConflictException(
        `El pedido ${pedido.folio} está ${pedido.estado} y no se puede pagar`,
      );
    if (pedido.pagos.some((pedido) => pedido.estado === EstadoPago.CONFIRMADO))
      throw new ConflictException(`El pedido ${pedido.folio} ya fue pagado`);

    const intencion = await this.llamarMockPay<IntencionMockPay>(
      'POST',
      '/api/v1/payments',
      {
        amount: Number(pedido.total),
        currency: this.moneda,
        metadata: { order_id: String(pedido.id), folio: pedido.folio },
      },
    );

    const transaccionId = intencion.id_transaccion;

    await this.prisma.pago.create({
      data: {
        ventaId: pedido.id,
        metodo: MetodoPago.TARJETA,
        monto: pedido.total,
        referencia: transaccionId,
        estado: EstadoPago.PENDIENTE,
      },
    });

    return {
      folio: pedido.folio,
      total: pedido.total,
      transaccionId,
      checkoutUrl: intencion.checkout_url,
    };
  }

  async procesarWebhook(body: Record<string, unknown>) {
    this.logger.log(`Webhook recibido: ${JSON.stringify(body)}`);

    const datos = body ?? {};
    const transaccionId = body.id ?? body.id_transaccion ?? body.transaction_id;
    if (typeof transaccionId !== 'string' || !transaccionId)
      throw new BadRequestException('Webhook sin id de transacción');

    const transaccion = await this.llamarMockPay<TransaccionMockPay>(
      'GET',
      `/api/v1/payments/${encodeURIComponent(transaccionId)}`,
    );

    const pago = await this.prisma.pago.findFirst({
      where: { referencia: transaccionId, metodo: MetodoPago.TARJETA },
    });
    if (!pago) {
      this.logger.warn(`Webhook de transacción desconocida: ${transaccionId}`);
      return { recibido: true };
    }
    if (Number(transaccion.amount) !== Number(pago.monto)) {
      this.logger.warn(
        `Monto no coincide en ${transaccionId}: MockPay ${transaccion.amount}, pago ${pago.monto}`,
      );
      return { recibido: true };
    }
    if (transaccion.status === 'PENDING') return { recibido: true };

    const exitoso = transaccion.status === 'SUCCEEDED';

    await this.prisma.$transaction(async (transaction) => {
      const actualizado = await transaction.pago.updateMany({
        where: { id: pago.id, estado: EstadoPago.PENDIENTE },
        data: {
          estado: exitoso ? EstadoPago.CONFIRMADO : EstadoPago.RECHAZADO,
        },
      });
      if (actualizado.count === 0 || !exitoso) return;

      const venta = await transaction.venta.updateMany({
        where: { id: pago.ventaId, estado: EstadoVenta.PENDIENTE },
        data: { estado: EstadoVenta.PAGADA },
      });
      if (venta.count === 0)
        this.logger.warn(
          `Pago ${transaccionId} confirmado pero el pedido ${pago.ventaId} ya no estaba PENDIENTE (revisar reembolso)`,
        );
    });

    return { recibido: true };
  }
}
