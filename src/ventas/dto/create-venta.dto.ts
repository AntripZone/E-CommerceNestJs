import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CanalVenta } from '../../generated/prisma/enums.js';

export class ItemVentaDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'productoId debe ser un entero' })
  productoId!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1, { message: 'La cantidad mínima es 1' })
  cantidad!: number;
}

export class CreateVentaDto {
  @ApiProperty({ enum: CanalVenta, example: CanalVenta.MOSTRADOR })
  @IsEnum(CanalVenta, {
    message: 'El canal debe ser MOSTRADOR, WEB o MARKETPLACE',
  })
  canal!: CanalVenta;

  @ApiPropertyOptional({ example: 1 })
  @ValidateIf(
    (o) => o.canal !== CanalVenta.MOSTRADOR || o.clienteId !== undefined,
  )
  @IsInt({ message: 'clienteId es obligatorio para ventas WEB o MARKETPLACE' })
  clienteId?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  descuento?: number;

  @ApiProperty({ type: [ItemVentaDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'La venta debe tener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items!: ItemVentaDto[];
}
