import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoVenta, MetodoPago } from '../../generated/prisma/enums.js';

export class CambiarEstadoPedidoDto {
  @ApiProperty({ enum: EstadoVenta, example: EstadoVenta.PAGADA })
  @IsEnum(EstadoVenta, {
    message:
      'El estado debe ser PENDIENTE, PAGADA, ENVIADA, ENTREGADA o CANCELADA',
  })
  estado!: EstadoVenta;

  @ApiPropertyOptional({
    enum: MetodoPago,
    description:
      'Obligatorio al pasar a PAGADA, o a ENTREGADA si aún no estaba pagado (contra entrega)',
  })
  @IsOptional()
  @IsEnum(MetodoPago, { message: 'Método de pago no válido' })
  metodoPago?: MetodoPago;

  @ApiPropertyOptional({ example: 'OP-778812' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  referenciaPago?: string;
}
