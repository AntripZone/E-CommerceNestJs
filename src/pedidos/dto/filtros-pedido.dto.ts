import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CanalVenta, EstadoVenta } from '../../generated/prisma/enums.js';

export class FiltrosPedidoDto {
  @ApiPropertyOptional({
    enum: EstadoVenta,
    description:
      'Sin filtro: muestra la cola activa (PENDIENTE, PAGADA, ENVIADA)',
  })
  @IsOptional()
  @IsEnum(EstadoVenta, { message: 'Estado no válido' })
  estado?: EstadoVenta;

  @ApiPropertyOptional({ enum: [CanalVenta.WEB, CanalVenta.MARKETPLACE] })
  @IsOptional()
  @IsEnum(CanalVenta, { message: 'Canal no válido' })
  canal?: CanalVenta;
}
