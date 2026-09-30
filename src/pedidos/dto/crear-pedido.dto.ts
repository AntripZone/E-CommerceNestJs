import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CanalVenta } from '../../generated/prisma/enums.js';
import { AgregarItemDto } from '../../ventas/dto/item-venta.dto.js';
import { DatosEnvioDto } from './datos-envio.dto.js';

const CANALES_PEDIDO = [CanalVenta.MARKETPLACE, CanalVenta.WEB] as const;

export class CrearPedidoDto {
  @ApiPropertyOptional({
    enum: CANALES_PEDIDO,
    default: CanalVenta.MARKETPLACE,
  })
  @IsOptional()
  @IsIn(CANALES_PEDIDO, { message: 'El canal debe ser MARKETPLACE o WEB' })
  canal?: CanalVenta;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'clienteId debe ser un número entero' })
  clienteId!: number;

  @ApiProperty({ type: [AgregarItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'El pedido debe tener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => AgregarItemDto)
  items!: AgregarItemDto[];

  @ApiProperty({ type: DatosEnvioDto })
  @ValidateNested()
  @Type(() => DatosEnvioDto)
  envio!: DatosEnvioDto;
}
