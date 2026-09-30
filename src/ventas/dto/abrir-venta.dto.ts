import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, ValidateIf } from 'class-validator';
import { CanalVenta } from '../../generated/prisma/enums.js';

export class AbrirVentaDto {
  @ApiPropertyOptional({
    enum: CanalVenta,
    default: CanalVenta.MOSTRADOR,
  })
  @IsOptional()
  @IsEnum(CanalVenta, {
    message: 'El canal debe ser MOSTRADOR, WEB o MARKETPLACE',
  })
  canal?: CanalVenta;

  @ApiPropertyOptional({ example: 1, description: 'Opcional en mostrador' })
  @ValidateIf(
    (o) =>
      (o.canal !== undefined && o.canal !== CanalVenta.MOSTRADOR) ||
      o.clienteId !== undefined,
  )
  @IsInt({ message: 'clienteId es obligatorio para ventas WEB o MARKETPLACE' })
  clienteId?: number;
}
