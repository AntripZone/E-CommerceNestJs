import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MetodoPago } from '../../generated/prisma/enums.js';

const METODOS_MOSTRADOR = [
  MetodoPago.EFECTIVO,
  MetodoPago.TARJETA,
  MetodoPago.TRANSFERENCIA,
] as const;

export class PagoVentaDto {
  @ApiProperty({ enum: METODOS_MOSTRADOR, example: MetodoPago.EFECTIVO })
  @IsIn(METODOS_MOSTRADOR, {
    message: 'El método de pago debe ser EFECTIVO, TARJETA o TRANSFERENCIA',
  })
  metodo!: MetodoPago;

  @ApiProperty({
    example: 200,
    description: 'En efectivo puede ser mayor al total (se calcula el cambio)',
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número con máximo 2 decimales' },
  )
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  monto!: number;

  @ApiPropertyOptional({
    example: 'OP-778812',
    description: 'Voucher de tarjeta o número de operación',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  referencia?: string;
}

export class CobrarVentaDto {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El descuento debe ser un número con máximo 2 decimales' },
  )
  @Min(0, { message: 'El descuento no puede ser negativo' })
  descuento?: number;

  @ApiProperty({ type: [PagoVentaDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe registrar al menos un pago' })
  @ValidateNested({ each: true })
  @Type(() => PagoVentaDto)
  pagos!: PagoVentaDto[];
}
