import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { TipoMovimiento } from '../../generated/prisma/enums.js';

export class FiltrosMovimientoDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'productoId debe ser un número entero' })
  productoId?: number;

  @ApiPropertyOptional({ enum: TipoMovimiento })
  @IsOptional()
  @IsEnum(TipoMovimiento, {
    message:
      'El tipo debe ser ENTRADA, VENTA, AJUSTE, DEVOLUCION o CANCELACION',
  })
  tipo?: TipoMovimiento;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString({}, { message: 'desde debe ser una fecha válida' })
  desde?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsDateString({}, { message: 'hasta debe ser una fecha válida' })
  hasta?: string;
}
