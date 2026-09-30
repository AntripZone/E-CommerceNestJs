import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { CanalVenta, EstadoVenta } from '../../generated/prisma/enums.js';

export class FiltrosVentaDto {
  @ApiPropertyOptional({
    example: '2026-09-30',
    description: 'Día a consultar (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener el formato YYYY-MM-DD',
  })
  fecha?: string;

  @ApiPropertyOptional({ enum: CanalVenta })
  @IsOptional()
  @IsEnum(CanalVenta, {
    message: 'El canal debe ser MOSTRADOR, WEB o MARKETPLACE',
  })
  canal?: CanalVenta;

  @ApiPropertyOptional({ enum: EstadoVenta })
  @IsOptional()
  @IsEnum(EstadoVenta, { message: 'Estado de venta no válido' })
  estado?: EstadoVenta;
}
